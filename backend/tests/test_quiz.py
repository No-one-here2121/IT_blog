from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.quiz import QuizQuestion, QuizQuestionPost
from app.models.course import Course
from app.models.post import Post


def test_create_and_get_quiz_question(client: TestClient, db_session: Session):
    # 1. Create a quiz question
    payload = {
        "language": "React",
        "question": "Trong React 19, hook nào quản lý luồng gửi form bất đồng bộ?",
        "options": ["useEffect", "useActionState", "useMemo", "useRef"],
        "answer_index": 1,
        "explanation": "useActionState quản lý form action và loading state.",
        "difficulty": "medium"
    }
    response = client.post("/api/v1/quiz/questions", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["ok"] is True
    assert "question_id" in data
    qid = data["question_id"]

    # 2. Get questions list
    get_res = client.get("/api/v1/quiz/questions?language=React")
    assert get_res.status_code == 200
    res_data = get_res.json()
    assert "questions" in res_data
    assert len(res_data["questions"]) >= 1

    found = [q for q in res_data["questions"] if q["id"] == qid]
    assert len(found) == 1
    assert found[0]["question"] == payload["question"]
    assert found[0]["answer_index"] == 1
    assert found[0]["difficulty"] == "medium"


def test_submit_quiz_answers(client: TestClient, db_session: Session):
    # Setup test question
    q = QuizQuestion(
        language="Python",
        question="Python 3.11 tăng tốc độ bao nhiêu so với bản trước?",
        options=["0%", "10-60%", "200%", "Không đổi"],
        answer_index=1,
        explanation="Dự án Faster CPython tăng tốc 10-60%.",
        difficulty="hard"
    )
    db_session.add(q)
    db_session.commit()
    db_session.refresh(q)

    # Submit correct answer
    submit_payload = {
        "answers": {
            str(q.id): 1
        }
    }
    res = client.post("/api/v1/quiz/submit", json=submit_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_questions"] == 1
    assert data["correct_count"] == 1
    assert data["score_percentage"] == 100.0
    assert data["details"][0]["is_correct"] is True

    # Submit wrong answer
    wrong_payload = {
        "answers": {
            str(q.id): 0
        }
    }
    res_wrong = client.post("/api/v1/quiz/submit", json=wrong_payload)
    assert res_wrong.status_code == 200
    wrong_data = res_wrong.json()
    assert wrong_data["correct_count"] == 0
    assert wrong_data["score_percentage"] == 0.0
    assert wrong_data["details"][0]["is_correct"] is False


def test_generate_quiz_fallback(client: TestClient, db_session: Session):
    # Test generation with fallback when AI is not configured or in test mode
    payload = {
        "language": "FastAPI",
        "count": 3,
        "difficulty": "easy"
    }
    res = client.post("/api/v1/quiz/generate", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["ok"] is True
    assert "created" in data
    assert len(data["created"]) >= 1
    assert data["via"] in ["gemini", "fallback_local"]


def test_delete_quiz_question(client: TestClient, db_session: Session):
    q = QuizQuestion(
        language="DevOps",
        question="Tác dụng của Docker multi-stage build?",
        options=["Tăng kích thước", "Giảm kích thước image", "Thay thế K8s", "Không tác dụng"],
        answer_index=1,
        explanation="Tách build stage khỏi runtime stage.",
        difficulty="easy"
    )
    db_session.add(q)
    db_session.commit()
    db_session.refresh(q)

    del_res = client.delete(f"/api/v1/quiz/questions/{q.id}")
    assert del_res.status_code == 200
    assert del_res.json()["ok"] is True

    check_res = client.get(f"/api/v1/quiz/questions?limit=100")
    remaining_ids = [item["id"] for item in check_res.json()["questions"]]
    assert q.id not in remaining_ids

def test_get_quiz_topics(client: TestClient, db_session: Session):
    res = client.get("/api/v1/quiz/topics")
    assert res.status_code == 200
    topics = res.json()
    assert isinstance(topics, list)
    assert len(topics) >= 8
    topic_ids = [t["id"] for t in topics]
    assert "all" in topic_ids
    assert "React" in topic_ids
    assert "FastAPI" in topic_ids


def test_get_quiz_questions_with_limit_and_randomize(client: TestClient, db_session: Session):
    res = client.get("/api/v1/quiz/questions?limit=5&randomize=true")
    assert res.status_code == 200
    data = res.json()
    assert "questions" in data
    assert len(data["questions"]) <= 5
