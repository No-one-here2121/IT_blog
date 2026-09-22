# IT Blog - Nền Tảng Mạng Xã Hội Tri Thức, Lộ Trình Kỹ Sư & Tuyển Dụng IT

Nền tảng mạng xã hội và cộng đồng công nghệ thông tin toàn diện, hỗ trợ chia sẻ bài viết kỹ thuật, tra cứu lộ trình học (roadmaps), khóa học, sự kiện IT, tuyển dụng việc làm, trắc nghiệm kiến thức và tích hợp trợ lý AI Google Gemini.

---

## 🛠 Công nghệ sử dụng (Tech Stack)

- **Frontend**:
  - React 19 + Vite 8
  - Tailwind CSS v4 + DaisyUI v5
  - React Router DOM, Lucide Icons, Markdown Renderer & Syntax Highlighting
- **Backend**:
  - FastAPI (Python 3.11+)
  - SQLAlchemy 2.0 ORM (Async & Sync support)
  - Pydantic v2 (Data validation & serialization)
  - Alembic (Database migrations)
  - Google Gemini API (AI content analysis & assistance)
- **Database & Cache**:
  - PostgreSQL 16
  - Redis 7 (Cache & Session store)
- **DevOps**:
  - Docker & Docker Compose

---

## 📁 Cấu trúc thư mục chính

```text
IT_blog/
├── backend/                  # FastAPI Backend application
│   ├── app/
│   │   ├── api/v1/          # RESTful API endpoints (auth, posts, courses, jobs,...)
│   │   ├── core/            # Config, security, database session, cache
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   ├── services/        # Business logic services (Gemini AI, crawler, stats)
│   │   └── scripts/seed.py  # Seed initial data (Admin, categories, sample posts)
│   ├── tests/               # Pytest suite (152 automated tests)
│   ├── .env.example         # File mẫu cấu hình biến môi trường
│   ├── Dockerfile           # Backend container build
│   └── requirements.txt     # Python dependencies
├── src/                      # React Frontend application
│   ├── components/          # Reusable UI components
│   ├── context/             # Global states (Auth, Blog, Theme, Toast)
│   ├── pages/               # Main application pages
│   ├── services/            # API integration services
│   └── utils/               # Storage, helpers
├── docker-compose.yml        # Docker compose cho Postgres, Redis, Backend
├── package.json              # Frontend npm dependencies & scripts
└── README.md                 # Tài liệu hướng dẫn dự án
```

---

## 🚀 Hướng Dẫn Khởi Chạy Dự Án

### Cách 1: Khởi chạy nhanh bằng Docker Compose (Khuyên dùng)

Yêu cầu máy đã cài sẵn **Docker Desktop** & **Node.js**:

1. **Khởi động Database, Redis và Backend:**
   ```bash
   docker-compose up -d --build
   ```

2. **Khởi chạy Frontend:**
   ```bash
   # Tại thư mục gốc dự án:
   npm install
   npm run dev
   ```

3. Mở trình duyệt truy cập:
   - **Frontend**: [http://localhost:5173](http://localhost:5173)
   - **Backend API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Cách 2: Khởi chạy từng phần cục bộ (Local Development)

#### Bước 1: Khởi động CSDL PostgreSQL & Redis

Có thể dùng Docker chỉ để bật PostgreSQL và Redis:
```bash
docker-compose up -d postgres redis
```
*(Hoặc sử dụng PostgreSQL và Redis cài trực tiếp trên máy với port `5432` và `6379`).*

#### Bước 2: Khởi chạy Backend (FastAPI)

1. Mở terminal và di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```

2. Kích hoạt môi trường ảo Python:
   - Trên **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\activate
     ```
   - Trên **Linux / macOS**:
     ```bash
     source .venv/bin/activate
     ```

   *(Nếu chưa có `.venv`, tạo mới bằng `python -m venv .venv` và cài thư viện `pip install -r requirements.txt`).*

3. Thiết lập biến môi trường:
   - Copy file mẫu `.env.example` thành `.env`:
     ```bash
     cp .env.example .env
     ```
   *(Chỉnh sửa thông số kết nối Database/Redis trong `.env` nếu cần).*

4. **Nạp dữ liệu mẫu ban đầu (Seed Data):**
   ```bash
   python -m app.scripts.seed
   ```
   *Lệnh này sẽ tự động tạo các bảng, khởi tạo role, tài khoản Super Admin, các danh mục và bài viết mẫu.*

5. **Khởi động máy chủ Backend:**
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

- Backend URL: [http://localhost:8000](http://localhost:8000)
- Tài liệu API (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)
- Tài liệu API (ReDoc): [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

#### Bước 3: Khởi chạy Frontend (React + Vite)

1. Mở một cửa sổ terminal mới tại thư mục gốc của dự án (`IT_blog`):
   ```bash
   cd IT_blog
   ```

2. Cài đặt các gói npm:
   ```bash
   npm install
   ```

3. Chạy server phát triển Vite:
   ```bash
   npm run dev
   ```

- Giao diện web người dùng: [http://localhost:5173](http://localhost:5173)

---

## 🔑 Tài Khoản Quản Trị Viên Mặc Định (Seed Admin)

Sau khi chạy lệnh nạp dữ liệu `seed`:
- **Email**: `admin@itblog.dev`
- **Tên đăng nhập**: `admin`
- **Mật khẩu**: `AdminPassword123!`

---

## 🧪 Chạy Kiểm Thử Tự Động (Automated Tests)

Backend đã tích hợp đầy đủ bộ test tự động với **152 bài test**:
```bash
cd backend
.venv\Scripts\activate  # hoặc source .venv/bin/activate
pytest -v
```

---

## 👥 Nhóm Tác Giả & Bản Quyền

- Dự án phục vụ môn Chuyên Đề Công Nghệ Phần Mềm (CĐ CNPM).
- Mã nguồn được phân phối cho mục đích học tập và phát triển.
