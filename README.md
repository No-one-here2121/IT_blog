# IT Blog - Nền Tảng Mạng Xã Hội Tri Thức Kỹ Thuật, Lộ Trình Lập Trình Viên & Tuyển Dụng IT

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0+-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.0+-646CFF.svg?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.0-38B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![DaisyUI](https://img.shields.io/badge/DaisyUI-v5.0-5A0EF8.svg?style=flat&logo=daisyui&logoColor=white)](https://daisyui.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Gemini AI](https://img.shields.io/badge/Google%20Gemini-1.5%20Flash-4285F4.svg?style=flat&logo=google&logoColor=white)](https://ai.google.dev)
[![Tests](https://img.shields.io/badge/Pytest-100%25%20Passed-brightgreen.svg?style=flat&logo=pytest&logoColor=white)](https://docs.pytest.org)

> **IT Blog** là nền tảng mạng xã hội tri thức công nghệ thông tin toàn diện và hiện đại nhất dành cho kỹ sư phần mềm, lập trình viên và sinh viên ngành CNTT. Hệ thống tích hợp đầy đủ các phân hệ chia sẻ bài viết kỹ thuật chuẩn Markdown, hệ thống bình luận lồng cấp đa tầng, lộ trình nghề nghiệp (Career Roadmaps), khóa học chuyên sâu, trắc nghiệm công nghệ tạo đề bằng AI, bảng tin việc làm IT, sự kiện hội thảo, trung tâm kiểm duyệt Admin 12 phân hệ và bộ động cơ cào tin tức kỹ thuật tự động lưu trữ hơn **2.450 bài viết thực tế**.

---

## 📑 Bảng Mục Lục

1. [Điểm Nổi Bật & Công Nghệ Nền Tảng](#-điểm-nổi-bật--công-nghệ-nền-tảng)
2. [Cấu Trúc Thư Mục Dự Án](#-cấu-trúc-thư-mục-dự-án)
3. [Tổng Hợp 15 Phân Hệ Nghiệp Vụ (183 Tính Năng)](#-tổng-hợp-15-phân-hệ-nghiệp-vụ-183-tính-năng)
4. [Hướng Dẫn Cài Đặt & Khởi Chạy Hệ Thống](#-hướng-dẫn-cài-đặt--khởi-chạy-hệ-thống)
5. [Tài Khoản Thử Nghiệm & Phân Quyền](#-tài-khoản-thử-nghiệm--phân-quyền)
6. [Tài Liệu API & Kiểm Thử Tự Động](#-tài-liệu-api--kiểm-thử-tự-động)
7. [Các Lệnh Git Commit & Push](#-các-lệnh-git-commit--push)

---

## 🛠️ Điểm Nổi Bật & Công Nghệ Nền Tảng

### 1. Kiến trúc Frontend (Client-side)
- **Framework**: **React 19** với Single Page Application (SPA) siêu tốc, quản lý vòng đời tối ưu không giật lag.
- **Build Tool**: **Vite 8** biên dịch chỉ trong ~1.09s, hỗ trợ Hot Module Replacement (HMR).
- **Styling**: **Tailwind CSS v4** kết hợp hệ thống component **DaisyUI v5** hỗ trợ chuyển đổi Dark/Light mode tức thì.
- **Biên tập nội dung**: Trình soạn thảo Markdown chuyên nghiệp hỗ trợ highlight cú pháp code đa ngôn ngữ (Prism / highlight.js), xem trước thời gian thực (Live Preview).
- **Giao diện quản trị viên**: Thanh điều hướng tab Moderation dạng viên thuốc co giãn đa tầng (**Responsive Wrapped Pill Tab Navigation**) hiển thị trọn vẹn 12 phân hệ quản trị không bị khuất hoặc tràn viền màn hình.

### 2. Kiến trúc Backend (Server-side)
- **Framework**: **FastAPI (Python 3.11+)** xử lý bất đồng bộ (Asynchronous ASGI), kiểm tra kiểu dữ liệu chặt chẽ qua **Pydantic v2**.
- **ORM & Database**: **SQLAlchemy 2.0 ORM** kết nối **PostgreSQL** hiệu năng cao, tích hợp **Cơ chế Tự động Dự phòng SQLite (Automatic SQLite Failover Engine)** đảm bảo API không bao giờ bị gián đoạn nếu xảy ra sự cố cơ sở dữ liệu cục bộ.
- **Bảo mật & Phân quyền**: Xác thực chuẩn **OAuth2 JWT Access & Refresh Token**, bảo vệ mật khẩu bằng **Passlib (Bcrypt)**, phân quyền vai trò dựa trên vai trò (**RBAC**: Admin, Moderator, User).
- **Rate Limiting Middleware**: Kiểm soát tần suất truy cập API ngăn chặn tấn công DDoS và brute-force.

### 3. Tích hợp Trí Tuệ Nhân Tạo (Gemini AI Multi-Key Pool)
- Tích hợp mô hình **Google Gemini 1.5 Flash** với cơ chế xoay vòng Multi-Key Pool tự động chuyển đổi khóa API khi chạm giới hạn hạn mức (Rate-limit fallback).
- Ứng dụng AI:
  - Tự động kiểm duyệt nội dung độc hại, spam và phát hiện vi phạm bản quyền.
  - Tóm tắt bài viết tự động, đề xuất tiêu đề và thẻ tag kỹ thuật.
  - Động cơ sinh đề trắc nghiệm lập trình tự động (**AI Quiz Generator**) theo ngôn ngữ và độ khó.

### 4. Động cơ Thu thập Tin tức Kỹ thuật Đa luồng (Crawler Engine)
- Tự động cào và cập nhật tin tức từ các nguồn uy tín toàn cầu và Việt Nam: **Dev.to**, **FreeCodeCamp**, **GitHub Engineering Blog**, **Hacker News**, **AWS Architecture Blog**, **VnExpress Số Hóa**.
- Cơ chế lọc bài viết trùng lặp (Duplicate hashing), tự động phân loại chuyên mục và gán thẻ tag theo từ khóa thông minh.
- Chế độ tự động xuất bản (**Auto-publish**) đưa bài viết mới cào trực tiếp lên Newfeed mà không cần phê duyệt thủ công.
- Hiện lưu trữ và lập chỉ mục hơn **2.450 bài viết kỹ thuật thực tế**.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
IT_blog/
├── backend/                             # Ứng dụng Backend FastAPI
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/                      # Các router API nghiệp vụ
│   │   │       ├── ads.py               # Quản lý chiến dịch quảng cáo & tài trợ
│   │   │       ├── auth.py              # Đăng ký, đăng nhập JWT, phiên làm việc
│   │   │       ├── comments.py          # Bình luận lồng cấp, phản hồi, kiểm duyệt
│   │   │       ├── courses.py           # Khóa học kỹ thuật, bài giảng
│   │   │       ├── crawler.py           # Thu thập tin tức RSS/Atom & tự động xuất bản
│   │   │       ├── events.py            # Sự kiện công nghệ, hội thảo trực tuyến
│   │   │       ├── jobs.py              # Bảng tin tuyển dụng việc làm IT
│   │   │       ├── moderation.py        # Trung tâm kiểm duyệt & audit logs
│   │   │       ├── posts.py             # CRUD bài viết, ghim, thích, bookmark
│   │   │       ├── quiz.py              # Ngân hàng trắc nghiệm & sinh đề bằng AI
│   │   │       ├── recommendations.py   # Thuật toán gợi ý cá nhân hóa & trending
│   │   │       ├── roadmaps.py          # Lộ trình lập trình viên (Frontend, Backend, AI...)
│   │   │       └── seo.py               # Sitemap XML, Robots.txt, RSS Feed 2.0
│   │   ├── core/                        # Cấu hình hệ thống, database, rate limiter, security
│   │   ├── models/                      # SQLAlchemy ORM models (User, Post, Comment...)
│   │   ├── schemas/                     # Pydantic v2 schemas xác thực dữ liệu vào/ra
│   │   ├── services/                    # Tầng nghiệp vụ (Gemini AI service, crawler utils)
│   │   └── main.py                      # Điểm khởi chạy ứng dụng FastAPI & Middleware
│   ├── tests/                           # Suite kiểm thử tự động Pytest (100% passed)
│   ├── requirements.txt                 # Danh mục thư viện phụ thuộc Python
│   └── .env                             # Cấu hình biến môi trường
├── src/                                 # Ứng dụng Frontend React 19 + Vite
│   ├── components/                      # UI components tái sử dụng (Navbar, PostCard, Footer...)
│   ├── context/                         # State toàn cục (AuthContext, BlogContext, Theme...)
│   ├── data/                            # Dữ liệu khởi tạo (seedData.js, quizBank.js...)
│   ├── pages/                           # Các màn hình chức năng chính
│   │   ├── courses.jsx                  # Trang danh sách khóa học
│   │   ├── create_post.jsx              # Trang soạn thảo & xuất bản bài viết
│   │   ├── events.jsx                   # Trang sự kiện & webinar công nghệ
│   │   ├── jobs.jsx                     # Trang bảng tin tuyển dụng IT
│   │   ├── leaderboard.jsx              # Bảng xếp hạng lập trình viên & huy hiệu
│   │   ├── login.jsx / logup.jsx        # Đăng nhập / Đăng ký
│   │   ├── main_menu.jsx                # Trang chủ & Bảng tin khám phá đa chế độ
│   │   ├── moderation.jsx               # Dashboard quản trị 12 tab có Cài đặt hệ thống
│   │   ├── policy.jsx                   # Trung tâm Chính sách & Pháp lý (7 phân hệ)
│   │   ├── post_detail.jsx              # Chi tiết bài viết, TOC, bình luận lồng cấp
│   │   ├── profile.jsx                  # Hồ sơ cá nhân, bookmark, bài viết tác giả
│   │   ├── quiz.jsx                     # Trắc nghiệm kiến thức & luyện đề AI
│   │   └── roadmaps.jsx                 # Bản đồ lộ trình lập trình viên tương tác
│   ├── services/                        # Giao tiếp HTTP RESTful API (api.js)
│   ├── App.jsx                          # Root router & layout chính
│   └── main.jsx                         # Điểm neo ứng dụng React DOM
├── DANH_SACH_CHUC_NANG_HE_THONG_IT_BLOG.docx # Tài liệu đặc tả 183 chức năng hoàn chỉnh
├── package.json                         # Danh mục thư viện phụ thuộc Node.js
└── README.md                            # Hướng dẫn chi tiết dự án
```

---

## 🌟 Tổng Hợp 15 Phân Hệ Nghiệp Vụ (183 Tính Năng)

Hệ thống được thiết kế theo kiến trúc module hóa với 15 phân hệ chuyên sâu:

| STT | Phân Hệ Nghiệp Vụ | Số Tính Năng | Mô Tả Trọng Tâm |
|:---:|:---|:---:|:---|
| **1** | **Kiến trúc & Công nghệ Nền tảng** | 5 | React 19, FastAPI, PostgreSQL, SQLite Failover, WebSocket realtime |
| **2** | **Xác thực & Bảo mật Tài khoản** | 6 | Đăng ký, đăng nhập JWT, đổi mật khẩu, phân quyền RBAC, demo login |
| **3** | **Soạn thảo & Quản lý Bài viết** | 16 | Trình soạn thảo Markdown, gắn thẻ tech stack, cover image, lưu nháp |
| **4** | **Chi tiết Bài viết & Trải nghiệm Đọc** | 19 | Mục lục TOC tự động, highlight code, reading progress, chia sẻ |
| **5** | **Tương tác Cộng đồng & Thảo luận** | 11 | Bình luận lồng cấp, phản hồi, thích bài/cmt, xóa cmt trực tiếp trên Newfeed |
| **6** | **Trang chủ & Bảng tin Thông minh** | 13 | 4 chế độ bảng tin, thuật toán đề xuất, trending score, admin feed operations |
| **7** | **Hồ sơ Cá nhân & Trang Tác giả** | 16 | Quản lý bài viết cá nhân, bookmark, thống kê tương tác, bio tác giả |
| **8** | **Gamification & Bảng Xếp Hạng** | 7 | Điểm uy tín (Reputation), huy hiệu kỹ thuật (Badges), vinh danh Leaderboard |
| **9** | **Nền tảng Học tập & Lộ trình IT** | 18 | Lộ trình nghề nghiệp tương tác (Roadmaps), khóa học chọn lọc |
| **10** | **Trắc nghiệm Công nghệ & Sinh đề AI** | 11 | Ngân hàng câu hỏi trắc nghiệm, giải thích đáp án, tạo đề bằng Gemini AI |
| **11** | **Bảng tin Việc làm IT & Tuyển dụng** | 13 | Lọc việc làm đa tiêu chí, ứng tuyển online, tìm kiếm vị trí công nghệ |
| **12** | **Hội thảo & Sự kiện Công nghệ** | 10 | Danh sách webinar, workshop, đăng ký tham gia sự kiện trực tuyến |
| **13** | **Hệ thống Thông báo Realtime** | 8 | Thông báo tương tác, bài viết mới, WebSocket cập nhật tức thì |
| **14** | **Trung tâm Kiểm duyệt & Quản trị Admin** | 18 | 12 Tabs Pill Navigation, Cài đặt hệ thống, Crawler tự động duyệt, Quản lý user |
| **15** | **Tối ưu SEO, Nguồn tin & Chính sách** | 12 | Sitemap XML, RSS Feed, Trang Policy 7 phân hệ, Feedback Modal, Search mở rộng |

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Hệ Thống

### Yêu Cầu Môi Trường
- **Node.js**: Phiên bản 18.0 trở lên
- **Python**: Phiên bản 3.11 trở lên
- **Git** đã cài đặt trên máy

---

### Bước 1: Khởi động Backend FastAPI

1. Mở cửa sổ dòng lệnh (Terminal / PowerShell) và điều hướng vào thư mục backend:
   ```bash
   cd backend
   ```

2. Tạo và kích hoạt môi trường ảo Python (Virtual Environment):
   - **Trên Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - **Trên macOS / Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Cài đặt các thư viện phụ thuộc:
   ```bash
   pip install -r requirements.txt
   ```

4. Khởi chạy máy chủ Backend Uvicorn:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - Backend sẽ chạy tại: `http://127.0.0.1:8000`
   - Tài liệu API tương tác Swagger UI: `http://127.0.0.1:8000/docs`
   - Tài liệu API ReDoc: `http://127.0.0.1:8000/redoc`

---

### Bước 2: Khởi động Frontend React Vite

1. Mở một cửa sổ dòng lệnh thứ hai tại thư mục gốc của dự án (`IT_blog/`):
   ```bash
   npm install
   ```

2. Khởi chạy máy chủ phát triển Vite:
   ```bash
   npm run dev
   ```
   - Giao diện người dùng sẽ chạy tại: `http://localhost:5173`

---

## 🔑 Tài Khoản Thử Nghiệm & Phân Quyền

Hệ thống được cấu hình sẵn tài khoản Quản trị viên tối cao (Superuser) và các tài khoản mẫu:

| Tài Khoản / Vai Trò | Email Đăng Nhập | Mật Khẩu | Quyền Hạn |
|:---|:---|:---|:---|
| **Quản trị viên Tối cao (Admin)** | `admin@itblog.dev` | `AdminPassword123!` | Toàn quyền quản trị, xóa bài/cmt trên feed, cấu hình hệ thống |
| **Đăng nhập Nhanh 1-Chạm** | Nút `Dùng thử Demo` trên Modal | Tự động xác thực | Trải nghiệm toàn bộ tính năng với quyền Admin Demo |
| **Thành viên Kỹ sư (User)** | `hoang.dev@itblog.vn` | `UserPassword123!` | Đăng bài, thích, bình luận, làm trắc nghiệm, ứng tuyển việc làm |

---

## 🧪 Tài Liệu API & Kiểm Thử Tự Động

Dự án duy trì tiêu chuẩn mã nguồn nghiêm ngặt, tự động kiểm tra cú pháp và logic:

1. **Kiểm tra cú pháp & Linting Frontend:**
   ```bash
   npm run lint
   ```
   *(Kết quả: 0 errors)*

2. **Kiểm tra đóng gói bản dựng Production:**
   ```bash
   npm run build
   ```
   *(Kết quả: Built thành công trong ~1.09s)*

3. **Chạy toàn bộ suite kiểm thử tự động Backend (Pytest):**
   ```bash
   backend\.venv\Scripts\pytest backend/tests
   ```
   *(Kết quả: 100% passed trên toàn bộ các phân hệ API)*

---

## 📦 Các Lệnh Git Commit & Push

Để lưu lại toàn bộ các thay đổi và đưa mã nguồn lên kho chứa Git (GitHub / GitLab / Bitbucket), bạn có thể chạy tuần tự các lệnh sau trong Terminal tại thư mục gốc dự án:

### 1. Kiểm tra danh sách tệp đã thay đổi:
```bash
git status
```

### 2. Thêm tất cả các tệp mới và chỉnh sửa vào Staging Area:
```bash
git add .
```

### 3. Thực hiện Commit với thông điệp chuẩn mực:
```bash
git commit -m "feat: synchronize 183 platform features, crawler auto-publish, feed moderation, policy hub, and update system docx"
```

### 4. Đẩy mã nguồn lên Remote Repository:
- **Nếu đang ở nhánh hiện tại (ví dụ: `feat/ui-redesign`):**
  ```bash
  git push origin feat/ui-redesign
  ```
- **Nếu muốn gộp và đẩy lên nhánh `main`:**
  ```bash
  git checkout main
  git merge feat/ui-redesign
  git push origin main
  ```

---

*Phát triển và hoàn thiện bởi Đội ngũ Kỹ sư Công nghệ Phần mềm - Phiên bản 2026.*
