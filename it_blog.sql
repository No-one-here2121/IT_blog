--
-- PostgreSQL database dump
--

\restrict Ily8D40zx0hGRZCShm7yDhAPyJhmICQx1tN8Z5c1U8dUn0d049hBGf7cuA1YtBg

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-09-21 19:55:35

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 225 (class 1259 OID 16519)
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id text NOT NULL,
    post_id text NOT NULL,
    user_id text NOT NULL,
    user_name text DEFAULT ''::text NOT NULL,
    user_avatar text DEFAULT ''::text,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16637)
-- Name: course_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_posts (
    course_id text NOT NULL,
    post_id text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.course_posts OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16618)
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    id text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text,
    language text DEFAULT 'C++'::text NOT NULL,
    cover_image text,
    author_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16404)
-- Name: follows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.follows (
    follower_id text NOT NULL,
    following_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT follows_check CHECK ((follower_id <> following_id))
);


ALTER TABLE public.follows OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16731)
-- Name: job_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_applications (
    id text NOT NULL,
    job_id text NOT NULL,
    candidate_name text NOT NULL,
    candidate_email text NOT NULL,
    candidate_phone text DEFAULT ''::text,
    cv_name text NOT NULL,
    cv_data bytea NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.job_applications OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16709)
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id text NOT NULL,
    title text NOT NULL,
    company text NOT NULL,
    location text DEFAULT ''::text,
    job_type text DEFAULT 'internship'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    salary text DEFAULT ''::text,
    link text DEFAULT ''::text,
    description text DEFAULT ''::text,
    posted_at timestamp with time zone DEFAULT now() NOT NULL,
    address text DEFAULT ''::text,
    apply_email text DEFAULT ''::text,
    phone text DEFAULT ''::text,
    CONSTRAINT jobs_job_type_check CHECK ((job_type = ANY (ARRAY['internship'::text, 'fulltime'::text, 'parttime'::text, 'remote'::text])))
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16498)
-- Name: post_bookmarks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_bookmarks (
    post_id text NOT NULL,
    user_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.post_bookmarks OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16477)
-- Name: post_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_likes (
    post_id text NOT NULL,
    user_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.post_likes OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16462)
-- Name: post_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.post_tags (
    post_id text NOT NULL,
    tag text NOT NULL
);


ALTER TABLE public.post_tags OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16426)
-- Name: posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.posts (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text DEFAULT ''::text,
    content text DEFAULT ''::text NOT NULL,
    cover_image text,
    category text DEFAULT 'Frontend'::text NOT NULL,
    author_id text NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    read_time text DEFAULT ''::text,
    status text DEFAULT 'approved'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT posts_status_check CHECK ((status = ANY (ARRAY['approved'::text, 'pending'::text, 'rejected'::text]))),
    CONSTRAINT posts_views_check CHECK ((views >= 0))
);


ALTER TABLE public.posts OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16690)
-- Name: quiz_question_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_question_posts (
    question_id text NOT NULL,
    post_id text NOT NULL
);


ALTER TABLE public.quiz_question_posts OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16658)
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_questions (
    id text NOT NULL,
    course_id text,
    language text DEFAULT ''::text,
    question text NOT NULL,
    options jsonb NOT NULL,
    answer_index integer NOT NULL,
    explanation text DEFAULT ''::text,
    difficulty text DEFAULT 'easy'::text NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT quiz_questions_answer_index_check CHECK ((answer_index >= 0)),
    CONSTRAINT quiz_questions_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))),
    CONSTRAINT quiz_questions_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'ai'::text])))
);


ALTER TABLE public.quiz_questions OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16389)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    avatar text,
    bio text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'user'::text NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5154 (class 0 OID 16519)
-- Dependencies: 225
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.comments (id, post_id, user_id, user_name, user_avatar, content, created_at) FROM stdin;
cmt_001_1	post_001	demo_user	Người dùng Demo	https://api.dicebear.com/7.x/bottts/svg?seed=demouser	Bài viết rất chi tiết ạ, mình thích nhất tính năng bỏ forwardRef, code gọn hơn hẳn!	2026-02-10 21:20:00+07
cmt_002_1	post_002	user_hoang	Hoàng Minh	https://api.dicebear.com/7.x/bottts/svg?seed=hoang	pgvector trong PostgreSQL hiện tại dùng cho production cực kỳ ổn định!	2026-02-12 16:15:00+07
cmt_009_1	post_009	demo_user	Người dùng Demo	https://api.dicebear.com/7.x/bottts/svg?seed=demouser	Bài chia sẻ cực kỳ thực tế và hữu ích, cảm ơn tác giả!	2026-02-26 17:00:00+07
\.


--
-- TOC entry 5156 (class 0 OID 16637)
-- Dependencies: 227
-- Data for Name: course_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_posts (course_id, post_id, "position") FROM stdin;
course_mub5pcgdrac6x	post_008	0
course_mub5pcgdrac6x	post_002	1
\.


--
-- TOC entry 5155 (class 0 OID 16618)
-- Dependencies: 226
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.courses (id, title, description, language, cover_image, author_id, created_at) FROM stdin;
course_mub5pcgdrac6x	test	Nhóm các bài viết cùng tag "AI & LLM" (2 bài).	DevOps	\N	demo_user	2026-09-21 18:23:08.749752+07
course_mub5oeo1mfsw4	lập trình c++	Nhóm các bài viết cùng tag "Security" (1 bài).	c#	\N	demo_user	2026-09-21 18:22:24.962214+07
\.


--
-- TOC entry 5149 (class 0 OID 16404)
-- Dependencies: 220
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.follows (follower_id, following_id, created_at) FROM stdin;
demo_user	user_hoang	2026-09-21 13:36:01.106896+07
demo_user	user_linh	2026-09-21 13:36:01.109829+07
user_hoang	user_linh	2026-09-21 13:36:01.111254+07
user_linh	user_hoang	2026-09-21 13:36:01.112222+07
user_nam	user_hoang	2026-09-21 13:36:01.113181+07
\.


--
-- TOC entry 5160 (class 0 OID 16731)
-- Dependencies: 231
-- Data for Name: job_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_applications (id, job_id, candidate_name, candidate_email, candidate_phone, cv_name, cv_data, created_at) FROM stdin;
\.


--
-- TOC entry 5159 (class 0 OID 16709)
-- Dependencies: 230
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobs (id, title, company, location, job_type, tags, salary, link, description, posted_at, address, apply_email, phone) FROM stdin;
\.


--
-- TOC entry 5153 (class 0 OID 16498)
-- Dependencies: 224
-- Data for Name: post_bookmarks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post_bookmarks (post_id, user_id, created_at) FROM stdin;
post_001	demo_user	2026-09-21 13:36:01.136581+07
post_004	demo_user	2026-09-21 13:36:01.178088+07
post_005	user_nam	2026-09-21 13:36:01.185077+07
post_007	user_hoang	2026-09-21 13:36:01.287499+07
post_008	demo_user	2026-09-21 13:36:01.309754+07
post_009	demo_user	2026-09-21 13:36:01.320055+07
\.


--
-- TOC entry 5152 (class 0 OID 16477)
-- Dependencies: 223
-- Data for Name: post_likes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post_likes (post_id, user_id, created_at) FROM stdin;
post_001	demo_user	2026-09-21 13:36:01.131348+07
post_001	user_linh	2026-09-21 13:36:01.135417+07
post_002	demo_user	2026-09-21 13:36:01.153279+07
post_002	user_hoang	2026-09-21 13:36:01.154264+07
post_003	demo_user	2026-09-21 13:36:01.166241+07
post_003	user_nam	2026-09-21 13:36:01.167385+07
post_004	user_hoang	2026-09-21 13:36:01.176181+07
post_004	demo_user	2026-09-21 13:36:01.177098+07
post_005	user_nam	2026-09-21 13:36:01.184134+07
post_006	demo_user	2026-09-21 13:36:01.27897+07
post_007	user_hoang	2026-09-21 13:36:01.286313+07
post_008	demo_user	2026-09-21 13:36:01.307122+07
post_008	user_hoang	2026-09-21 13:36:01.308271+07
post_009	demo_user	2026-09-21 13:36:01.316407+07
post_009	user_linh	2026-09-21 13:36:01.317532+07
post_009	user_nam	2026-09-21 13:36:01.318841+07
\.


--
-- TOC entry 5151 (class 0 OID 16462)
-- Dependencies: 222
-- Data for Name: post_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.post_tags (post_id, tag) FROM stdin;
post_001	React
post_001	JavaScript
post_001	Frontend
post_002	AI & LLM
post_002	RAG
post_002	LLM
post_002	Python
post_003	Backend
post_003	FastAPI
post_003	Go
post_003	Microservices
post_004	DevOps
post_004	Docker
post_004	CI/CD
post_005	Database
post_005	PostgreSQL
post_005	System Design
post_006	System Design
post_006	Redis
post_006	Backend
post_007	Frontend
post_007	Tailwind
post_007	CSS
post_008	AI & LLM
post_008	LLM
post_008	Career
post_009	Career
post_009	Interview
post_010	Go
post_010	Microservices
post_010	gRPC
post_011	Database
post_011	PostgreSQL
post_011	SQL
post_mub8mhyx_oi8zrq	c++
\.


--
-- TOC entry 5150 (class 0 OID 16426)
-- Dependencies: 221
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) FROM stdin;
post_003	FastAPI vs Go: Lựa Chọn Nào Cho Hệ Thống Microservices Tốc Độ Cao?	fastapi-vs-go-lua-chon-nao-cho-microservices	So sánh hiệu năng thực tế, tốc độ phát triển, memory footprint và hệ sinh thái thư viện giữa Python FastAPI và Golang.	Khi xây dựng Backend cho ứng dụng hiện đại, hai cái tên sáng giá thường được đưa lên bàn cân là FastAPI và Golang.\n\n### FastAPI: Tốc độ phát triển thần tốc\n- Syntax async/await hiện đại với Pydantic type checking.\n- Tự động sinh Swagger OpenAPI docs.\n- Cực kỳ mạnh mẽ cho các dịch vụ AI / Data processing.\n\n### Go: Tối ưu tài nguyên tuyệt đối\n- Tốc độ thực thi tiệm cận C/C++, Goroutines xử lý hàng trăm nghìn kết nối đồng thời với RAM cực thấp.\n- Single binary file dễ dàng đóng gói Docker chỉ tầm 10-15MB.\n\n### Kết Luận:\nNếu team mạnh về Python và làm việc nhiều với mô hình AI, FastAPI là lựa chọn tuyệt vời. Khi hệ thống cần chịu tải hàng trăm nghìn RPS với chi phí máy chủ tối thiểu, Go là người chiến thắng.	\N	Backend	user_hoang	850	6 phút đọc	approved	2026-02-14 14:45:00+07
post_005	Hiểu Sâu Về B-Tree Index Trong PostgreSQL Để Tối Ưu Truy Vấn Hàng Triệu Record	hieu-sau-ve-b-tree-index-trong-postgresql	Cách PostgreSQL duyệt cây B-Tree, sự khác nhau giữa Seq Scan và Index Scan, cùng những sai lầm khiến Index bị vô hiệu hóa.	Tại sao có đánh Index mà câu lệnh SQL vẫn chạy chậm? Hãy cùng phân tích cách hoạt động bên dưới của PostgreSQL Index.\n\n### Cấu Trúc B-Tree\nB-Tree (Balanced Tree) giữ cho dữ liệu luôn được sắp xếp theo thứ tự, giúp độ phức tạp tìm kiếm chỉ là O(log N).\n\n### Những Sai Lầm Làm Vô Hiệu Hóa Index:\n- Sử dụng hàm trên cột có đánh index (ví dụ: `WHERE LOWER(email) = ...`). Giải pháp: Dùng Expression Index `CREATE INDEX ON users (LOWER(email))`.\n- Tìm kiếm wildcard bắt đầu bằng dấu `%`: `WHERE name LIKE '%tech'`.\n- Không cập nhật thống kê định kỳ (`ANALYZE`) khiến Query Planner chọn sai phương án.\n\nLuôn dùng `EXPLAIN ANALYZE` trước khi đưa câu truy vấn phức tạp lên môi trường thực tế!	\N	Database	user_hoang	730	6 phút đọc	approved	2026-02-18 23:00:00+07
post_006	Chiến Lược Rate Limiting Hiệu Quả Với Redis Token Bucket Algorithm	chien-luoc-rate-limiting-hieu-qua-voi-redis	Bảo vệ hệ thống API trước tấn công DDoS và Spam bằng thuật toán Token Bucket kết hợp Redis Lua Script nguyên tử.	Rate Limiting là lớp bảo vệ thiết yếu ngăn chặn người dùng hoặc bot gửi request ồ ạt làm tê liệt API server.\n\n### Thuật Toán Token Bucket\n- Một 'thùng chứa' (bucket) có dung lượng tối đa C tokens.\n- Cứ sau mỗi chu kỳ thời gian, hệ thống tự động đổ thêm r tokens vào thùng.\n- Mỗi request đến phải lấy 1 token. Nếu thùng rỗng, trả về HTTP 429 (Too Many Requests).\n\nDùng Redis Lua script giúp việc kiểm tra và trừ token diễn ra nguyên tử (atomic), không bị race condition trong môi trường phân tán.	\N	System Design	user_nam	640	5 phút đọc	approved	2026-02-20 15:15:00+07
post_002	Xây Dựng Ứng Dụng RAG (Retrieval-Augmented Generation) Với Vector Database	xay-dung-ung-dung-rag-voi-vector-database	Hướng dẫn từng bước tích hợp LLM với kho tài liệu nội bộ qua Embedding và Vector Search như Qdrant, ChromaDB hoặc pgvector.	RAG đang là kiến trúc tiêu chuẩn để giải quyết bài toán LLM 'ảo tưởng' (hallucination) và thiếu cập nhật tri thức chuyên ngành.\n\n### Luồng Hoạt Động Của RAG:\n1. **Document Ingestion**: Chia nhỏ tài liệu thành các chunks (200 - 500 tokens).\n2. **Embedding**: Chuyển đổi văn bản thành vector nhúng đa chiều.\n3. **Vector Storage**: Lưu vào cơ sở dữ liệu vector.\n4. **Semantic Retrieval**: Khi người dùng đặt câu hỏi, tìm các đoạn văn bản tương đồng nhất.\n5. **Generation**: Đưa ngữ cảnh tìm được vào prompt gửi cho LLM tổng hợp câu trả lời chính xác.\n\n```python\n# Ví dụ truy vấn tương đồng cosine\nresults = vector_db.search(\n    collection_name="docs",\n    query_vector=query_embedding,\n    limit=3\n)\n```\n\nPhương pháp này giúp ứng dụng AI trả lời chính xác dựa trên dữ liệu riêng mà không cần fine-tune mô hình tốn kém.	\N	AI & LLM	user_linh	981	7 phút đọc	approved	2026-02-11 17:00:00+07
post_004	Tối Ưu Docker Image Cho Ứng Dụng Node.js Từ 1GB Xuống Còn Dưới 50MB	toi-uu-docker-image-cho-node-js	Kỹ thuật Multi-stage build, sử dụng distroless hoặc alpine, loại bỏ devDependencies và tận dụng Docker cache hiệu quả.	Một lỗi phổ biến của các bạn mới làm việc với Docker là copy toàn bộ mã nguồn và node_modules vào image dẫn đến image nặng hàng GB.\n\n### 4 Bước Tinh Gọn Image:\n1. **Dùng Multi-stage Build**: Tách riêng giai đoạn build (chứa dev tool) và giai đoạn chạy runtime.\n2. **Chọn Base Image Nhẹ**: Dùng `node:alpine` hoặc Google Distroless thay vì bản full Ubuntu.\n3. **Chỉ cài production dependencies**: Chạy `npm ci --only=production`.\n4. **Không chạy dưới quyền root**: Thêm user unprivileged để bảo mật.\n\n```dockerfile\n# Build stage\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\n# Runner stage\nFROM node:20-alpine AS runner\nWORKDIR /app\nENV NODE_ENV=production\nCOPY --from=builder /app/package*.json ./\nCOPY --from=builder /app/dist ./dist\nRUN npm ci --only=production\nUSER node\nCMD ["node", "dist/main.js"]\n```\n\nKết quả kích thước image giảm từ 1.1GB xuống chỉ còn 48MB, tốc độ deploy CI/CD nhanh gấp 10 lần!	\N	DevOps	user_nam	1121	4 phút đọc	approved	2026-02-16 20:20:00+07
post_007	Tailwind CSS v4 Có Gì Mới? Tối Ưu Build Nhanh Gấp 10 Lần Với Engine Oxide	tailwind-css-v4-co-gi-moi	Không còn file tailwind.config.js cồng kềnh, cấu hình trực tiếp trong CSS với @theme và kiến trúc Rust engine siêu tốc.	Tailwind CSS v4 là bản nâng cấp toàn diện viết lại hoàn toàn từ đầu bằng ngôn ngữ Rust.\n\n### Điểm Mới Nổi Nổi Bật:\n1. **Engine Oxide Siêu Tốc**: Tốc độ biên dịch CSS nhanh hơn từ 5 đến 10 lần so với v3.\n2. **Cấu Hình Thuần CSS**: Toàn bộ biến theme, màu sắc và font được định nghĩa trực tiếp bằng cú pháp `@theme` trong CSS.\n3. **Tích hợp DaisyUI 5**: Hỗ trợ các component có sẵn với các theme sáng/tối linh hoạt chỉ qua một dòng import.\n\nDự án hiện tại của chúng ta cũng đang ứng dụng Tailwind CSS v4 và DaisyUI 5 để đem lại trải nghiệm mượt mà nhất.	\N	Frontend	demo_user	920	4 phút đọc	approved	2026-02-22 18:30:00+07
post_008	Agentic AI Là Gì? Xu Hướng Lập Trình Tiếp Theo Sau Kỷ Nguyên Prompt Chating	agentic-ai-la-gi-xu-huong-lap-trinh-tiep-theo	Sự chuyển dịch từ AI trả lời thụ động sang AI tự động lập kế hoạch, gọi Tools, phản biện và hoàn thành tác vụ phức tạp.	Năm 2024 - 2026 đánh dấu bước ngoặt lớn từ Generative AI đơn thuần sang Agentic AI.\n\nMột AI Agent không chỉ trả về đoạn văn bản, mà có khả năng:\n- **Planning**: Tự phân tách bài toán lớn thành các bước thực thi.\n- **Tool Calling**: Sử dụng terminal, đọc ghi file, gọi API bên thứ ba.\n- **Memory & Reflection**: Ghi nhớ ngữ cảnh dài hạn và tự sửa lỗi khi gặp vấn đề.\n\nLập trình viên biết cách kết hợp kỹ năng phần mềm truyền thống với AI Agents sẽ nâng cao năng suất gấp nhiều lần.	\N	AI & LLM	user_linh	1450	5 phút đọc	approved	2026-02-25 16:00:00+07
post_009	Kinh Nghiệm Phỏng Vấn Kỹ Thuật (Live Coding & System Design) Cho Lập Trình Viên	kinh-nghiem-phong-van-ky-thuat	Tổng hợp các mẹo chuẩn bị portfolio, cách tư duy to miệng khi giải thuật LeetCode và cấu trúc trả lời phỏng vấn hành vi STAR.	Vượt qua vòng phỏng vấn kỹ thuật không chỉ dựa vào việc bạn viết code giỏi mà còn phụ thuộc lớn vào kỹ năng giao tiếp và làm rõ yêu cầu.\n\n### 3 Nguyên Tắc Vàng Khi Live Coding:\n1. **Làm rõ yêu cầu trước khi gõ phím**: Đừng vội viết code ngay, hãy hỏi về edge cases, giới hạn dữ liệu đầu vào.\n2. **Think out loud**: Vừa nghĩ vừa nói cho người phỏng vấn hiểu hướng tiếp cận của bạn.\n3. **Bắt đầu từ giải pháp thô (Brute-force) rồi tối ưu dần**: Đừng cố tìm giải pháp hoàn hảo ngay từ giây đầu tiên.\n\nHãy chuẩn bị đồ án môn học thật chỉn chu để tự tin chia sẻ những khó khăn kỹ thuật bạn đã giải quyết!	\N	Career	user_hoang	1680	6 phút đọc	approved	2026-02-26 15:00:00+07
post_010	Kiến Trúc Microservices Với Go và gRPC: Từ Thiết Kế Đến Triển Khai	kien-truc-microservices-voi-go-va-grpc	Hướng dẫn xây dựng các dịch vụ độc lập giao tiếp hiệu năng cao qua Protocol Buffers và gRPC trong môi trường production.	Trong kiến trúc microservices hiện đại, việc tối ưu hóa giao tiếp giữa các service là yếu tố quyết định độ trễ của toàn hệ thống.\n\n### 1. Tại sao lại là gRPC thay vì REST?\n- Sử dụng nhị phân HTTP/2 và Protobuf giúp payload nhỏ hơn gấp 3-5 lần JSON.\n- Hỗ trợ full-duplex streaming mạnh mẽ.\n- Tự động sinh mã nguồn client/server đa ngôn ngữ.\n\nBài viết này đi sâu vào cách viết Proto file, khởi tạo gRPC server với Go và triển khai Load Balancing.	https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80	Backend	user_nam	120	7 phút đọc	pending	2026-03-01 16:00:00+07
post_011	Tối Ưu Truy Vấn Cơ Sở Dữ Liệu PostgreSQL Với Phân Trang Keyset Cursor	toi-uu-truy-van-postgresql-voi-phan-trang-keyset-cursor	Tại sao OFFSET và LIMIT lại làm chậm database khi dữ liệu lớn hàng triệu dòng? Phân tích giải pháp Cursor-based Pagination.	Khi ứng dụng tăng trưởng về quy mô dữ liệu, kỹ thuật phân trang truyền thống sử dụng OFFSET bắt đầu bộc lộ nhược điểm nghiêm trọng.\n\nDatabase buộc phải quét và bỏ qua hàng triệu dòng trước khi trả kết quả. Bằng cách sử dụng Keyset Cursor dựa trên khóa chính hoặc mốc thời gian index, truy vấn luôn đạt thời gian O(1) bất kể trang thứ bao nhiêu!	https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&auto=format&fit=crop&q=80	Database	user_linh	85	5 phút đọc	pending	2026-03-02 17:30:00+07
post_001	React 19 Ra Mắt: Những Tính Năng Đột Phá Lập Trình Viên Cần Nắm Rõ	react-19-ra-mat-nhung-tinh-nang-dot-pha	Khám phá React Compiler, Server Actions, useActionState, useOptimistic và việc loại bỏ forwardRef và memo truyền thống.	React 19 đã chính thức ra mắt mang lại những cải tiến mang tính cách mạng cho hệ sinh thái Frontend. \n\n### 1. React Compiler Tự Động Tối Ưu\nTrước đây lập trình viên phải chủ động dùng useMemo, useCallback để tránh re-render thừa. Với React Compiler mới, việc memoize được biên dịch tự động ở build-time.\n\n### 2. Actions & Hook useActionState\nActions cho phép bạn quản lý luồng gửi dữ liệu bất đồng bộ với trạng thái loading, lỗi và phản hồi tức thì mà không cần tự viết nhiều useState rời rạc.\n\n### 3. Hỗ trợ Refs Dưới Dạng Props\nBạn không còn phải bọc component trong `forwardRef` nữa. Ref giờ đây chỉ là một prop bình thường được truyền thẳng vào Function Component!\n\n```jsx\nfunction MyInput({ placeholder, ref }) {\n  return <input ref={ref} placeholder={placeholder} className="input" />;\n}\n```\n\nĐây thực sự là bước chuyển mình lớn của React hướng tới trải nghiệm lập trình đơn giản và hiệu quả hơn.	\N	Frontend	user_hoang	1240	5 phút đọc	approved	2026-02-09 15:30:00+07
post_mub8mhyx_oi8zrq	lập trình c++	lap-trinh-c	lập trình h đ t	:::video youtube:KsVqBIWtRec\n:::	\N	Frontend	demo_user	2	4 phút đọc	approved	2026-09-21 19:44:54.777+07
\.


--
-- TOC entry 5158 (class 0 OID 16690)
-- Dependencies: 229
-- Data for Name: quiz_question_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_question_posts (question_id, post_id) FROM stdin;
q_fe_001	post_001
q_mub6olmra8hra	post_008
q_mub6olmra8hra	post_002
q_mub6oln9a4mjs	post_008
q_mub6oln9a4mjs	post_002
q_mub6olndlal62	post_008
q_mub6olndlal62	post_002
q_mub6olnf6qzt6	post_008
q_mub6olnf6qzt6	post_002
q_mub6olnhzay5m	post_008
q_mub6olnhzay5m	post_002
\.


--
-- TOC entry 5157 (class 0 OID 16658)
-- Dependencies: 228
-- Data for Name: quiz_questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_questions (id, course_id, language, question, options, answer_index, explanation, difficulty, source, created_by, created_at) FROM stdin;
q_mub6olmra8hra	course_mub5pcgdrac6x	DevOps	Khả năng "Tool Calling" của một Agentic AI có thể mang lại lợi ích gì cho pipeline DevOps?	["Tự động tạo mã Python phức tạp từ đầu.", "Tự động tương tác với các công cụ CI/CD, đọc log hoặc triển khai mã.", "Tạo bảng điều khiển trực quan để giám sát.", "Thiết kế các schema cơ sở dữ liệu mới."]	1	Khả năng "Tool Calling" cho phép Agentic AI sử dụng terminal, đọc/ghi file và gọi API bên thứ ba. Điều này giúp tự động hóa các tác vụ trong DevOps như điều khiển công cụ CI/CD, phân tích log để tìm lỗi hoặc tự động triển khai phần mềm.	easy	ai	demo_user	2026-09-21 18:50:33.603999+07
q_mub6oln9a4mjs	course_mub5pcgdrac6x	DevOps	Kiến trúc RAG bao gồm các bước "Document Ingestion," "Embedding," "Vector Storage," "Semantic Retrieval" và "Generation." Bước nào liên quan trực tiếp nhất đến các mối quan tâm điển hình của DevOps về quản lý dữ liệu và khả năng mở rộng (scalability)?	["Document Ingestion", "Embedding", "Vector Storage", "Generation"]	2	"Vector Storage" là nơi lưu trữ cơ sở dữ liệu vector. Trong DevOps, việc quản lý cơ sở dữ liệu, đảm bảo tính sẵn sàng cao, khả năng sao lưu, phục hồi và mở rộng quy mô dữ liệu là những mối quan tâm cốt lõi để ứng dụng hoạt động ổn định và hiệu quả.	medium	ai	demo_user	2026-09-21 18:50:33.603999+07
q_mub6olndlal62	course_mub5pcgdrac6x	DevOps	Sự chuyển đổi sang Agentic AI, với các khả năng "Planning," "Tool Calling," và "Memory & Reflection," gợi ý về sự thay đổi tiềm năng nào trong vai trò của kỹ sư DevOps?	["Các kỹ sư DevOps sẽ dành nhiều thời gian hơn để cấu hình máy chủ thủ công.", "Các kỹ sư DevOps sẽ tập trung chủ yếu vào việc viết các mô hình học máy nâng cao.", "Các kỹ sư DevOps sẽ chuyển từ việc viết script mệnh lệnh sang thiết kế và điều phối các AI Agent tự động trong pipeline CI/CD.", "Các kỹ sư DevOps sẽ không còn cần thiết vì AI Agent sẽ xử lý tất cả cơ sở hạ tầng."]	2	Với khả năng tự chủ của Agentic AI, vai trò của DevOps có thể chuyển từ việc thực hiện các tác vụ lặp đi lặp lại bằng script sang việc thiết kế, giám sát và điều phối các Agent để chúng tự động hóa các phần phức tạp hơn của quy trình CI/CD và vận hành.	medium	ai	demo_user	2026-09-21 18:50:33.603999+07
q_mub6olnf6qzt6	course_mub5pcgdrac6x	DevOps	Trong bối cảnh triển khai ứng dụng RAG, thực hành DevOps phổ biến nào sẽ rất quan trọng để đảm bảo các bước "Semantic Retrieval" và "Generation" duy trì hiệu suất cao và độ tin cậy dưới tải người dùng khác nhau?	["Thực hiện chính sách đánh giá mã nghiêm ngặt cho các prompt của LLM.", "Chỉ tập trung vào việc giảm kích thước của các đoạn văn bản trong quá trình nhập liệu.", "Thiết lập giám sát mạnh mẽ, tự động mở rộng (auto-scaling) và cân bằng tải (load balancing) cho các dịch vụ retrieval và generation.", "Cập nhật thủ công cơ sở dữ liệu vector vài phút một lần."]	2	Để một hệ thống duy trì hiệu suất và độ tin cậy dưới tải biến động, các thực hành DevOps như giám sát hiệu suất, tự động mở rộng tài nguyên (auto-scaling) dựa trên nhu cầu, và phân phối tải (load balancing) qua nhiều instance là cực kỳ quan trọng, đặc biệt cho các thành phần tính toán chuyên sâu như Semantic Retrieval và Generation trong RAG.	hard	ai	demo_user	2026-09-21 18:50:33.603999+07
q_mub6olnhzay5m	course_mub5pcgdrac6x	DevOps	Khía cạnh nào trong khả năng "Memory & Reflection" của Agentic AI có thể đặc biệt hữu ích để cải thiện khả năng phục hồi (resilience) và tự phục hồi (self-healing) của một ứng dụng được triển khai trong môi trường DevOps?	["Khả năng tạo ra nội dung sáng tạo mới lạ.", "Khả năng ghi nhớ các tương tác trong quá khứ và tự động sửa lỗi hoặc thích ứng với các điều kiện mới.", "Sức mạnh để thực hiện các phép tính toán học phức tạp.", "Kỹ năng thiết kế giao diện người dùng."]	1	Khả năng "Memory & Reflection" cho phép AI Agent ghi nhớ ngữ cảnh dài hạn và tự sửa lỗi khi gặp vấn đề. Điều này trực tiếp hỗ trợ các mục tiêu DevOps về resilience (khả năng chịu lỗi) và self-healing (tự phục hồi), giúp ứng dụng duy trì hoạt động ổn định mà không cần can thiệp thủ công.	easy	ai	demo_user	2026-09-21 18:50:33.603999+07
q_mub6str02xjem	course_mub5oeo1mfsw4	DevOps	Mục tiêu chính của DevOps là gì?	["A. Tách biệt hoàn toàn nhóm Phát triển và Vận hành.", "B. Tăng cường tốc độ phân phối phần mềm và cải thiện sự hợp tác.", "C. Chỉ tập trung vào tự động hóa triển khai phần mềm.", "D. Giảm thiểu chi phí phần cứng cho máy chủ."]	1	DevOps hướng đến việc phá vỡ rào cản giữa Development và Operations để tăng tốc độ phân phối giá trị và cải thiện chất lượng sản phẩm thông qua hợp tác và tự động hóa.	easy	ai	demo_user	2026-09-21 18:53:50.748297+07
q_fe_001	\N	JavaScript	Trong React 19, ref duoc truyen vao function component nhu the nao?	["Phai dung forwardRef", "La mot prop binh thuong", "Chi dung voi class component", "Phai qua useContext"]	1	Tu React 19, ref la mot prop binh thuong cua function component.	easy	manual	user_linh	2026-09-21 15:09:55.995114+07
q_fe_002	\N	JavaScript	Hook nao quan ly luong gui form bat dong bo trong React 19?	["useEffect", "useActionState", "useMemo", "useRef"]	1	useActionState quan ly trang thai loading/loi/ket qua cua form action.	medium	manual	user_linh	2026-09-21 15:09:55.995114+07
q_fe_003	\N	JavaScript	React Compiler giup dieu gi?	["Tu dong memoize thay useMemo/useCallback", "Giam kich thuoc bundle", "Doi JS sang TS", "Quan ly router"]	0	React Compiler tu dong memoize o buoc build.	medium	manual	user_linh	2026-09-21 15:09:55.995114+07
q_mub6strfck0wi	course_mub5oeo1mfsw4	DevOps	Thực hành nào sau đây KHÔNG phải là một phần cốt lõi của DevOps?	["A. Tích hợp liên tục (Continuous Integration - CI).", "B. Triển khai liên tục (Continuous Deployment - CD).", "C. Viết mã và gỡ lỗi riêng lẻ trong môi trường cục bộ mà không cần đồng bộ hóa.", "D. Giám sát liên tục (Continuous Monitoring)."]	2	Tích hợp liên tục, triển khai liên tục, và giám sát liên tục là những thực hành cốt lõi trong DevOps. Việc viết mã và gỡ lỗi riêng lẻ mà không đồng bộ hóa sẽ đi ngược lại nguyên tắc hợp tác và tích hợp sớm của DevOps.	easy	ai	demo_user	2026-09-21 18:53:50.748297+07
q_mub6stridi8ed	course_mub5oeo1mfsw4	DevOps	Lợi ích chính của việc triển khai CI/CD (Tích hợp và Triển khai Liên tục) trong quy trình DevOps là gì?	["A. Giảm hoàn toàn nhu cầu về kiểm thử phần mềm.", "B. Tăng khả năng phát hiện lỗi sớm, giảm thời gian đưa sản phẩm ra thị trường và tăng tính ổn định của ứng dụng.", "C. Cho phép nhóm vận hành hoàn toàn tự động viết mã.", "D. Hạn chế sử dụng các công cụ quản lý phiên bản."]	1	CI/CD tự động hóa quá trình xây dựng, kiểm thử và triển khai, giúp phát hiện lỗi sớm, tăng tốc độ phân phối và cải thiện độ tin cậy của phần mềm.	medium	ai	demo_user	2026-09-21 18:53:50.748297+07
q_mub6strknhzxc	course_mub5oeo1mfsw4	DevOps	Trong văn hóa DevOps, thuật ngữ "Shift Left" chủ yếu đề cập đến điều gì?	["A. Di chuyển tất cả các máy chủ vật lý sang phía bên trái của trung tâm dữ liệu.", "B. Đưa các hoạt động bảo mật, kiểm thử và chất lượng vào các giai đoạn sớm hơn của chu trình phát triển phần mềm.", "C. Thay đổi ngôn ngữ lập trình từ phải sang trái.", "D. Ưu tiên các tác vụ triển khai thủ công hơn là tự động hóa."]	1	"Shift Left" là một nguyên tắc trong DevOps và Agile, nhấn mạnh việc tích hợp các hoạt động như kiểm thử, bảo mật (DevSecOps), và đảm bảo chất lượng vào các giai đoạn đầu của vòng đời phát triển phần mềm để phát hiện và khắc phục vấn đề sớm hơn, giảm chi phí và rủi ro.	medium	ai	demo_user	2026-09-21 18:53:50.748297+07
q_mub6strmgb1dt	course_mub5oeo1mfsw4	DevOps	Trong khung CALMS để đánh giá và cải thiện mức độ trưởng thành DevOps, chữ "C" đại diện cho điều gì?	["A. Mã hóa (Coding).", "B. Văn hóa (Culture).", "C. Chi phí (Cost).", "D. Khách hàng (Customers)."]	1	CALMS là một khung phổ biến để mô tả các trụ cột của DevOps, bao gồm: Culture (Văn hóa), Automation (Tự động hóa), Lean (Tinh gọn), Measurement (Đo lường), và Sharing (Chia sẻ). "C" trong CALMS là Culture, nhấn mạnh tầm quan trọng của sự thay đổi văn hóa và hợp tác.	hard	ai	demo_user	2026-09-21 18:53:50.748297+07
q_mub81dy8wfal5	course_mub5oeo1mfsw4	DevOps	Mục tiêu chính của bai trong khóa học là gì?	["Tăng hiệu suất và độ tin cậy", "Giảm chất lượng mã nguồn", "Tắt hoàn toàn chức năng kiểm thử", "Xóa quy trình triển khai"]	0	Câu hỏi này kiểm tra cách hiểu đúng về bai và cách vận dụng trong thực tế để nâng cao hiệu quả và độ tin cậy của sản phẩm.	medium	ai	demo_user	2026-09-21 19:28:29.796427+07
q_mub81dyvrpeza	course_mub5oeo1mfsw4	DevOps	Kỹ thuật nào phù hợp nhất để cải thiện bai trong hệ thống thực tế?	["Tối ưu hóa theo tiêu chí rõ ràng", "Bỏ qua kiểm tra lỗi", "Không cần tài liệu", "Dùng dữ liệu sai lệch"]	0	Câu hỏi này kiểm tra cách hiểu đúng về bai và cách vận dụng trong thực tế để nâng cao hiệu quả và độ tin cậy của sản phẩm.	medium	ai	demo_user	2026-09-21 19:28:29.796427+07
q_mub81dyx6n99j	course_mub5oeo1mfsw4	DevOps	Vì sao bai lại quan trọng trong phát triển ứng dụng?	["Giúp hệ thống ổn định, dễ nâng cấp và bảo trì", "Chỉ cần thiết cho quảng cáo", "Không ảnh hưởng đến hiệu năng", "Chỉ dùng cho thiết kế đồ họa"]	0	Câu hỏi này kiểm tra cách hiểu đúng về bai và cách vận dụng trong thực tế để nâng cao hiệu quả và độ tin cậy của sản phẩm.	medium	ai	demo_user	2026-09-21 19:28:29.796427+07
q_mub81dyzqwtgm	course_mub5oeo1mfsw4	DevOps	Khi làm việc với bai, cách tiếp cận đúng nhất là:	["Hiểu yêu cầu, đo lường hiệu quả rồi tối ưu", "Sửa mã mà không kiểm thử", "Bỏ qua tài liệu", "Chỉ tập trung vào giao diện"]	0	Câu hỏi này kiểm tra cách hiểu đúng về bai và cách vận dụng trong thực tế để nâng cao hiệu quả và độ tin cậy của sản phẩm.	medium	ai	demo_user	2026-09-21 19:28:29.796427+07
q_mub81dz22gmaf	course_mub5oeo1mfsw4	DevOps	Đâu là tiêu chí quan trọng nhất khi tối ưu bai?	["Độ rõ ràng, hiệu suất và khả năng bảo trì", "Số lượng file càng lớn càng tốt", "Không cần validate đầu vào", "Tăng độ phức tạp không cần thiết"]	0	Câu hỏi này kiểm tra cách hiểu đúng về bai và cách vận dụng trong thực tế để nâng cao hiệu quả và độ tin cậy của sản phẩm.	medium	ai	demo_user	2026-09-21 19:28:29.796427+07
q_cpp_001	\N	C++	Kieu du lieu nao dung de khai bao mot ham khong tra ve gia tri trong C++?	["func", "void", "def", "function"]	1	Ham khong tra gia tri khai bao kieu tra ve la void.	easy	manual	user_hoang	2026-09-21 15:09:55.995114+07
q_cpp_002	\N	C++	Kich thuoc cua kieu int trong C++ thuong la bao nhieu byte?	["2", "4", "8", "16"]	1	Tren phan lon he thong hien dai int la 4 byte (32 bit).	easy	manual	user_hoang	2026-09-21 15:09:55.995114+07
q_cpp_003	\N	C++	DAC trung nao KHONG thuoc ve huong doi tuong (OOP) trong C++?	["Dong goi", "Ke thua", "Da hinh", "Garbage Collection"]	3	C++ khong co Garbage Collection san, bo nho do lap trinh vien quan ly.	medium	manual	user_hoang	2026-09-21 15:09:55.995114+07
q_cpp_004	\N	C++	Cau truc re nhanh nao kiem tra dieu kien va co nhanh else?	["for", "while", "if-else", "switch-case"]	2	if-else la cau truc re nhanh co ban theo dieu kien.	easy	manual	user_hoang	2026-09-21 15:09:55.995114+07
q_cpp_005	\N	C++	Vong lap nao phu hop khi biet truoc so lan lap?	["while", "do-while", "for", "goto"]	2	Vong for dung khi biet truoc so lan lap.	easy	manual	user_hoang	2026-09-21 15:09:55.995114+07
\.


--
-- TOC entry 5148 (class 0 OID 16389)
-- Dependencies: 219
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, avatar, bio, created_at, role) FROM stdin;
user_hoang	Hoàng Minh	hoang@itblog.local	https://api.dicebear.com/7.x/bottts/svg?seed=hoang	Lập trình viên Web | Đam mê React 19, Go & System Design	2026-01-10 17:00:00+07	user
user_linh	Linh Nguyễn	linh@itblog.local	https://api.dicebear.com/7.x/bottts/svg?seed=linh	Kỹ sư Trí tuệ nhân tạo | Nghiên cứu LLMs và RAG	2026-01-12 18:00:00+07	user
user_nam	Nam Trần	nam@itblog.local	https://api.dicebear.com/7.x/bottts/svg?seed=nam	Kỹ sư DevOps & Cloud | Docker, CI/CD Pipelines	2026-01-20 21:00:00+07	user
demo_user	Người dùng Demo	demo@itblog.local	https://api.dicebear.com/7.x/bottts/svg?seed=demouser	Tài khoản dùng thử để trải nghiệm tính năng trên IT Blog	2026-02-01 15:00:00+07	admin
\.


--
-- TOC entry 4969 (class 2606 OID 16534)
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- TOC entry 4974 (class 2606 OID 16647)
-- Name: course_posts course_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_posts
    ADD CONSTRAINT course_posts_pkey PRIMARY KEY (course_id, post_id);


--
-- TOC entry 4972 (class 2606 OID 16631)
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- TOC entry 4952 (class 2606 OID 16415)
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (follower_id, following_id);


--
-- TOC entry 4982 (class 2606 OID 16746)
-- Name: job_applications job_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);


--
-- TOC entry 4980 (class 2606 OID 16728)
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 4967 (class 2606 OID 16508)
-- Name: post_bookmarks post_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_bookmarks
    ADD CONSTRAINT post_bookmarks_pkey PRIMARY KEY (post_id, user_id);


--
-- TOC entry 4965 (class 2606 OID 16487)
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_pkey PRIMARY KEY (post_id, user_id);


--
-- TOC entry 4963 (class 2606 OID 16470)
-- Name: post_tags post_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_pkey PRIMARY KEY (post_id, tag);


--
-- TOC entry 4958 (class 2606 OID 16450)
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- TOC entry 4960 (class 2606 OID 16452)
-- Name: posts posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_slug_key UNIQUE (slug);


--
-- TOC entry 4978 (class 2606 OID 16698)
-- Name: quiz_question_posts quiz_question_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_question_posts
    ADD CONSTRAINT quiz_question_posts_pkey PRIMARY KEY (question_id, post_id);


--
-- TOC entry 4976 (class 2606 OID 16679)
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- TOC entry 4948 (class 2606 OID 16403)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4950 (class 2606 OID 16401)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4970 (class 1259 OID 16545)
-- Name: idx_comments_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comments_post ON public.comments USING btree (post_id);


--
-- TOC entry 4961 (class 1259 OID 16476)
-- Name: idx_post_tags_tag; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_post_tags_tag ON public.post_tags USING btree (tag);


--
-- TOC entry 4953 (class 1259 OID 16458)
-- Name: idx_posts_author; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_author ON public.posts USING btree (author_id);


--
-- TOC entry 4954 (class 1259 OID 16459)
-- Name: idx_posts_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_category ON public.posts USING btree (category);


--
-- TOC entry 4955 (class 1259 OID 16461)
-- Name: idx_posts_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_created ON public.posts USING btree (created_at DESC);


--
-- TOC entry 4956 (class 1259 OID 16460)
-- Name: idx_posts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_posts_status ON public.posts USING btree (status);


--
-- TOC entry 4991 (class 2606 OID 16535)
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4992 (class 2606 OID 16540)
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4994 (class 2606 OID 16648)
-- Name: course_posts course_posts_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_posts
    ADD CONSTRAINT course_posts_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- TOC entry 4995 (class 2606 OID 16653)
-- Name: course_posts course_posts_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_posts
    ADD CONSTRAINT course_posts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4993 (class 2606 OID 16632)
-- Name: courses courses_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4983 (class 2606 OID 16416)
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4984 (class 2606 OID 16421)
-- Name: follows follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5000 (class 2606 OID 16747)
-- Name: job_applications job_applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_applications
    ADD CONSTRAINT job_applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- TOC entry 4989 (class 2606 OID 16509)
-- Name: post_bookmarks post_bookmarks_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_bookmarks
    ADD CONSTRAINT post_bookmarks_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4990 (class 2606 OID 16514)
-- Name: post_bookmarks post_bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_bookmarks
    ADD CONSTRAINT post_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4987 (class 2606 OID 16488)
-- Name: post_likes post_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4988 (class 2606 OID 16493)
-- Name: post_likes post_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4986 (class 2606 OID 16471)
-- Name: post_tags post_tags_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT post_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4985 (class 2606 OID 16453)
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4998 (class 2606 OID 16704)
-- Name: quiz_question_posts quiz_question_posts_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_question_posts
    ADD CONSTRAINT quiz_question_posts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4999 (class 2606 OID 16699)
-- Name: quiz_question_posts quiz_question_posts_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_question_posts
    ADD CONSTRAINT quiz_question_posts_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.quiz_questions(id) ON DELETE CASCADE;


--
-- TOC entry 4996 (class 2606 OID 16680)
-- Name: quiz_questions quiz_questions_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- TOC entry 4997 (class 2606 OID 16685)
-- Name: quiz_questions quiz_questions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


-- Completed on 2026-09-21 19:55:35

--
-- PostgreSQL database dump complete
--

\unrestrict Ily8D40zx0hGRZCShm7yDhAPyJhmICQx1tN8Z5c1U8dUn0d049hBGf7cuA1YtBg

