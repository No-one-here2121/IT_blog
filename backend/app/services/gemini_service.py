import base64
import binascii
import json
import logging
import re
import time
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


def mask_key(key: str) -> str:
    """Mask an API key for safe display, e.g. AIzaSy...4X9Q"""
    if not key or len(key) < 10:
        return "****"
    return f"{key[:6]}...{key[-4:]}"


class GeminiKeyInfo:
    def __init__(self, key: str):
        self.key: str = key.strip()
        self.masked_key: str = mask_key(self.key)
        self.status: str = "active"  # "active" | "rate_limited" | "invalid"
        self.request_count: int = 0
        self.success_count: int = 0
        self.failure_count: int = 0
        self.rate_limited_until: float = 0
        self.last_used_at: Optional[str] = None
        self.last_error: Optional[str] = None

    def is_available(self) -> bool:
        if self.status == "invalid":
            return False
        if self.status == "rate_limited":
            if time.time() >= self.rate_limited_until:
                self.status = "active"
                return True
            return False
        return True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "masked_key": self.masked_key,
            "status": self.status,
            "request_count": self.request_count,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "last_used_at": self.last_used_at,
            "last_error": self.last_error,
            "is_available": self.is_available()
        }


class GeminiService:
    api_url = "https://generativelanguage.googleapis.com/v1beta/interactions"
    api_revision = "2026-05-20"
    request_timeout = 60.0
    speech_model = "gemini-3.8-flash-tts"
    speech_request_timeout = 120.0

    def __init__(self):
        self.model: str = settings.GEMINI_MODEL or "gemini-3.1-flash-lite"
        self.keys_pool: List[GeminiKeyInfo] = []
        self.current_index: int = 0

        # Load initial keys from settings without mutating the original settings list.
        initial_keys = settings.GEMINI_API_KEYS or []
        if isinstance(initial_keys, str):
            initial_keys = [initial_keys] if initial_keys else []
        else:
            initial_keys = list(initial_keys)
        if settings.GEMINI_API_KEY:
            initial_keys.append(settings.GEMINI_API_KEY)
        self.set_keys(initial_keys)

    def set_keys(self, keys: List[str]):
        """Replace or set the active pool of Gemini API keys."""
        new_pool: List[GeminiKeyInfo] = []
        seen = set()
        for k in keys:
            clean_k = k.strip()
            if clean_k and clean_k not in seen:
                seen.add(clean_k)
                new_pool.append(GeminiKeyInfo(clean_k))
        self.keys_pool = new_pool
        self.current_index = 0
        logger.info(f"GeminiService: Configured {len(self.keys_pool)} API keys.")

    def add_key(self, key: str) -> bool:
        """Add a single key to the pool if not already present."""
        clean_k = key.strip()
        if not clean_k:
            return False
        for k_info in self.keys_pool:
            if k_info.key == clean_k:
                return False
        self.keys_pool.append(GeminiKeyInfo(clean_k))
        return True

    def get_keys_status(self) -> List[Dict[str, Any]]:
        """Return status information for all registered keys."""
        return [k.to_dict() for k in self.keys_pool]

    def get_next_key_info(self) -> Optional[GeminiKeyInfo]:
        """Round-robin selection of next available key."""
        if not self.keys_pool:
            return None

        total_keys = len(self.keys_pool)
        for _ in range(total_keys):
            idx = self.current_index % total_keys
            self.current_index = (self.current_index + 1) % total_keys
            candidate = self.keys_pool[idx]
            if candidate.is_available():
                return candidate

        return None

    @staticmethod
    def _extract_text_from_response(data: Any) -> Optional[str]:
        """Support both legacy steps-based responses and newer candidate-based Gemini payloads."""
        if not isinstance(data, dict):
            return None

        for container_name in ("steps", "candidates"):
            container = data.get(container_name)
            if not isinstance(container, list):
                continue

            for item in reversed(container):
                if not isinstance(item, dict):
                    continue

                if container_name == "steps":
                    if item.get("type") != "model_output":
                        continue
                    content = item.get("content", [])
                else:
                    content = item.get("content", {})
                    if isinstance(content, dict):
                        content = content.get("parts", [])

                if isinstance(content, list):
                    text_parts = []
                    for block in content:
                        if isinstance(block, dict):
                            text = block.get("text")
                            if text:
                                text_parts.append(text)
                            elif block.get("type") == "text":
                                text_parts.append(block.get("text", ""))
                    if text_parts:
                        return "".join(text_parts)

                if isinstance(content, dict):
                    parts = content.get("parts", [])
                    if isinstance(parts, list):
                        text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
                        combined = "".join(text_parts)
                        if combined:
                            return combined

        return None

    @staticmethod
    def _extract_audio_base64(data: Any) -> Optional[str]:
        """Extract base64 audio from Gemini Interactions API response layouts.

        The API returns an Interaction whose audio is stored in the ``steps``
        array as content blocks of type ``audio`` (e.g.
        ``{"type": "audio", "data": "BASE64_ENCODED", "mime_type": "..."}``),
        while convenience properties like ``interaction.output_audio`` are
        computed on top of those steps by the client SDKs.  This method
        therefore scans both the legacy top-level fields AND the steps /
        candidates containers (including nested parts), instead of only
        looking for SDK-level fields in the raw HTTP response.
        """
        if not isinstance(data, dict):
            return None

        # 1. Legacy / SDK-level convenience fields
        for key in ("output_audio", "outputAudio", "audio"):
            payload = GeminiService._looks_like_audio(data.get(key))
            if payload:
                return str(payload)

        # 2. Walk everything, in priority order:
        #    - steps / candidates containers (documented layout)
        #    - blocks typed "audio" (content blocks with data/mime_type)
        #    - any dict whose keys look like an audio payload
        #    as a last resort, a deep recursive scan
        for container_key in ("steps", "candidates"):
            if not isinstance(data.get(container_key), list):
                continue
            for item in data[container_key]:
                if not isinstance(item, dict):
                    continue
                payload = GeminiService._try_extract_item_audio(item)
                if payload:
                    return str(payload)

        # 3. Deep recursive fallback
        return GeminiService._deep_find_audio(data)

    @staticmethod
    def _looks_like_audio(value: Any) -> Optional[str]:
        """Return a payload string if the value looks like base64 audio."""
        if isinstance(value, str):
            return value if value.strip() else None
        if not isinstance(value, dict):
            return None
        for nested_key in ("data", "base64", "audio_data"):
            payload = value.get(nested_key)
            if isinstance(payload, str) and payload.strip():
                return payload
        if value.get("mime_type") and value.get("data"):
            return str(value.get("data"))
        nested = value.get("content")
        if isinstance(nested, dict):
            for deep_key in ("data", "base64"):
                payload = nested.get(deep_key)
                if isinstance(payload, str) and payload.strip():
                    return payload
        return None

    @staticmethod
    def _try_extract_item_audio(item: Dict[str, Any]) -> Optional[str]:
        """Audio inside a step/candidate object (e.g. steps[].content[])."""
        if not isinstance(item, dict):
            return None

        for key in ("output_audio", "outputAudio", "audio", "inline_data", "inlineData"):
            payload = GeminiService._looks_like_audio(item.get(key))
            if payload:
                return str(payload)

        # Content blocks: [{"type": "audio", "data": "...", "mime_type": "audio/wav"}]
        content = item.get("content")
        if isinstance(content, list):
            for block in content:
                if not isinstance(block, dict):
                    continue
                payload = GeminiService._looks_like_audio(block)
                if payload:
                    return str(payload)
                mime = str(block.get("mime_type") or block.get("mimeType") or "")
                block_type = str(block.get("type") or "")
                if block_type in ("audio", "output_audio") or mime.startswith("audio/"):
                    for nested_key in ("data", "base64", "audio_data"):
                        payload = block.get(nested_key)
                        if isinstance(payload, str) and payload.strip():
                            return str(payload)
        elif isinstance(content, dict):
            payload = GeminiService._looks_like_audio(content)
            if payload:
                return str(payload)

        # Candidates-style parts: candidates[].content[].parts[]
        parts = item.get("parts")
        if isinstance(parts, list):
            for part in parts:
                if not isinstance(part, dict):
                    continue
                payload = GeminiService._looks_like_audio(part)
                if payload:
                    return str(payload)
                mime = str(part.get("mime_type") or part.get("mimeType") or "")
                if mime.startswith("audio/"):
                    for nested_key in ("data", "base64", "audio_data"):
                        payload = part.get(nested_key)
                        if isinstance(payload, str) and payload.strip():
                            return str(payload)
        return None

    @staticmethod
    def _deep_find_audio(node: Any, depth: int = 0) -> Optional[str]:
        """Last-resort recursive scan for audio payloads in the whole response."""
        if depth > 16:
            return None
        if isinstance(node, dict):
            # Skip non-audio-looking containers that frequently appear in
            # Gemini responses (though a dict with data+audio mime is ok).
            mime = str(node.get("mime_type") or node.get("mimeType") or "")
            if mime.startswith("audio/") and "data" in node:
                return str(node.get("data"))
            for value in node.values():
                payload = GeminiService._deep_find_audio(value, depth + 1)
                if payload:
                    return str(payload)
        elif isinstance(node, list):
            for value in node:
                payload = GeminiService._deep_find_audio(value, depth + 1)
                if payload:
                    return str(payload)
        return None

    def call_gemini(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        json_mode: bool = False,
        temperature: float = 0.2
    ) -> Optional[str]:
        """
        Execute API call to Google Gemini with automatic multi-key rotation and failover.
        """
        if not self.keys_pool:
            return None

        payload: Dict[str, Any] = {
            "model": self.model,
            "input": prompt,
            "generation_config": {"temperature": temperature},
        }

        if system_instruction:
            payload["system_instruction"] = system_instruction

        if json_mode:
            payload["generation_config"]["response_mime_type"] = "application/json"

        # Try available keys in pool
        max_attempts = max(1, len(self.keys_pool))
        for _ in range(max_attempts):
            key_info = self.get_next_key_info()
            if not key_info:
                break

            key_info.request_count += 1
            key_info.last_used_at = datetime.now(timezone.utc).isoformat()
            headers = {
                "x-goog-api-key": key_info.key,
                "Content-Type": "application/json",
                "Api-Revision": self.api_revision,
            }

            try:
                with httpx.Client(timeout=self.request_timeout) as client:
                    resp = client.post(self.api_url, headers=headers, json=payload)

                if resp.status_code == 200:
                    data = resp.json()
                    text = self._extract_text_from_response(data)
                    if text:
                        key_info.success_count += 1
                        key_info.status = "active"
                        key_info.last_error = None
                        return text
                    key_info.failure_count += 1
                    key_info.last_error = "Gemini response did not contain text output"
                    logger.warning(
                        "Gemini returned no text output for key %s",
                        key_info.masked_key,
                    )
                    return None

                # Handle Rate Limit (429)
                if resp.status_code == 429:
                    key_info.failure_count += 1
                    key_info.status = "rate_limited"
                    key_info.rate_limited_until = time.time() + 60  # cooldown for 60s
                    key_info.last_error = "429 Quota Exceeded / Rate Limited"
                    logger.warning(f"Gemini Key {key_info.masked_key} rate limited. Rotating to next key...")
                    continue

                # Handle Invalid Key (400 or 403)
                if resp.status_code in [400, 403]:
                    err_msg = resp.text
                    if "API_KEY_INVALID" in err_msg or "PERMISSION_DENIED" in err_msg:
                        key_info.failure_count += 1
                        key_info.status = "invalid"
                        key_info.last_error = f"{resp.status_code} Invalid API Key"
                        logger.error(f"Gemini Key {key_info.masked_key} is invalid. Rotating...")
                        continue

                # Other HTTP errors
                key_info.failure_count += 1
                key_info.last_error = f"HTTP {resp.status_code}: {resp.text[:100]}"
                continue

            except Exception as e:
                key_info.failure_count += 1
                key_info.last_error = f"Network/Connection error: {str(e)[:100]}"
                logger.warning(f"Error calling Gemini with key {key_info.masked_key}: {e}")
                continue

        return None

    def generate_speech(self, text: str) -> Optional[bytes]:
        """Generate natural Vietnamese narration as WAV audio using Gemini TTS."""
        if not self.keys_pool:
            return None

        payload = {
            "model": self.speech_model,
            "input": [
                {
                    "type": "user_input",
                    "content": [
                        {
                            "type": "text",
                            "text": text,
                            "annotations": [
                                {
                                    "type": "speech_metadata",
                                    "style": (
                                        "Natural Vietnamese narration, warm and engaging, "
                                        "clear pronunciation, steady moderate pace."
                                    ),
                                }
                            ],
                        }
                    ],
                }
            ],
            "response_format": {"type": "audio"},
            "generation_config": {
                "speech_config": [{"voice": "Kore"}],
            },
        }

        max_attempts = max(1, len(self.keys_pool))
        for _ in range(max_attempts):
            key_info = self.get_next_key_info()
            if not key_info:
                break

            key_info.request_count += 1
            key_info.last_used_at = datetime.now(timezone.utc).isoformat()
            headers = {
                "x-goog-api-key": key_info.key,
                "Content-Type": "application/json",
                "Api-Revision": self.api_revision,
            }

            try:
                with httpx.Client(timeout=self.speech_request_timeout) as client:
                    resp = client.post(self.api_url, headers=headers, json=payload)

                if resp.status_code == 200:
                    response_data = resp.json()
                    audio_data = self._extract_audio_base64(response_data)
                    if not audio_data:
                        key_info.failure_count += 1
                        key_info.last_error = "Gemini response did not contain audio output"
                        logger.warning(
                            "Gemini returned no audio output for key %s. Response keys: %s",
                            key_info.masked_key,
                            sorted(response_data.keys()),
                        )
                        return None

                    try:
                        normalized = str(audio_data).strip()
                        if normalized.lower().startswith("data:"):
                            normalized = normalized.split(",", 1)[1]
                        normalized = "".join(normalized.split())
                        if not normalized:
                            raise ValueError("audio payload was empty")
                        audio_bytes = base64.b64decode(normalized, validate=False)
                    except (binascii.Error, TypeError, ValueError) as exc:
                        key_info.failure_count += 1
                        key_info.last_error = f"Invalid audio data: {str(exc)[:100]}"
                        logger.warning(
                            "Gemini returned invalid audio data for key %s",
                            key_info.masked_key,
                        )
                        return None

                    key_info.success_count += 1
                    key_info.status = "active"
                    key_info.last_error = None
                    return audio_bytes

                if resp.status_code == 429:
                    key_info.failure_count += 1
                    key_info.status = "rate_limited"
                    key_info.rate_limited_until = time.time() + 60
                    key_info.last_error = "429 Quota Exceeded / Rate Limited"
                    logger.warning(
                        "Gemini TTS key %s rate limited. Rotating to next key...",
                        key_info.masked_key,
                    )
                    continue

                if resp.status_code in [400, 403]:
                    err_msg = resp.text
                    if "API_KEY_INVALID" in err_msg or "PERMISSION_DENIED" in err_msg:
                        key_info.failure_count += 1
                        key_info.status = "invalid"
                        key_info.last_error = f"{resp.status_code} Invalid API Key"
                        logger.error(
                            "Gemini TTS key %s is invalid. Rotating...",
                            key_info.masked_key,
                        )
                        continue

                key_info.failure_count += 1
                key_info.last_error = f"HTTP {resp.status_code}: {resp.text[:100]}"
                logger.warning(
                    "Gemini TTS failed for key %s with HTTP %s",
                    key_info.masked_key,
                    resp.status_code,
                )
            except (httpx.HTTPError, TypeError, ValueError) as exc:
                key_info.failure_count += 1
                key_info.last_error = f"Gemini TTS request failed: {str(exc)[:100]}"
                logger.warning(
                    "Gemini TTS request failed for key %s: %s",
                    key_info.masked_key,
                    exc,
                )

        return None

    def generate_vietnamese_tts(self, text: str) -> Optional[bytes]:
        """Generate high-quality native Vietnamese audio using Google TTS service as reliable fallback."""
        import urllib.parse
        clean_text = re.sub(r"\s+", " ", text).strip()
        if not clean_text:
            return None

        # Split text into chunks <= 160 characters (Google TTS character limit is ~200)
        chunks = []
        sentences = re.split(r"(?<=[.!?;\n])\s+", clean_text)
        for sent in sentences:
            sent = sent.strip()
            if not sent:
                continue
            if len(sent) <= 160:
                chunks.append(sent)
            else:
                words = sent.split(" ")
                current = []
                current_len = 0
                for w in words:
                    if current_len + len(w) + 1 > 160:
                        chunks.append(" ".join(current))
                        current = [w]
                        current_len = len(w)
                    else:
                        current.append(w)
                        current_len += len(w) + 1
                if current:
                    chunks.append(" ".join(current))

        if not chunks:
            return None

        chunks = chunks[:120]  # Support up to ~20 minutes of speech
        audio_data = bytearray()
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://translate.google.com/",
        }

        with httpx.Client(timeout=15.0, headers=headers) as client:
            for chunk in chunks:
                try:
                    url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(chunk)}&tl=vi&client=tw-ob"
                    resp = client.get(url)
                    if resp.status_code == 200 and resp.content:
                        audio_data.extend(resp.content)
                except Exception as exc:
                    logger.warning("TTS chunk fetch error: %s", exc)
                    continue

        return bytes(audio_data) if len(audio_data) > 0 else None

    def test_key(self, api_key: str) -> Dict[str, Any]:
        """Test a specific API key against Google Gemini API."""
        clean_k = api_key.strip()
        if not clean_k:
            return {"valid": False, "message": "API key kh?ng du?c d? tr?ng"}

        headers = {
            "x-goog-api-key": clean_k,
            "Content-Type": "application/json",
            "Api-Revision": self.api_revision,
        }
        payload = {
            "model": self.model,
            "input": "Hello, respond with 'OK' if you can read this.",
        }
        try:
            with httpx.Client(timeout=self.request_timeout) as client:
                resp = client.post(self.api_url, headers=headers, json=payload)
            if resp.status_code == 200:
                return {"valid": True, "message": f"K?t n?i Gemini th?nh c?ng! (M? h?nh: {self.model})"}
            elif resp.status_code == 429:
                return {"valid": True, "rate_limited": True, "message": "Key h?p l? nhung dang b? gi?i h?n t?c d? (Rate Limit 429)."}
            else:
                return {"valid": False, "message": f"L?i x?c th?c ({resp.status_code}): {resp.text[:150]}"}
        except Exception as e:
            return {"valid": False, "message": f"L?i k?t n?i t?i m?y ch? Google Gemini: {str(e)}"}

    # =========================================================================
    # Specialized AI Modules
    # =========================================================================

    def moderate_content(self, title: str, content: str) -> Dict[str, Any]:
        """
        Automated content moderation using Gemini AI with fallback.
        """
        system_prompt = (
            "B?n l? tr? l? AI chuy?n ki?m duy?t n?i dung cho n?n t?ng blog k? thu?t c?ng ngh? th?ng tin (IT Blog). "
            "Nhi?m v? c?a b?n l? d?nh gi? t?nh an to?n, t?nh chuy?n m?n v? ch?t lu?ng c?a b?i vi?t. "
            "H?y tr? v? k?t qu? du?i d?nh d?ng JSON duy nh?t v?i c?c tru?ng:\n"
            "{\n"
            "  \"is_safe\": boolean (true n?u kh?ng ch?a n?i dung c?m),\n"
            "  \"spam_score\": float (0.0 d?n 1.0, cao nghia l? spam qu?ng c?o/c? b?c),\n"
            "  \"toxicity_score\": float (0.0 d?n 1.0, cao nghia l? d?c h?i/ch?i b?i/l?a d?o),\n"
            "  \"is_tech_related\": boolean (true n?u li?n quan d?n l?p tr?nh, IT, ph?n m?m, c?ng ngh?),\n"
            "  \"quality_score\": float (0.0 d?n 1.0, d?nh gi? d? m?ch l?c v? gi? tr? k? thu?t),\n"
            "  \"verdict\": string (\"approved\" | \"flagged\" | \"rejected\"),\n"
            "  \"reasons\": [danh s?ch c?c chu?i ti?ng Vi?t gi?i th?ch l? do n?u c? vi ph?m ho?c c?n luu ?]\n"
            "}"
        )

        user_prompt = f"Ti?u d?: {title}\n\nN?i dung:\n{content[:4000]}"
        gemini_response = self.call_gemini(user_prompt, system_instruction=system_prompt, json_mode=True)

        if gemini_response:
            try:
                parsed = json.loads(gemini_response)
                return {
                    "is_safe": bool(parsed.get("is_safe", True)),
                    "spam_score": float(parsed.get("spam_score", 0.05)),
                    "toxicity_score": float(parsed.get("toxicity_score", 0.05)),
                    "is_tech_related": bool(parsed.get("is_tech_related", True)),
                    "quality_score": float(parsed.get("quality_score", 0.8)),
                    "verdict": parsed.get("verdict", "approved"),
                    "reasons": parsed.get("reasons", [])
                }
            except Exception as e:
                logger.error(f"Failed to parse Gemini moderation response: {e}")

        # Fallback to local heuristic moderation
        return self._heuristic_moderation(title, content)

    def optimize_post(self, title: str, content: str) -> Dict[str, Any]:
        """
        AI Post Optimizer: Generate engaging titles, SEO metadata, and tag suggestions.
        """
        system_prompt = (
            "B?n l? chuy?n gia Content Marketing & SEO k? thu?t d?nh cho l?p tr?nh vi?n. "
            "H?y ph?n t?ch b?i vi?t v? tr? v? JSON chu?n g?m:\n"
            "{\n"
            "  \"suggested_titles\": [3 ti?u d? h?p d?n, thu h?t ngu?i d?c CNTT],\n"
            "  \"seo_title\": \"ti?u d? chu?n SEO du?i 60 k? t?\",\n"
            "  \"meta_description\": \"m? t? ng?n chu?n SEO du?i 155 k? t?\",\n"
            "  \"suggested_tags\": [3 d?n 5 th? tag k? thu?t ti?ng Anh ho?c ti?ng Vi?t chu?n],\n"
            "  \"suggested_category\": \"Frontend\" | \"Backend\" | \"DevOps\" | \"Database\" | \"AI\" | \"Mobile\" | \"B?o m?t\"\n"
            "}"
        )

        user_prompt = f"Ti?u d? ban d?u: {title}\n\nN?i dung b?i vi?t:\n{content[:3000]}"
        gemini_response = self.call_gemini(user_prompt, system_instruction=system_prompt, json_mode=True)

        if gemini_response:
            try:
                parsed = json.loads(gemini_response)
                return {
                    "suggested_titles": parsed.get("suggested_titles", []),
                    "seo_title": parsed.get("seo_title", f"{title[:50]} | IT Blog"),
                    "meta_description": parsed.get("meta_description", content[:150]),
                    "suggested_tags": parsed.get("suggested_tags", ["IT", "Coding"]),
                    "suggested_category": parsed.get("suggested_category", "Backend")
                }
            except Exception as e:
                logger.error(f"Failed to parse Gemini optimization response: {e}")

        # Fallback
        return self._heuristic_optimization(title, content)

    def explain_code(self, snippet: str, language: str, action: str) -> Dict[str, Any]:
        """
        Context-aware code assistant: Explain, Debug, Optimize, or Refactor code snippet.
        """
        system_prompt = (
            "B?n l? m?t Senior Tech Lead & Chuy?n gia K? thu?t Ph?n m?m. "
            "H?y tr? v? JSON g?m:\n"
            "{\n"
            "  \"explanation\": \"ph?n t?ch chi ti?t b?ng ti?ng Vi?t\",\n"
            "  \"improved_code\": \"do?n m? d? du?c debug/t?i uu/t?i c?u tr?c\",\n"
            "  \"key_takeaways\": [3 di?m c?t l?i developer c?n luu ?]\n"
            "}"
        )
        user_prompt = f"H?nh d?ng y?u c?u: {action}\nNg?n ng?: {language}\n?o?n m?:\n```{language}\n{snippet}\n```"
        gemini_response = self.call_gemini(user_prompt, system_instruction=system_prompt, json_mode=True)

        if gemini_response:
            try:
                parsed = json.loads(gemini_response)
                return {
                    "action": action,
                    "language": language,
                    "explanation": parsed.get("explanation", ""),
                    "improved_code": parsed.get("improved_code", snippet),
                    "key_takeaways": parsed.get("key_takeaways", [])
                }
            except Exception:
                pass

        return self._heuristic_explain_code(snippet, language, action)

    def ask_article(self, article_title: str, article_content: str, question: str, context: Optional[str] = None) -> str:
        """Answer reader questions based on article content."""
        system_prompt = (
            "B?n l? tr? l? gi?i d?p k? thu?t c?a n?n t?ng IT Blog. "
            "H?y tr? l?i c?u h?i c?a ngu?i d?ng d?a tr?n n?i dung b?i vi?t k? thu?t du?c cung c?p. "
            "Tr? l?i ng?n g?n, chu?n x?c, th?n thi?n v? cung c?p v? d? n?u c?n."
        )
        user_prompt = (
            f"B?i vi?t: {article_title}\n"
            f"Ng? c?nh tr?ch do?n: {context or 'To?n b?i vi?t'}\n"
            f"N?i dung t?m lu?c: {article_content[:3000]}\n\n"
            f"C?u h?i c?a d?c gi?: {question}"
        )
        ans = self.call_gemini(user_prompt, system_instruction=system_prompt)
        if ans:
            return ans.strip()

        return (
            f"D?a tr?n b?i vi?t '{article_title}': V?n d? b?n h?i '{question}' "
            "d? du?c t?c gi? gi?i th?ch v? ph?n t?ch chi ti?t trong b?i vi?t. Phuong ph?p t?t nh?t l? tu?n th? c?u tr?c chu?n, "
            "ki?m th? t? d?ng v? tham kh?o t?i li?u ch?nh th?c c?a c?ng ngh? dang s? d?ng."
        )

    def summarize_article(self, article_title: str, article_content: str) -> Dict[str, Any]:
        """Summarize technical post into core key takeaways."""
        system_prompt = (
            "H?y t?m t?t b?i vi?t k? thu?t c?ng ngh? th?ng tin du?i d?nh d?ng JSON:\n"
            "{\n"
            "  \"summary\": \"t?m t?t 2-3 c?u ng?n g?n to?n b? b?i vi?t\",\n"
            "  \"key_points\": [3 lu?n di?m k? thu?t quan tr?ng nh?t]\n"
            "}"
        )
        user_prompt = f"Ti?u d?: {article_title}\n\nN?i dung:\n{article_content[:3500]}"
        gemini_response = self.call_gemini(user_prompt, system_instruction=system_prompt, json_mode=True)

        if gemini_response:
            try:
                parsed = json.loads(gemini_response)
                return {
                    "summary": parsed.get("summary", ""),
                    "key_points": parsed.get("key_points", [])
                }
            except Exception:
                pass

        return {
            "summary": f"B?i vi?t '{article_title}' cung c?p ph?n t?ch chi ti?t v? ki?n tr?c v? k? thu?t th?c chi?n trong d? ?n.",
            "key_points": [
                f"T?ng quan c?ng ngh?: {article_title}",
                "Thi?t l?p m?i tru?ng v? c?u tr?c d? ?n chu?n Clean Architecture",
                "T?i uu hi?u nang, b?o m?t v? kh? nang m? r?ng h? th?ng"
            ]
        }

    def generate_bot_comment(self, post_title: str, post_content: str, tech_stack: Optional[str] = None) -> str:
        """Generate an insightful discussion starter from AI TechBot."""
        system_prompt = (
            "B?n l? 'AI TechBot' - Tr? l? k? thu?t t? d?ng tr?n di?n d?n IT Blog. "
            "Nhi?m v? c?a b?n l? d?c b?i vi?t v? vi?t 1 b?nh lu?n mang t?nh x?y d?ng, "
            "n?u b?t 1 m?o th?c h?nh t?t nh?t (best practice), chia s? kinh nghi?m tr?nh l?i "
            "v? d?t 1 c?u h?i m? d? k?ch th?ch c?ng d?ng th?o lu?n. Gi? b?nh lu?n trong kho?ng 3-5 c?u."
        )
        user_prompt = f"B?i vi?t: {post_title}\nC?ng ngh?: {tech_stack or 'C?ng ngh? ph?n m?m'}\nN?i dung: {post_content[:2000]}"
        ans = self.call_gemini(user_prompt, system_instruction=system_prompt)
        if ans:
            return f"?? **[AI TechBot Ph?n h?i]**: {ans.strip()}"

        # Heuristic fallback
        return (
            f"?? **[AI TechBot Ph?n h?i]**: Ch?o b?n! V? ch? d? **{post_title}**, "
            f"m?o th?c h?nh t?t nh?t l? lu?n tu?n th? nguy?n t?c Single Responsibility, "
            f"ki?m th? t? d?ng c?c edge cases v? tham kh?o t?i li?u ch?nh th?c c?a {tech_stack or 'thu vi?n'}. "
            f"??c gi? c? th?c m?c g? v? c?u tr?c n?y h?y d?t c?u h?i b?n du?i nh?!"
        )

    # =========================================================================
    # Heuristic Fallback Helpers
    # =========================================================================

    def _heuristic_moderation(self, title: str, content: str) -> Dict[str, Any]:
        text = (title + " " + content).lower()
        spam_keywords = ["casino", "c? cu?c", "bet88", "l? d?", "ti?n ?o l?a d?o", "click here to win", "vay nhanh online"]
        is_spam = any(k in text for k in spam_keywords)
        spam_score = 0.95 if is_spam else (0.1 if len(content) < 50 else 0.02)

        toxic_keywords = ["d? ngu", "l?a d?o", "ch?t ti?t", "scam", "ch?i b?i", "racist"]
        is_toxic = any(k in text for k in toxic_keywords)
        toxicity_score = 0.9 if is_toxic else 0.01

        tech_keywords = [
            "code", "l?p tr?nh", "python", "javascript", "react", "fastapi", "docker", 
            "database", "postgresql", "sql", "api", "backend", "frontend", "devops",
            "git", "aws", "cloud", "bug", "algorithm", "architecture", "microservice",
            "linux", "system", "web", "html", "css", "node", "ci/cd", "server"
        ]
        tech_matches = sum(1 for k in tech_keywords if k in text)
        is_tech_related = tech_matches >= 1

        reasons = []
        if is_spam:
            reasons.append("Ph?t hi?n t? kh?a nghi v?n spam thuong m?i/c? cu?c.")
        if is_toxic:
            reasons.append("Ph?t hi?n t? ng? kh?ng chu?n m?c ho?c c? t?nh ch?t th?a m?.")
        if not is_tech_related:
            reasons.append("N?i dung chua ph?n ?nh r? ch? d? C?ng ngh? Th?ng tin / L?p tr?nh.")

        length_factor = min(len(content) / 500.0, 1.0)
        tech_factor = min(tech_matches / 5.0, 1.0)
        quality_score = round(0.5 * length_factor + 0.5 * tech_factor, 2)

        if is_spam or toxicity_score > 0.5:
            verdict = "rejected"
            is_safe = False
        elif not is_tech_related or quality_score < 0.3:
            verdict = "flagged"
            is_safe = True
        else:
            verdict = "approved"
            is_safe = True

        return {
            "is_safe": is_safe,
            "spam_score": round(spam_score, 2),
            "toxicity_score": round(toxicity_score, 2),
            "is_tech_related": is_tech_related,
            "quality_score": quality_score,
            "verdict": verdict,
            "reasons": reasons
        }

    def _heuristic_optimization(self, title: str, content: str) -> Dict[str, Any]:
        text = (title + " " + content).lower()
        suggested_titles = [
            f"L?m ch? {title}: Hu?ng d?n t? Co b?n d?n Th?c chi?n 2026",
            f"T?i sao b?n n?n ?p d?ng {title} trong Ki?n tr?c Ph?n m?m Hi?n d?i?",
            f"Top 5 B? quy?t T?i uu {title} m? Developer c?n bi?t"
        ]

        if any(k in text for k in ["docker", "k8s", "kubernetes", "ci/cd", "linux", "aws"]):
            suggested_cat = "DevOps"
        elif any(k in text for k in ["react", "vue", "tailwind", "css", "html", "javascript", "frontend"]):
            suggested_cat = "Frontend"
        elif any(k in text for k in ["postgresql", "mysql", "mongodb", "redis", "database", "sql"]):
            suggested_cat = "Database"
        elif any(k in text for k in ["ai", "machine learning", "deep learning", "llm", "gemini"]):
            suggested_cat = "AI"
        else:
            suggested_cat = "Backend"

        tags = []
        candidates = ["Python", "FastAPI", "React", "Docker", "PostgreSQL", "JavaScript", "DevOps", "Clean Code", "API"]
        for c in candidates:
            if c.lower() in text:
                tags.append(c)
        if not tags:
            tags = ["C?ng ngh?", "L?p tr?nh", "Kinh nghi?m"]

        seo_title = f"{title[:50]} | IT Blog N?n t?ng Tri th?c"
        meta_desc = f"Kh?m ph? ph?n t?ch chi ti?t v? {title}. Hu?ng d?n th?c chi?n, t?i uu h?a v? kinh nghi?m l?p tr?nh t? c?ng d?ng IT Blog."[:155]

        return {
            "suggested_titles": suggested_titles,
            "seo_title": seo_title,
            "meta_description": meta_desc,
            "suggested_tags": tags[:5],
            "suggested_category": suggested_cat
        }

    def _heuristic_explain_code(self, snippet: str, language: str, action: str) -> Dict[str, Any]:
        lang = language.upper()
        if action == "debug":
            explanation = (
                f"Ph?n t?ch l?i ti?m ?n cho do?n m? {lang}:\n"
                "1. Ki?m tra vi?c x? l? ngo?i l? (Exception / Error handling) v? gi? tr? None/Null.\n"
                "2. ??m b?o vi?c gi?i ph?ng t?i nguy?n ho?c connection pool du?c d?ng d?ng c?ch.\n"
                "3. Ki?m tra ranh gi?i d? li?u (boundary check) v? ki?u d? li?u d?u v?o."
            )
            improved_code = f"# [Optimized & Safe {lang} Code]\ntry:\n    # X? l? an to?n v?i validation\n    {snippet}\nexcept Exception as err:\n    logger.error(f'L?i th?c thi: {{err}}')\n    raise"
            takeaways = [
                "B? sung validation ch?t ch? cho tham s?",
                "S? d?ng try-catch ho?c structured logging",
                "Tr?nh block lu?ng ch?nh (I/O blocking)"
            ]
        elif action == "optimize":
            explanation = (
                f"?? xu?t t?i uu h?a hi?u nang ({lang}):\n"
                "1. Gi?m d? ph?c t?p th?i gian t? O(N^2) xu?ng O(N) th?ng qua hash map / dictionary lookup.\n"
                "2. Tr?nh truy v?n N+1 n?u tuong t?c v?i database (s? d?ng eager loading / join).\n"
                "3. S? d?ng b? nh? d?m (caching with Redis/in-memory) cho c?c t?nh to?n tr?ng l?p."
            )
            improved_code = f"# Optimized Version\n{snippet}\n# G?i ?: D?ng vectorization, caching ho?c async/await"
            takeaways = [
                "?? ph?c t?p O(1) truy xu?t",
                "T?i uu c?p ph?t b? nh? RAM",
                "T?n d?ng Async I/O cho network operations"
            ]
        elif action == "refactor":
            explanation = (
                f"G?i ? t?i c?u tr?c m? ngu?n ({lang}) theo Clean Code & SOLID:\n"
                "1. T?ch h?m th?nh c?c single-responsibility unit nh? g?n (< 20 d?ng).\n"
                "2. ??t t?n bi?n v? h?m tu?ng minh theo ng? c?nh domain nghi?p v?.\n"
                "3. S? d?ng Type Hinting (typing) v? Dependency Injection."
            )
            improved_code = f"# Refactored with Clean Architecture\n{snippet}"
            takeaways = [
                "?p d?ng Single Responsibility Principle",
                "Ki?u d? li?u r? r?ng (Type hints)",
                "D? d?ng vi?t Unit Test (High testability)"
            ]
        else:
            explanation = (
                f"Gi?i th?ch co ch? ho?t d?ng c?a do?n m? {lang}:\n"
                f"- ?o?n m? g?m {len(snippet.splitlines())} d?ng x? l? logic.\n"
                "- Kh?i t?o c?u tr?c d? li?u, duy?t v? chuy?n d?i d? li?u qua c?c pipeline x? l?.\n"
                "- Tr? v? k?t qu? ph? h?p cho lu?ng nghi?p v? ti?p theo."
            )
            improved_code = snippet
            takeaways = [
                "C?u tr?c thu?t to?n chu?n",
                "Th?ch h?p ?ng d?ng trong ki?n tr?c Microservices / REST API",
                "Th?i gian ph?n h?i d? ki?n < 5ms"
            ]

        return {
            "action": action,
            "language": language,
            "explanation": explanation,
            "improved_code": improved_code,
            "key_takeaways": takeaways
        }


# Global singleton service instance
gemini_service = GeminiService()
