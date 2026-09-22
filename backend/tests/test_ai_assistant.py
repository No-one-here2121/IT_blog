import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.post import Post, PostStatus


def test_ai_explain_code(client: TestClient, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    # Explain action
    resp = client.post(
        "/api/v1/ai/explain-code",
        json={
            "code_snippet": "def fib(n):\n    return n if n <= 1 else fib(n-1) + fib(n-2)",
            "language": "python",
            "action": "explain"
        },
        headers=headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["action"] == "explain"
    assert data["language"] == "python"
    assert "fib" in data["improved_code"]
    assert len(data["key_takeaways"]) > 0

    # Debug action
    resp_debug = client.post(
        "/api/v1/ai/explain-code",
        json={
            "code_snippet": "data = response.json()\nprint(data['user']['name'])",
            "language": "python",
            "action": "debug"
        },
        headers=headers
    )
    assert resp_debug.status_code == 200
    assert resp_debug.json()["action"] == "debug"
    assert "Exception" in resp_debug.json()["improved_code"]

    # Optimize action
    resp_opt = client.post(
        "/api/v1/ai/explain-code",
        json={
            "code_snippet": "for i in list_a:\n    for j in list_b:\n        if i == j: common.append(i)",
            "language": "python",
            "action": "optimize"
        },
        headers=headers
    )
    assert resp_opt.status_code == 200
    assert resp_opt.json()["action"] == "optimize"

    # Refactor action
    resp_ref = client.post(
        "/api/v1/ai/explain-code",
        json={
            "code_snippet": "def do_everything(): pass",
            "language": "python",
            "action": "refactor"
        },
        headers=headers
    )
    assert resp_ref.status_code == 200
    assert resp_ref.json()["action"] == "refactor"


def test_ai_ask_and_summarize_article(client: TestClient, db_session: Session, test_user: User, test_user_token: str):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Create a post
    post = Post(
        title="Hướng dẫn tối ưu hóa PostgreSQL cho Microservices",
        slug="huong-dan-toi-uu-hoa-postgresql",
        content="PostgreSQL hỗ trợ connection pooling với PgBouncer và indexing BRIN cho dữ liệu lớn theo thời gian.",
        excerpt="Tối ưu PostgreSQL với PgBouncer",
        status=PostStatus.APPROVED.value,
        author_id=test_user.id
    )
    db_session.add(post)
    db_session.commit()
    db_session.refresh(post)

    # Ask article
    ask_resp = client.post(
        "/api/v1/ai/ask-article",
        json={
            "post_id": post.id,
            "question": "Làm thế nào để scale connection pool?",
            "selected_text": "PostgreSQL hỗ trợ connection pooling với PgBouncer"
        },
        headers=headers
    )
    assert ask_resp.status_code == 200
    ask_data = ask_resp.json()
    assert ask_data["post_id"] == post.id
    assert "PgBouncer" in ask_data["reference_context"]
    assert "giải thích" in ask_data["answer"].lower()

    # Summarize article
    sum_resp = client.post(
        "/api/v1/ai/summarize",
        json={"post_id": post.id},
        headers=headers
    )
    assert sum_resp.status_code == 200
    sum_data = sum_resp.json()
    assert sum_data["post_id"] == post.id
    assert len(sum_data["key_points"]) == 3
    assert post.title in sum_data["summary"]

    # Non-existent article
    bad_resp = client.post(
        "/api/v1/ai/ask-article",
        json={"post_id": 9999, "question": "test"},
        headers=headers
    )
    assert bad_resp.status_code == 404
