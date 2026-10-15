old = """def test_generate_speech_uses_gemini_tts_interactions_api(monkeypatch):
    request = {}
    audio = b"RIFF\x00\x00\x00\x00WAVE"

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {"output_audio": {"data": base64.b64encode(audio).decode("ascii")}}

    class FakeClient:
        def __init__(self, timeout):
            assert timeout == 120.0

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, headers, json):
            request.update(url=url, headers=headers, json=json)
            return FakeResponse()

    monkeypatch.setattr("app.services.gemini_service.httpx.Client", FakeClient)
    svc = GeminiService()
    svc.set_keys(["test-api-key"])

    result = svc.generate_speech("Xin chào, đây là bài viết công nghệ.")

    assert result == audio
    assert request["url"] == "https://generativelanguage.googleapis.com/v1beta/interactions"
    assert request["headers"]["x-goog-api-key"] == "test-api-key"

new = """def test_extract_audio_from_steps_content_blocks():
    from app.services.gemini_service import GeminiService

    raw_audio = b"RIFF\x00\x00\x00\x00WAVE"
    encoded = base64.b64encode(raw_audio).decode("ascii")
    # Raw Interactions API (REST) response: audio lives in a content block of
    # type "audio" inside steps[].content[], NOT under a top-level field.
    response_data = {
        "id": "v1_ABC123",
        "object": "interaction",
        "model": "gemini-3.8-flash-tts",
        "status": "completed",
        "created": "2026-10-14T12:00:00Z",
        "steps": [
            {"type": "thought", "signature": "EvEFCu4FAQw="},
            {
                "type": "model_output",
                "content": [
                    {"type": "audio", "data": encoded, "mime_type": "audio/wav"}
                ],
            },
        ],
    }

    assert GeminiService._extract_audio_base64(response_data) == raw_audio


def test_extract_audio_from_candidates_parts():
    from app.services.gemini_service import GeminiService

    raw_audio = b"RIFF\x00\x00\x00\x00WAVE"
    encoded = base64.b64encode(raw_audio).decode("ascii")
    response_data = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"type": "audio", "data": encoded, "mime_type": "audio/wav"}
                    ]
                }
            }
        ],
        "usageMetadata": {"tokenCount": 5},
    }

    assert GeminiService._extract_audio_base64(response_data) == raw_audio


def test_extract_audio_from_top_level_output_audio():
    from app.services.gemini_service import GeminiService

    raw_audio = b"RIFF\x00\x00\x00\x00WAVE"
    encoded = base64.b64encode(raw_audio).decode("ascii")
    response_data = {"output_audio": {"data": encoded}, "id": "v1_ABC123"}

    assert GeminiService._extract_audio_base64(response_data) == raw_audio


def test_extract_audio_accepts_whitespace_and_data_uri():
    from app.services.gemini_service import GeminiService

    raw_audio = b"RIFF\x00\x00\x00\x00WAVE"
    encoded = "data:audio/wav;base64, " + "\n".join(
        [
            base64.b64encode(raw_audio).decode("ascii")[:20],
            base64.b64encode(raw_audio).decode("ascii")[20:40],
            base64.b64encode(raw_audio).decode("ascii")[40:],
        ]
    )

    response_data = {"output_audio": {"data": encoded}}
    assert GeminiService._extract_audio_base64(response_data) == raw_audio


def test_extract_audio_returns_none_when_no_audio():
    from app.services.gemini_service import GeminiService

    assert GeminiService._extract_audio_base64(
        {
            "id": "v1_ABC123",
            "status": "completed",
            "steps": [
                {
                    "type": "model_output",
                    "content": [{"type": "text", "text": "no audio here"}],
                }
            ],
        }
    ) is None
"""

assert old in src, "old block not found"
src = src.replace(old, new, 1)

    assert request["json"]["model"] == "gemini-3.8-flash-tts"
    assert request["json"]["response_format"] == {"type": "audio"}
    assert request["json"]["generation_config"]["speech_config"] == [{"voice": "Kore"}]
    assert request["json"]["input"][0]["content"][0]["text"] == "Xin chào, đây là bài viết công nghệ."
"""

import io

path = "d:\backend\tests\test_gemini_service.py"
with io.open(path, encoding="utf-8") as f:
    src = f.read()


with io.open(path, "w", encoding="utf-8", newline="\r\n") as f:
    f.write(src)
print("TEST PATCH OK")
