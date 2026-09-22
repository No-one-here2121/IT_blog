import os
import sys
from datetime import datetime, timezone
from slugify import slugify

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure project root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.user import User, Role, Permission
from app.models.category import Category
from app.models.tag import Tag
from app.models.post import Post, PostStatus
from app.models.gamification import Badge
from app.models.company_job import Company, JobPost
from app.models.event import Event
from app.models.course import Course, CourseLesson
from app.models.roadmap import Roadmap, RoadmapStep
from app.models.quiz import QuizQuestion
from app.core.security import get_password_hash
from app.core.config import settings


def seed():
    print("🌱 Bắt đầu nạp dữ liệu mẫu cho IT Blog Platform...")
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
    except Exception as e:
        print(f"⚠️  Không thể kết nối đến Database: {e}")
        print("💡 Gợi ý: Hãy khởi chạy PostgreSQL qua Docker: `docker compose up -d db` hoặc kiểm tra file cấu hình .env.")
        return

    try:
        # 1. Seed Roles
        print("  -> Nạp danh sách Roles (admin, moderator, author, user)...")
        roles_data = [
            ("admin", "Quản trị viên toàn quyền hệ thống"),
            ("moderator", "Kiểm duyệt viên nội dung & bài viết"),
            ("author", "Tác giả viết bài trên nền tảng"),
            ("user", "Thành viên cộng đồng đọc & tương tác"),
        ]
        role_map = {}
        for name, desc in roles_data:
            role = db.query(Role).filter(Role.name == name).first()
            if not role:
                role = Role(name=name, description=desc)
                db.add(role)
                db.flush()
            role_map[name] = role

        # 2. Seed Superuser Admin
        print(f"  -> Nạp tài khoản Admin: {settings.FIRST_SUPERUSER_EMAIL}...")
        admin = db.query(User).filter(User.email == settings.FIRST_SUPERUSER_EMAIL).first()
        if not admin:
            admin = User(
                email=settings.FIRST_SUPERUSER_EMAIL,
                username=settings.FIRST_SUPERUSER_USERNAME,
                name="Quản Trị Viên IT Blog",
                hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
                avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                bio="Quản trị viên hệ thống IT Blog Platform. Phụ trách kiểm duyệt và phát triển hạ tầng kỹ thuật.",
                is_superuser=True,
                is_active=True
            )
            admin.roles.append(role_map["admin"])
            admin.roles.append(role_map["author"])
            db.add(admin)
            db.flush()

        # 3. Seed Demo Author
        demo_author = db.query(User).filter(User.username == "hoang_dev").first()
        if not demo_author:
            demo_author = User(
                email="hoang.dev@itblog.vn",
                username="hoang_dev",
                name="Nguyễn Văn Hoàng",
                hashed_password=get_password_hash("DevPassword123!"),
                avatar="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
                bio="Senior Backend Engineer | Yêu thích kiến trúc phân tán, Python, FastAPI & PostgreSQL.",
                is_superuser=False,
                is_active=True
            )
            demo_author.roles.append(role_map["author"])
            demo_author.roles.append(role_map["user"])
            db.add(demo_author)
            db.flush()

        # 4. Seed Categories
        print("  -> Nạp danh mục kỹ thuật (Frontend, Backend, DevOps, AI, Database, System, Mobile)...")
        categories_data = [
            ("Frontend", "Giao diện web, React, Vue, HTML/CSS & UX Design", "🎨"),
            ("Backend", "Kiến trúc máy chủ, API, Microservices & Tối ưu hiệu năng", "⚙️"),
            ("DevOps", "CI/CD, Docker, Kubernetes, Linux & Cloud Computing", "🚀"),
            ("AI & Data", "Machine Learning, Deep Learning, Big Data & LLMs", "🤖"),
            ("Database", "PostgreSQL, MySQL, Redis, MongoDB & Thiết kế cơ sở dữ liệu", "🗄️"),
            ("System", "Hệ điều hành, mạng máy tính, bảo mật & tối ưu hệ thống", "🛡️"),
            ("Mobile", "Phát triển ứng dụng di động Flutter, React Native, iOS & Android", "📱"),
        ]
        cat_map = {}
        for name, desc, icon in categories_data:
            cat = db.query(Category).filter(Category.name == name).first()
            if not cat:
                cat = Category(
                    name=name,
                    slug=slugify(name),
                    description=desc,
                    icon=icon
                )
                db.add(cat)
                db.flush()
            cat_map[name] = cat

        # 5. Seed Tags
        print("  -> Nạp các thẻ kỹ thuật (Tags)...")
        tags_data = [
            "React", "FastAPI", "Python", "PostgreSQL", "Docker",
            "TailwindCSS", "JavaScript", "Next.js", "Redis", "Celery",
            "Linux", "Kubernetes", "Git", "Security", "Microservices"
        ]
        tag_map = {}
        for tag_name in tags_data:
            t = db.query(Tag).filter(Tag.name == tag_name).first()
            if not t:
                t = Tag(name=tag_name, slug=slugify(tag_name))
                db.add(t)
                db.flush()
            tag_map[tag_name] = t

        # 6. Seed Initial High-Quality Posts
        print("  -> Nạp các bài viết mẫu chuyên sâu...")
        sample_posts = [
            {
                "title": "Xây Dựng Hệ Thống Kiến Trúc Microservices Với FastAPI Và PostgreSQL",
                "category": "Backend",
                "tags": ["FastAPI", "Python", "PostgreSQL", "Microservices"],
                "cover_image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&auto=format&fit=crop&q=80",
                "excerpt": "Hướng dẫn chi tiết từ A-Z cách thiết kế, xây dựng và tối ưu hóa hệ thống backend microservices chịu tải cao bằng FastAPI, PostgreSQL và Docker.",
                "content": """# Xây Dựng Hệ Thống Kiến Trúc Microservices Với FastAPI Và PostgreSQL

Trong thời đại ứng dụng web đòi hỏi khả năng mở rộng (scalability) và tính sẵn sàng cao, việc chuyển đổi từ kiến trúc Monolithic sang **Microservices** là một bước tiến tất yếu cho các hệ thống lớn.

## 1. Tại sao lựa chọn FastAPI cho Backend?

FastAPI là một trong những web framework Python hiện đại nhất hiện nay với các ưu điểm vượt trội:
- **Tốc độ cực nhanh**: Hiệu năng ngang ngửa NodeJS và Go nhờ sử dụng Starlette và Pydantic.
- **Async/Await nguyên bản**: Hỗ trợ I/O không khóa (non-blocking I/O) hoàn hảo cho các truy vấn cơ sở dữ liệu và gọi API bên ngoài.
- **Tự động sinh tài liệu Swagger UI/ReDoc**: Giúp các thành viên trong đội ngũ frontend và QA dễ dàng kiểm thử API.

```python
from fastapi import FastAPI

app = FastAPI(title="IT Blog Microservice", version="1.0.0")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Core Service"}
```

## 2. Thiết kế Database với PostgreSQL & SQLAlchemy 2.0

Sử dụng **PostgreSQL** làm nguồn dữ liệu nghiệp vụ duy nhất đảm bảo tính toàn vẹn dữ liệu (ACID). Kết hợp cùng **SQLAlchemy 2.0** cho phép viết code typed-safe và tận dụng tối đa connection pooling.

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine(
    "postgresql://postgres:postgres123@localhost:5432/it_blog_db",
    pool_size=10,
    max_overflow=20
)
SessionLocal = sessionmaker(bind=engine)
```

## 3. Tổng kết

Kiến trúc này mang lại sự linh hoạt tối đa, dễ dàng đóng gói vào Docker container và triển khai lên hệ thống Kubernetes hoặc Docker Swarm.
""",
                "views": 1420,
                "read_time": "8 phút đọc",
                "author": demo_author,
                "status": PostStatus.APPROVED.value
            },
            {
                "title": "Tối Ưu Hóa Giao Diện Người Dùng Với React 19 Và Tailwind CSS v4",
                "category": "Frontend",
                "tags": ["React", "TailwindCSS", "JavaScript", "Next.js"],
                "cover_image": "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1000&auto=format&fit=crop&q=80",
                "excerpt": "Khám phá các kỹ thuật hiện đại để xây dựng giao diện người dùng mượt mà, chuẩn responsive trên mọi thiết bị với React và Tailwind CSS.",
                "content": """# Tối Ưu Hóa Giao Diện Người Dùng Với React 19 Và Tailwind CSS v4

Xây dựng trải nghiệm người dùng (UI/UX) trực quan, tốc độ tải trang nhanh và khả năng tương thích hoàn hảo trên cả desktop lẫn thiết bị di động là tiêu chuẩn vàng của lập trình viên Frontend.

## 1. Trải nghiệm Responsive Mobile-First

Khi phát triển giao diện IT Blog, nguyên tắc **Mobile-First** giúp ngăn chặn triệt để lỗi tràn khung ngang (`overflow-x: hidden`), lỗi kẹt thanh cuộn và căn giữa flexbox:

```jsx
<div className="w-full max-w-md mx-auto p-4 sm:p-8 bg-base-100 rounded-2xl shadow-xl">
  <h1 className="text-xl sm:text-2xl font-bold">Chào mừng đến với IT Blog</h1>
</div>
```

## 2. Hỗ trợ Dark Mode & Light Mode linh hoạt

Người dùng CNTT thường xuyên đọc tài liệu kỹ thuật vào ban đêm. Việc hỗ trợ chuyển đổi theme tức thì giúp bảo vệ mắt và nâng cao trải nghiệm đọc bài.
""",
                "views": 980,
                "read_time": "5 phút đọc",
                "author": admin,
                "status": PostStatus.APPROVED.value
            },
            {
                "title": "Tự Động Hóa Triển Khai Ứng Dụng Bằng Docker Và GitHub Actions",
                "category": "DevOps",
                "tags": ["Docker", "Linux", "DevOps", "Git"],
                "cover_image": "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=1000&auto=format&fit=crop&q=80",
                "excerpt": "Thiết lập quy trình CI/CD tự động kiểm thử, build Docker image và đẩy lên máy chủ sản xuất với GitHub Actions và Docker Compose.",
                "content": """# Tự Động Hóa Triển Khai Ứng Dụng Bằng Docker Và GitHub Actions

Quy trình CI/CD (Continuous Integration / Continuous Deployment) giúp đội ngũ phát triển phát hiện lỗi sớm và bàn giao tính năng mới đến tay người dùng một cách an toàn và tự động.

## 1. Viết Dockerfile tối ưu nhiều giai đoạn (Multi-stage Build)

Sử dụng multi-stage build giảm kích thước image từ hàng GB xuống chỉ còn vài chục MB, giúp tiết kiệm băng thông và rút ngắn thời gian deploy.

```dockerfile
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
""",
                "views": 750,
                "read_time": "6 phút đọc",
                "author": demo_author,
                "status": PostStatus.APPROVED.value
            }
        ]

        for p_data in sample_posts:
            post = db.query(Post).filter(Post.title == p_data["title"]).first()
            if not post:
                post = Post(
                    title=p_data["title"],
                    slug=slugify(p_data["title"]),
                    excerpt=p_data["excerpt"],
                    content=p_data["content"],
                    cover_image=p_data["cover_image"],
                    status=p_data["status"],
                    views=p_data["views"],
                    read_time=p_data["read_time"],
                    author_id=p_data["author"].id,
                    category_id=cat_map[p_data["category"]].id,
                    published_at=datetime.now(timezone.utc)
                )
                for tag_name in p_data["tags"]:
                    if tag_name in tag_map:
                        post.tags.append(tag_map[tag_name])
                db.add(post)

        # 7. Seed Badges (Gamification)
        print("  -> Nạp huy hiệu lập trình viên (Badges)...")
        badges_data = [
            ("Lập trình viên Khởi nghiệp", "starter-dev", "Viết bài chia sẻ đầu tiên trên cộng đồng", "Rocket", 10),
            ("Cây bút Chăm chỉ", "prolific-writer", "Đăng tải trên 5 bài viết kỹ thuật chất lượng", "BookOpen", 50),
            ("Chuyên gia Xác thực", "verified-expert", "Có bài viết được đóng dấu chuyên môn Verified", "ShieldCheck", 100),
            ("Chiến binh Thảo luận", "discussion-hero", "Đóng góp 20 câu trả lời kỹ thuật hữu ích", "MessageSquare", 150),
        ]
        for b_name, b_slug, b_desc, b_icon, b_pts in badges_data:
            badge = db.query(Badge).filter(Badge.slug == b_slug).first()
            if not badge:
                badge = Badge(name=b_name, slug=b_slug, description=b_desc, icon=b_icon, points_required=b_pts)
                db.add(badge)

        # 8. Seed Companies & Job Postings
        print("  -> Nạp các công ty công nghệ & tin tuyển dụng IT...")
        companies_data = [
            ("VNG Corporation", "vng-corporation", "Kỳ lân công nghệ hàng đầu Việt Nam", "TP. Hồ Chí Minh", "Python, Golang, Kubernetes, C++", "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=200&auto=format&fit=crop&q=80"),
            ("FPT Software", "fpt-software", "Tập đoàn dịch vụ phần mềm toàn cầu", "Hà Nội / Đà Nẵng", "Java, React, Node.js, Cloud AWS/Azure", "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&auto=format&fit=crop&q=80"),
        ]
        comp_map = {}
        for c_name, c_slug, c_desc, c_loc, c_tech, c_logo in companies_data:
            comp = db.query(Company).filter(Company.slug == c_slug).first()
            if not comp:
                comp = Company(name=c_name, slug=c_slug, description=c_desc, location=c_loc, tech_stack=c_tech, logo=c_logo)
                db.add(comp)
                db.flush()
            comp_map[c_slug] = comp

        jobs_data = [
            ("Senior Backend Engineer (FastAPI/Python)", "vng-corporation", "TP. Hồ Chí Minh", "full-time", "$2,000 - $3,500", "Phát triển hệ thống Microservices backend chịu tải cao trên 50,000 QPS.", "FastAPI, PostgreSQL, Redis, Docker"),
            ("Frontend Engineer (React 19 / Next.js)", "fpt-software", "Hà Nội", "hybrid", "25 - 40 Triệu VNĐ", "Xây dựng dashboard và giao diện người dùng tối ưu UX.", "React, TypeScript, TailwindCSS"),
        ]
        for j_title, c_slug, j_loc, j_type, j_sal, j_desc, j_skills in jobs_data:
            if c_slug in comp_map:
                job = db.query(JobPost).filter(JobPost.title == j_title).first()
                if not job:
                    job = JobPost(
                        company_id=comp_map[c_slug].id,
                        title=j_title,
                        location=j_loc,
                        work_type=j_type,
                        salary_range=j_sal,
                        description=j_desc,
                        skills=j_skills,
                        status="active"
                    )
                    db.add(job)

        # 9. Seed IT Events & Workshops
        print("  -> Nạp sự kiện & hội thảo công nghệ...")
        events_data = [
            ("Vietnam Web Summit 2026: AI & Cloud Computing", "vietnam-web-summit-2026", "Hội thảo công nghệ web lớn nhất năm quy tụ hơn 50 diễn giả quốc tế.", "IT Blog Media", "conference", "Trung tâm Hội nghị Quốc gia, Hà Nội"),
            ("Mastering FastAPI & Asynchronous Python", "mastering-fastapi-async-python", "Workshop trực tuyến thực chiến thiết kế RESTful API hiệu năng cao.", "IT Blog Academy", "workshop", "Online qua Zoom Webinar"),
        ]
        for e_title, e_slug, e_desc, e_org, e_type, e_loc in events_data:
            ev = db.query(Event).filter(Event.slug == e_slug).first()
            if not ev:
                ev = Event(
                    title=e_title,
                    slug=e_slug,
                    description=e_desc,
                    organizer=e_org,
                    event_type=e_type,
                    location=e_loc,
                    start_time=datetime.now(timezone.utc),
                    status="upcoming"
                )
                db.add(ev)

        # 10. Seed Roadmaps & Courses
        print("  -> Nạp lộ trình học & khóa học mẫu...")
        rm = db.query(Roadmap).filter(Roadmap.slug == "backend-developer-roadmap-2026").first()
        if not rm:
            rm = Roadmap(
                title="Lộ trình Trở thành Backend Developer Chuyên nghiệp 2026",
                slug="backend-developer-roadmap-2026",
                description="Toàn bộ kiến thức nền tảng và nâng cao từ giao thức mạng, kiến trúc database đến microservices.",
                level="intermediate",
                category_id=cat_map["Backend"].id,
                created_by_id=admin.id
            )
            db.add(rm)
            db.flush()
            steps = [
                ("1. Ngôn ngữ & Lập trình mạng (Python / Go)", 0),
                ("2. Thiết kế Cơ sở dữ liệu chuẩn quan hệ (PostgreSQL)", 1),
                ("3. Xây dựng RESTful API & Caching (FastAPI + Redis)", 2),
                ("4. Đóng gói Container & Triển khai (Docker & CI/CD)", 3),
            ]
            for s_title, s_idx in steps:
                st = RoadmapStep(roadmap_id=rm.id, title=s_title, order_index=s_idx)
                db.add(st)

        # 11. Seed IT Quiz Questions
        print("  -> Nạp ngân hàng câu hỏi trắc nghiệm IT...")
        existing_q_count = db.query(QuizQuestion).count()
        if existing_q_count == 0:
            sample_questions = [
                QuizQuestion(
                    language="React",
                    question="Trong React 19, ref được truyền vào function component như thế nào?",
                    options=["Phải dùng forwardRef()", "Là một prop bình thường", "Chỉ dùng được với class component", "Bắt buộc phải qua useContext()"],
                    answer_index=1,
                    explanation="Từ React 19, ref đã trở thành một prop bình thường trong function component và không còn cần forwardRef().",
                    difficulty="easy",
                    source="manual",
                    created_by=admin.id
                ),
                QuizQuestion(
                    language="React",
                    question="Hook nào quản lý luồng gửi Form Action bất đồng bộ trong React 19?",
                    options=["useEffect", "useActionState", "useMemo", "useRef"],
                    answer_index=1,
                    explanation="Hook useActionState() tự động quản lý trạng thái loading, lỗi và kết quả khi thực hiện action bất đồng bộ.",
                    difficulty="medium",
                    source="manual",
                    created_by=admin.id
                ),
                QuizQuestion(
                    language="FastAPI",
                    question="FastAPI sử dụng thư viện nào làm nền tảng kiểm tra kiểu dữ liệu (data validation) và serialization?",
                    options=["Marshmallow", "Pydantic", "Django REST Serializer", "Cerberus"],
                    answer_index=1,
                    explanation="FastAPI tích hợp Pydantic chặt chẽ để validate request body, query params và response schema tự động.",
                    difficulty="easy",
                    source="manual",
                    created_by=admin.id
                ),
                QuizQuestion(
                    language="PostgreSQL",
                    question="Mục tiêu cốt lõi của Connection Pooling trong hệ thống Backend là gì?",
                    options=["Mã hóa dữ liệu tại chỗ", "Tái sử dụng các kết nối cơ sở dữ liệu đã mở, giảm overhead khởi tạo kết nối TCP/TLS", "Tự động phân vùng bảng lớn", "Tăng kích thước RAM của máy chủ"],
                    answer_index=1,
                    explanation="Khởi tạo kết nối PostgreSQL tốn kém chi phí handshake và auth. Connection Pooling duy trì nhóm kết nối sẵn sàng sử dụng ngay.",
                    difficulty="medium",
                    source="manual",
                    created_by=admin.id
                ),
                QuizQuestion(
                    language="DevOps",
                    question="Trong quy trình CI/CD với Docker, Multi-stage Build mang lại lợi ích quan trọng nào?",
                    options=["Cho phép chạy nhiều container cùng một port", "Giảm đáng kể kích thước image thành phẩm bằng cách loại bỏ compiler và dev dependencies", "Tự động backup dữ liệu container", "Thay thế hoàn toàn Kubernetes"],
                    answer_index=1,
                    explanation="Multi-stage build tách biệt giai đoạn build và runtime, chỉ copy artifact cần thiết vào image cuối, giúp tối ưu dung lượng và bảo mật.",
                    difficulty="easy",
                    source="manual",
                    created_by=admin.id
                ),
                QuizQuestion(
                    language="Python",
                    question="Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60%?",
                    options=["Loại bỏ hoàn toàn GIL (Global Interpreter Lock)", "Dự án Faster CPython (Adaptive specializing interpreter)", "Chuyển sang JIT compiler của PyPy", "Bắt buộc biên dịch AOT"],
                    answer_index=1,
                    explanation="Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
                    difficulty="hard",
                    source="manual",
                    created_by=admin.id
                )
            ]
            for q in sample_questions:
                db.add(q)

        db.commit()
        print("✅ Nạp dữ liệu mẫu thành công 100%!")

    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi khi nạp dữ liệu mẫu: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
