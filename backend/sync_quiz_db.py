import json
import re
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.core.database import SessionLocal
from app.models.quiz import QuizQuestion, QuizQuestionPost
from app.models.post import Post
from app.models.course import Course

def parse_quiz_bank_js(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find RAW_QUIZ_QUESTIONS = [...]
    start_match = re.search(r"const RAW_QUIZ_QUESTIONS = (\[[\s\S]*?\]);", content)
    if not start_match:
        print("Could not find RAW_QUIZ_QUESTIONS in", file_path)
        return []

    json_str = start_match.group(1)
    # Remove any trailing commas if any
    json_str = re.sub(r",\s*([\]}])", r"\1", json_str)
    questions = json.loads(json_str)
    return questions

def sync_database():
    js_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "data", "quizBank.js"))
    raw_questions = parse_quiz_bank_js(js_path)
    print(f"Loaded {len(raw_questions)} questions from {js_path}")

    db = SessionLocal()
    try:
        # Load courses
        courses = {c.id: c for c in db.query(Course).all()}
        print(f"Found {len(courses)} courses in DB:")
        for cid, c in courses.items():
            print(f"  Course {cid}: {c.title}")

        # Map language to course_id
        # Course 1: Full stack
        # Course 2: FastAPI & Microservices Masterclass
        # Course 3: React 19 & Next.js
        # Course 4: DevOps Docker K8s CI/CD
        lang_to_course = {
            "React": 3,
            "React 19": 3,
            "Frontend": 3,
            "Tailwind CSS": 3,
            "FastAPI": 2,
            "PostgreSQL": 2,
            "Architecture": 2,
            "Python": 2,
            "python": 2,
            "DevOps": 4,
            "Docker": 4,
            "CI/CD": 4,
            "Security": 2,
            "Web Security": 1,
            "Fullstack": 1,
            "HTML5": 1,
            "CSS3": 1,
            "JavaScript": 1,
            "HTML/Web": 1
        }

        # Check existing questions in DB by question text
        existing_questions = db.query(QuizQuestion).all()
        existing_by_text = {q.question.strip().lower(): q for q in existing_questions}
        print(f"Existing in DB: {len(existing_questions)} questions")

        inserted_count = 0
        updated_count = 0

        for item in raw_questions:
            q_text = item["question"].strip()
            norm_text = q_text.lower()
            lang = item.get("language", "IT")
            diff = item.get("difficulty", "medium").lower()
            target_cid = lang_to_course.get(lang)

            if norm_text in existing_by_text:
                q = existing_by_text[norm_text]
                q.language = lang
                q.options = item["options"]
                q.answer_index = item["answer_index"]
                q.explanation = item.get("explanation", "")
                q.difficulty = diff
                if target_cid and (q.course_id is None or q.course_id not in courses):
                    q.course_id = target_cid
                updated_count += 1
            else:
                q = QuizQuestion(
                    question=q_text,
                    options=item["options"],
                    answer_index=item["answer_index"],
                    explanation=item.get("explanation", ""),
                    difficulty=diff,
                    language=lang,
                    course_id=target_cid
                )
                db.add(q)
                db.flush()
                existing_by_text[norm_text] = q
                inserted_count += 1

        # Also update any remaining existing questions without course_id
        for q in db.query(QuizQuestion).filter(QuizQuestion.course_id == None).all():
            cid = lang_to_course.get(q.language)
            if cid:
                q.course_id = cid

        db.commit()
        print(f"Sync complete: {inserted_count} inserted, {updated_count} updated.")

        # Total in DB now
        all_q = db.query(QuizQuestion).all()
        print(f"Total QuizQuestion in DB now: {len(all_q)}")

        # Link to posts
        posts = db.query(Post).all()
        print(f"Linking questions to {len(posts)} posts...")

        # Post 1: Microservices FastAPI PostgreSQL
        # Post 2: React 19 Tailwind CSS
        # Post 3: Docker GitHub Actions
        # Post 7: Website co ban
        post_lang_map = {
            1: ["FastAPI", "PostgreSQL", "Architecture", "Python"],
            2: ["React", "React 19", "Tailwind CSS"],
            3: ["DevOps", "Docker", "CI/CD"],
            7: ["Fullstack", "HTML5", "CSS3", "JavaScript", "HTML/Web", "Web Security"]
        }

        # Clear old post links to ensure clean mapping
        db.query(QuizQuestionPost).delete()
        db.commit()

        link_count = 0
        for p in posts:
            target_langs = post_lang_map.get(p.id)
            if not target_langs:
                # Fallback to category matching
                cat_name = p.category.name if p.category else ""
                target_langs = [cat_name]

            matching_questions = [
                q for q in all_q
                if any(tl.lower() in (q.language or "").lower() for tl in target_langs)
            ]
            for mq in matching_questions[:10]: # Link up to 10 best questions per post
                db.add(QuizQuestionPost(question_id=mq.id, post_id=p.id))
                link_count += 1

        db.commit()
        print(f"Created {link_count} QuizQuestionPost associations.")

        # Print stats per course
        print("\n=== QUESTIONS PER COURSE ===")
        for cid, c in courses.items():
            cnt = db.query(QuizQuestion).filter(QuizQuestion.course_id == cid).count()
            print(f"  Course {cid} ({c.title}): {cnt} questions")

        # Print stats per post
        print("\n=== QUESTIONS PER POST ===")
        for p in posts:
            cnt = db.query(QuizQuestionPost).filter(QuizQuestionPost.post_id == p.id).count()
            print(f"  Post {p.id} ({p.title}): {cnt} questions")

    except Exception as e:
        db.rollback()
        print("Error during sync:", e)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    sync_database()
