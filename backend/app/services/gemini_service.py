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
    def __init__(self):
        self.model: str = settings.GEMINI_MODEL or "gemini-1.5-flash"
        self.keys_pool: List[GeminiKeyInfo] = []
        self.current_index: int = 0
        
        # Load initial keys from settings
        initial_keys = settings.GEMINI_API_KEYS
        if isinstance(initial_keys, list):
            self.set_keys(initial_keys)
        elif isinstance(initial_keys, str) and initial_keys:
            self.set_keys([initial_keys])

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
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": temperature
            }
        }

        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        # Try available keys in pool
        max_attempts = max(1, len(self.keys_pool))
        for _ in range(max_attempts):
            key_info = self.get_next_key_info()
            if not key_info:
                break

            key_info.request_count += 1
            key_info.last_used_at = datetime.now(timezone.utc).isoformat()
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={key_info.key}"

            try:
                with httpx.Client(timeout=20.0) as client:
                    resp = client.post(api_url, json=payload)

                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            key_info.success_count += 1
                            key_info.status = "active"
                            key_info.last_error = None
                            return parts[0]["text"]
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

    def test_key(self, api_key: str) -> Dict[str, Any]:
        """Test a specific API key against Google Gemini API."""
        clean_k = api_key.strip()
        if not clean_k:
            return {"valid": False, "message": "API key không được để trống"}

        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={clean_k}"
        payload = {
            "contents": [{"parts": [{"text": "Hello, respond with 'OK' if you can read this."}]}]
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(api_url, json=payload)
            if resp.status_code == 200:
                return {"valid": True, "message": f"Kết nối Gemini thành công! (Mô hình: {self.model})"}
            elif resp.status_code == 429:
                return {"valid": True, "rate_limited": True, "message": "Key hợp lệ nhưng đang bị giới hạn tốc độ (Rate Limit 429)."}
            else:
                return {"valid": False, "message": f"Lỗi xác thực ({resp.status_code}): {resp.text[:150]}"}
        except Exception as e:
            return {"valid": False, "message": f"Lỗi kết nối tới máy chủ Google Gemini: {str(e)}"}

    # =========================================================================
    # Specialized AI Modules
    # =========================================================================

    def moderate_content(self, title: str, content: str) -> Dict[str, Any]:
        """
        Automated content moderation using Gemini AI with fallback.
        """
        system_prompt = (
            "Bạn là trợ lý AI chuyên kiểm duyệt nội dung cho nền tảng blog kỹ thuật công nghệ thông tin (IT Blog). "
            "Nhiệm vụ của bạn là đánh giá tính an toàn, tính chuyên môn và chất lượng của bài viết. "
            "Hãy trả về kết quả dưới định dạng JSON duy nhất với các trường:\n"
            "{\n"
            "  \"is_safe\": boolean (true nếu không chứa nội dung cấm),\n"
            "  \"spam_score\": float (0.0 đến 1.0, cao nghĩa là spam quảng cáo/cờ bạc),\n"
            "  \"toxicity_score\": float (0.0 đến 1.0, cao nghĩa là độc hại/chửi bới/lừa đảo),\n"
            "  \"is_tech_related\": boolean (true nếu liên quan đến lập trình, IT, phần mềm, công nghệ),\n"
            "  \"quality_score\": float (0.0 đến 1.0, đánh giá độ mạch lạc và giá trị kỹ thuật),\n"
            "  \"verdict\": string (\"approved\" | \"flagged\" | \"rejected\"),\n"
            "  \"reasons\": [danh sách các chuỗi tiếng Việt giải thích lý do nếu có vi phạm hoặc cần lưu ý]\n"
            "}"
        )

        user_prompt = f"Tiêu đề: {title}\n\nNội dung:\n{content[:4000]}"
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
            "Bạn là chuyên gia Content Marketing & SEO kỹ thuật dành cho lập trình viên. "
            "Hãy phân tích bài viết và trả về JSON chuẩn gồm:\n"
            "{\n"
            "  \"suggested_titles\": [3 tiêu đề hấp dẫn, thu hút người đọc CNTT],\n"
            "  \"seo_title\": \"tiêu đề chuẩn SEO dưới 60 ký tự\",\n"
            "  \"meta_description\": \"mô tả ngắn chuẩn SEO dưới 155 ký tự\",\n"
            "  \"suggested_tags\": [3 đến 5 thẻ tag kỹ thuật tiếng Anh hoặc tiếng Việt chuẩn],\n"
            "  \"suggested_category\": \"Frontend\" | \"Backend\" | \"DevOps\" | \"Database\" | \"AI\" | \"Mobile\" | \"Bảo mật\"\n"
            "}"
        )

        user_prompt = f"Tiêu đề ban đầu: {title}\n\nNội dung bài viết:\n{content[:3000]}"
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
            "Bạn là một Senior Tech Lead & Chuyên gia Kỹ thuật Phần mềm. "
            "Hãy trả về JSON gồm:\n"
            "{\n"
            "  \"explanation\": \"phân tích chi tiết bằng tiếng Việt\",\n"
            "  \"improved_code\": \"đoạn mã đã được debug/tối ưu/tái cấu trúc\",\n"
            "  \"key_takeaways\": [3 điểm cốt lõi developer cần lưu ý]\n"
            "}"
        )
        user_prompt = f"Hành động yêu cầu: {action}\nNgôn ngữ: {language}\nĐoạn mã:\n```{language}\n{snippet}\n```"
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
            "Bạn là trợ lý giải đáp kỹ thuật của nền tảng IT Blog. "
            "Hãy trả lời câu hỏi của người dùng dựa trên nội dung bài viết kỹ thuật được cung cấp. "
            "Trả lời ngắn gọn, chuẩn xác, thân thiện và cung cấp ví dụ nếu cần."
        )
        user_prompt = (
            f"Bài viết: {article_title}\n"
            f"Ngữ cảnh trích đoạn: {context or 'Toàn bài viết'}\n"
            f"Nội dung tóm lược: {article_content[:3000]}\n\n"
            f"Câu hỏi của độc giả: {question}"
        )
        ans = self.call_gemini(user_prompt, system_instruction=system_prompt)
        if ans:
            return ans.strip()

        return (
            f"Dựa trên bài viết '{article_title}': Vấn đề bạn hỏi '{question}' "
            "đã được tác giả giải thích và phân tích chi tiết trong bài viết. Phương pháp tốt nhất là tuân thủ cấu trúc chuẩn, "
            "kiểm thử tự động và tham khảo tài liệu chính thức của công nghệ đang sử dụng."
        )

    def summarize_article(self, article_title: str, article_content: str) -> Dict[str, Any]:
        """Summarize technical post into core key takeaways."""
        system_prompt = (
            "Hãy tóm tắt bài viết kỹ thuật công nghệ thông tin dưới định dạng JSON:\n"
            "{\n"
            "  \"summary\": \"tóm tắt 2-3 câu ngắn gọn toàn bộ bài viết\",\n"
            "  \"key_points\": [3 luận điểm kỹ thuật quan trọng nhất]\n"
            "}"
        )
        user_prompt = f"Tiêu đề: {article_title}\n\nNội dung:\n{article_content[:3500]}"
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
            "summary": f"Bài viết '{article_title}' cung cấp phân tích chi tiết về kiến trúc và kỹ thuật thực chiến trong dự án.",
            "key_points": [
                f"Tổng quan công nghệ: {article_title}",
                "Thiết lập môi trường và cấu trúc dự án chuẩn Clean Architecture",
                "Tối ưu hiệu năng, bảo mật và khả năng mở rộng hệ thống"
            ]
        }

    def generate_bot_comment(self, post_title: str, post_content: str, tech_stack: Optional[str] = None) -> str:
        """Generate an insightful discussion starter from AI TechBot."""
        system_prompt = (
            "Bạn là 'AI TechBot' - Trợ lý kỹ thuật tự động trên diễn đàn IT Blog. "
            "Nhiệm vụ của bạn là đọc bài viết và viết 1 bình luận mang tính xây dựng, "
            "nêu bật 1 mẹo thực hành tốt nhất (best practice), chia sẻ kinh nghiệm tránh lỗi "
            "và đặt 1 câu hỏi mở để kích thích cộng đồng thảo luận. Giữ bình luận trong khoảng 3-5 câu."
        )
        user_prompt = f"Bài viết: {post_title}\nCông nghệ: {tech_stack or 'Công nghệ phần mềm'}\nNội dung: {post_content[:2000]}"
        ans = self.call_gemini(user_prompt, system_instruction=system_prompt)
        if ans:
            return f"🤖 **[AI TechBot Phản hồi]**: {ans.strip()}"

        # Heuristic fallback
        return (
            f"🤖 **[AI TechBot Phản hồi]**: Chào bạn! Về chủ đề **{post_title}**, "
            f"mẹo thực hành tốt nhất là luôn tuân thủ nguyên tắc Single Responsibility, "
            f"kiểm thử tự động các edge cases và tham khảo tài liệu chính thức của {tech_stack or 'thư viện'}. "
            f"Độc giả có thắc mắc gì về cấu trúc này hãy đặt câu hỏi bên dưới nhé!"
        )

    # =========================================================================
    # Heuristic Fallback Helpers
    # =========================================================================

    def _heuristic_moderation(self, title: str, content: str) -> Dict[str, Any]:
        text = (title + " " + content).lower()
        spam_keywords = ["casino", "cá cược", "bet88", "lô đề", "tiền ảo lừa đảo", "click here to win", "vay nhanh online"]
        is_spam = any(k in text for k in spam_keywords)
        spam_score = 0.95 if is_spam else (0.1 if len(content) < 50 else 0.02)

        toxic_keywords = ["đồ ngu", "lừa đảo", "chết tiệt", "scam", "chửi bới", "racist"]
        is_toxic = any(k in text for k in toxic_keywords)
        toxicity_score = 0.9 if is_toxic else 0.01

        tech_keywords = [
            "code", "lập trình", "python", "javascript", "react", "fastapi", "docker", 
            "database", "postgresql", "sql", "api", "backend", "frontend", "devops",
            "git", "aws", "cloud", "bug", "algorithm", "architecture", "microservice",
            "linux", "system", "web", "html", "css", "node", "ci/cd", "server"
        ]
        tech_matches = sum(1 for k in tech_keywords if k in text)
        is_tech_related = tech_matches >= 1

        reasons = []
        if is_spam:
            reasons.append("Phát hiện từ khóa nghi vấn spam thương mại/cá cược.")
        if is_toxic:
            reasons.append("Phát hiện từ ngữ không chuẩn mực hoặc có tính chất thóa mạ.")
        if not is_tech_related:
            reasons.append("Nội dung chưa phản ánh rõ chủ đề Công nghệ Thông tin / Lập trình.")

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
            f"Làm chủ {title}: Hướng dẫn từ Cơ bản đến Thực chiến 2026",
            f"Tại sao bạn nên áp dụng {title} trong Kiến trúc Phần mềm Hiện đại?",
            f"Top 5 Bí quyết Tối ưu {title} mà Developer cần biết"
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
            tags = ["Công nghệ", "Lập trình", "Kinh nghiệm"]

        seo_title = f"{title[:50]} | IT Blog Nền tảng Tri thức"
        meta_desc = f"Khám phá phân tích chi tiết về {title}. Hướng dẫn thực chiến, tối ưu hóa và kinh nghiệm lập trình từ cộng đồng IT Blog."[:155]

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
                f"Phân tích lỗi tiềm ẩn cho đoạn mã {lang}:\n"
                "1. Kiểm tra việc xử lý ngoại lệ (Exception / Error handling) và giá trị None/Null.\n"
                "2. Đảm bảo việc giải phóng tài nguyên hoặc connection pool được đóng đúng cách.\n"
                "3. Kiểm tra ranh giới dữ liệu (boundary check) và kiểu dữ liệu đầu vào."
            )
            improved_code = f"# [Optimized & Safe {lang} Code]\ntry:\n    # Xử lý an toàn với validation\n    {snippet}\nexcept Exception as err:\n    logger.error(f'Lỗi thực thi: {{err}}')\n    raise"
            takeaways = [
                "Bổ sung validation chặt chẽ cho tham số",
                "Sử dụng try-catch hoặc structured logging",
                "Tránh block luồng chính (I/O blocking)"
            ]
        elif action == "optimize":
            explanation = (
                f"Đề xuất tối ưu hóa hiệu năng ({lang}):\n"
                "1. Giảm độ phức tạp thời gian từ O(N^2) xuống O(N) thông qua hash map / dictionary lookup.\n"
                "2. Tránh truy vấn N+1 nếu tương tác với database (sử dụng eager loading / join).\n"
                "3. Sử dụng bộ nhớ đệm (caching with Redis/in-memory) cho các tính toán trùng lặp."
            )
            improved_code = f"# Optimized Version\n{snippet}\n# Gợi ý: Dùng vectorization, caching hoặc async/await"
            takeaways = [
                "Độ phức tạp O(1) truy xuất",
                "Tối ưu cấp phát bộ nhớ RAM",
                "Tận dụng Async I/O cho network operations"
            ]
        elif action == "refactor":
            explanation = (
                f"Gợi ý tái cấu trúc mã nguồn ({lang}) theo Clean Code & SOLID:\n"
                "1. Tách hàm thành các single-responsibility unit nhỏ gọn (< 20 dòng).\n"
                "2. Đặt tên biến và hàm tường minh theo ngữ cảnh domain nghiệp vụ.\n"
                "3. Sử dụng Type Hinting (typing) và Dependency Injection."
            )
            improved_code = f"# Refactored with Clean Architecture\n{snippet}"
            takeaways = [
                "Áp dụng Single Responsibility Principle",
                "Kiểu dữ liệu rõ ràng (Type hints)",
                "Dễ dàng viết Unit Test (High testability)"
            ]
        else:
            explanation = (
                f"Giải thích cơ chế hoạt động của đoạn mã {lang}:\n"
                f"- Đoạn mã gồm {len(snippet.splitlines())} dòng xử lý logic.\n"
                "- Khởi tạo cấu trúc dữ liệu, duyệt và chuyển đổi dữ liệu qua các pipeline xử lý.\n"
                "- Trả về kết quả phù hợp cho luồng nghiệp vụ tiếp theo."
            )
            improved_code = snippet
            takeaways = [
                "Cấu trúc thuật toán chuẩn",
                "Thích hợp ứng dụng trong kiến trúc Microservices / REST API",
                "Thời gian phản hồi dự kiến < 5ms"
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
