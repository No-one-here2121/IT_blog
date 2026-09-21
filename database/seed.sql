-- Seed data tu dong sinh tu src/data/seedData.js
-- Chay: psql -h localhost -U postgres -d it_blog -f seed.sql

INSERT INTO users (id, name, email, role, avatar, bio, created_at) VALUES ('demo_user', 'Người dùng Demo', 'demo@itblog.local', 'admin', 'https://api.dicebear.com/7.x/bottts/svg?seed=demouser', 'Tài khoản dùng thử để trải nghiệm tính năng trên IT Blog', '2026-02-01T08:00:00.000Z') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, role=EXCLUDED.role, avatar=EXCLUDED.avatar, bio=EXCLUDED.bio;
INSERT INTO users (id, name, email, role, avatar, bio, created_at) VALUES ('user_hoang', 'Hoàng Minh', 'hoang@itblog.local', 'user', 'https://api.dicebear.com/7.x/bottts/svg?seed=hoang', 'Lập trình viên Web | Đam mê React 19, Go & System Design', '2026-01-10T10:00:00.000Z') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, role=EXCLUDED.role, avatar=EXCLUDED.avatar, bio=EXCLUDED.bio;
INSERT INTO users (id, name, email, role, avatar, bio, created_at) VALUES ('user_linh', 'Linh Nguyễn', 'linh@itblog.local', 'user', 'https://api.dicebear.com/7.x/bottts/svg?seed=linh', 'Kỹ sư Trí tuệ nhân tạo | Nghiên cứu LLMs và RAG', '2026-01-12T11:00:00.000Z') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, role=EXCLUDED.role, avatar=EXCLUDED.avatar, bio=EXCLUDED.bio;
INSERT INTO users (id, name, email, role, avatar, bio, created_at) VALUES ('user_nam', 'Nam Trần', 'nam@itblog.local', 'user', 'https://api.dicebear.com/7.x/bottts/svg?seed=nam', 'Kỹ sư DevOps & Cloud | Docker, CI/CD Pipelines', '2026-01-20T14:00:00.000Z') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, role=EXCLUDED.role, avatar=EXCLUDED.avatar, bio=EXCLUDED.bio;

INSERT INTO follows (follower_id, following_id) VALUES ('demo_user', 'user_hoang') ON CONFLICT DO NOTHING;
INSERT INTO follows (follower_id, following_id) VALUES ('demo_user', 'user_linh') ON CONFLICT DO NOTHING;
INSERT INTO follows (follower_id, following_id) VALUES ('user_hoang', 'user_linh') ON CONFLICT DO NOTHING;
INSERT INTO follows (follower_id, following_id) VALUES ('user_linh', 'user_hoang') ON CONFLICT DO NOTHING;
INSERT INTO follows (follower_id, following_id) VALUES ('user_nam', 'user_hoang') ON CONFLICT DO NOTHING;

INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ('post_001', 'React 19 Ra Mắt: Những Tính Năng Đột Phá Lập Trình Viên Cần Nắm Rõ', 'react-19-ra-mat-nhung-tinh-nang-dot-pha', 'Khám phá React Compiler, Server Actions, useActionState, useOptimistic và việc loại bỏ forwardRef và memo truyền thống.', 'React 19 đã chính thức ra mắt mang lại những cải tiến mang tính cách mạng cho hệ sinh thái Frontend. 

### 1. React Compiler Tự Động Tối Ưu
Trước đây lập trình viên phải chủ động dùng useMemo, useCallback để tránh re-render thừa. Với React Compiler mới, việc memoize được biên dịch tự động ở build-time.

### 2. Actions & Hook useActionState
Actions cho phép bạn quản lý luồng gửi dữ liệu bất đồng bộ với trạng thái loading, lỗi và phản hồi tức thì mà không cần tự viết nhiều useState rời rạc.

### 3. Hỗ trợ Refs Dưới Dạng Props
Bạn không còn phải bọc component trong `forwardRef` nữa. Ref giờ đây chỉ là một prop bình thường được truyền thẳng vào Function Component!

```jsx
function MyInput({ placeholder, ref }) {
  return <input ref={ref} placeholder={placeholder} className="input" />;
}
```

Đây thực sự là bước chuyển mình lớn của React hướng tới trải nghiệm lập trình đơn giản và hiệu quả hơn.', NULL, 'Frontend', 'user_hoang', 1240, '5 phút đọc', 'approved', '2026-02-09T08:30:00.000Z') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;
INSERT INTO post_tags (post_id, tag) VALUES ('post_001', 'React') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_001', 'JavaScript') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_001', 'Frontend') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_001', 'demo_user') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_001', 'user_linh') ON CONFLICT DO NOTHING;
INSERT INTO post_bookmarks (post_id, user_id) VALUES ('post_001', 'demo_user') ON CONFLICT DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_avatar, content, created_at) VALUES ('cmt_001_1', 'post_001', 'demo_user', 'Người dùng Demo', 'https://api.dicebear.com/7.x/bottts/svg?seed=demouser', 'Bài viết rất chi tiết ạ, mình thích nhất tính năng bỏ forwardRef, code gọn hơn hẳn!', '2026-02-10T14:20:00.000Z') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content;

INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ('post_002', 'Xây Dựng Ứng Dụng RAG (Retrieval-Augmented Generation) Với Vector Database', 'xay-dung-ung-dung-rag-voi-vector-database', 'Hướng dẫn từng bước tích hợp LLM với kho tài liệu nội bộ qua Embedding và Vector Search như Qdrant, ChromaDB hoặc pgvector.', 'RAG đang là kiến trúc tiêu chuẩn để giải quyết bài toán LLM ''ảo tưởng'' (hallucination) và thiếu cập nhật tri thức chuyên ngành.

### Luồng Hoạt Động Của RAG:
1. **Document Ingestion**: Chia nhỏ tài liệu thành các chunks (200 - 500 tokens).
2. **Embedding**: Chuyển đổi văn bản thành vector nhúng đa chiều.
3. **Vector Storage**: Lưu vào cơ sở dữ liệu vector.
4. **Semantic Retrieval**: Khi người dùng đặt câu hỏi, tìm các đoạn văn bản tương đồng nhất.
5. **Generation**: Đưa ngữ cảnh tìm được vào prompt gửi cho LLM tổng hợp câu trả lời chính xác.

```python
# Ví dụ truy vấn tương đồng cosine
results = vector_db.search(
    collection_name="docs",
    query_vector=query_embedding,
    limit=3
)
```

Phương pháp này giúp ứng dụng AI trả lời chính xác dựa trên dữ liệu riêng mà không cần fine-tune mô hình tốn kém.', NULL, 'AI & LLM', 'user_linh', 980, '7 phút đọc', 'approved', '2026-02-11T10:00:00.000Z') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;
INSERT INTO post_tags (post_id, tag) VALUES ('post_002', 'AI & LLM') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_002', 'RAG') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_002', 'LLM') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_002', 'Python') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_002', 'demo_user') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_002', 'user_hoang') ON CONFLICT DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_avatar, content, created_at) VALUES ('cmt_002_1', 'post_002', 'user_hoang', 'Hoàng Minh', 'https://api.dicebear.com/7.x/bottts/svg?seed=hoang', 'pgvector trong PostgreSQL hiện tại dùng cho production cực kỳ ổn định!', '2026-02-12T09:15:00.000Z') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content;

INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ('post_003', 'FastAPI vs Go: Lựa Chọn Nào Cho Hệ Thống Microservices Tốc Độ Cao?', 'fastapi-vs-go-lua-chon-nao-cho-microservices', 'So sánh hiệu năng thực tế, tốc độ phát triển, memory footprint và hệ sinh thái thư viện giữa Python FastAPI và Golang.', 'Khi xây dựng Backend cho ứng dụng hiện đại, hai cái tên sáng giá thường được đưa lên bàn cân là FastAPI và Golang.

### FastAPI: Tốc độ phát triển thần tốc
- Syntax async/await hiện đại với Pydantic type checking.
- Tự động sinh Swagger OpenAPI docs.
- Cực kỳ mạnh mẽ cho các dịch vụ AI / Data processing.

### Go: Tối ưu tài nguyên tuyệt đối
- Tốc độ thực thi tiệm cận C/C++, Goroutines xử lý hàng trăm nghìn kết nối đồng thời với RAM cực thấp.
- Single binary file dễ dàng đóng gói Docker chỉ tầm 10-15MB.

### Kết Luận:
Nếu team mạnh về Python và làm việc nhiều với mô hình AI, FastAPI là lựa chọn tuyệt vời. Khi hệ thống cần chịu tải hàng trăm nghìn RPS với chi phí máy chủ tối thiểu, Go là người chiến thắng.', NULL, 'Backend', 'user_hoang', 850, '6 phút đọc', 'approved', '2026-02-14T07:45:00.000Z') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;
INSERT INTO post_tags (post_id, tag) VALUES ('post_003', 'Backend') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_003', 'FastAPI') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_003', 'Go') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_003', 'Microservices') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_003', 'demo_user') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_003', 'user_nam') ON CONFLICT DO NOTHING;

INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ('post_004', 'Tối Ưu Docker Image Cho Ứng Dụng Node.js Từ 1GB Xuống Còn Dưới 50MB', 'toi-uu-docker-image-cho-node-js', 'Kỹ thuật Multi-stage build, sử dụng distroless hoặc alpine, loại bỏ devDependencies và tận dụng Docker cache hiệu quả.', 'Một lỗi phổ biến của các bạn mới làm việc với Docker là copy toàn bộ mã nguồn và node_modules vào image dẫn đến image nặng hàng GB.

### 4 Bước Tinh Gọn Image:
1. **Dùng Multi-stage Build**: Tách riêng giai đoạn build (chứa dev tool) và giai đoạn chạy runtime.
2. **Chọn Base Image Nhẹ**: Dùng `node:alpine` hoặc Google Distroless thay vì bản full Ubuntu.
3. **Chỉ cài production dependencies**: Chạy `npm ci --only=production`.
4. **Không chạy dưới quyền root**: Thêm user unprivileged để bảo mật.

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
RUN npm ci --only=production
USER node
CMD ["node", "dist/main.js"]
```

Kết quả kích thước image giảm từ 1.1GB xuống chỉ còn 48MB, tốc độ deploy CI/CD nhanh gấp 10 lần!', NULL, 'DevOps', 'user_nam', 1120, '4 phút đọc', 'approved', '2026-02-16T13:20:00.000Z') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;
INSERT INTO post_tags (post_id, tag) VALUES ('post_004', 'DevOps') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_004', 'Docker') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_004', 'CI/CD') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_004', 'user_hoang') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_004', 'demo_user') ON CONFLICT DO NOTHING;
INSERT INTO post_bookmarks (post_id, user_id) VALUES ('post_004', 'demo_user') ON CONFLICT DO NOTHING;

INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ('post_005', 'Hiểu Sâu Về B-Tree Index Trong PostgreSQL Để Tối Ưu Truy Vấn Hàng Triệu Record', 'hieu-sau-ve-b-tree-index-trong-postgresql', 'Cách PostgreSQL duyệt cây B-Tree, sự khác nhau giữa Seq Scan và Index Scan, cùng những sai lầm khiến Index bị vô hiệu hóa.', 'Tại sao có đánh Index mà câu lệnh SQL vẫn chạy chậm? Hãy cùng phân tích cách hoạt động bên dưới của PostgreSQL Index.

### Cấu Trúc B-Tree
B-Tree (Balanced Tree) giữ cho dữ liệu luôn được sắp xếp theo thứ tự, giúp độ phức tạp tìm kiếm chỉ là O(log N).

### Những Sai Lầm Làm Vô Hiệu Hóa Index:
- Sử dụng hàm trên cột có đánh index (ví dụ: `WHERE LOWER(email) = ...`). Giải pháp: Dùng Expression Index `CREATE INDEX ON users (LOWER(email))`.
- Tìm kiếm wildcard bắt đầu bằng dấu `%`: `WHERE name LIKE ''%tech''`.
- Không cập nhật thống kê định kỳ (`ANALYZE`) khiến Query Planner chọn sai phương án.

Luôn dùng `EXPLAIN ANALYZE` trước khi đưa câu truy vấn phức tạp lên môi trường thực tế!', NULL, 'Database', 'user_hoang', 730, '6 phút đọc', 'approved', '2026-02-18T16:00:00.000Z') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;
INSERT INTO post_tags (post_id, tag) VALUES ('post_005', 'Database') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_005', 'PostgreSQL') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_005', 'System Design') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_005', 'user_nam') ON CONFLICT DO NOTHING;
INSERT INTO post_bookmarks (post_id, user_id) VALUES ('post_005', 'user_nam') ON CONFLICT DO NOTHING;

INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ('post_006', 'Chiến Lược Rate Limiting Hiệu Quả Với Redis Token Bucket Algorithm', 'chien-luoc-rate-limiting-hieu-qua-voi-redis', 'Bảo vệ hệ thống API trước tấn công DDoS và Spam bằng thuật toán Token Bucket kết hợp Redis Lua Script nguyên tử.', 'Rate Limiting là lớp bảo vệ thiết yếu ngăn chặn người dùng hoặc bot gửi request ồ ạt làm tê liệt API server.

### Thuật Toán Token Bucket
- Một ''thùng chứa'' (bucket) có dung lượng tối đa C tokens.
- Cứ sau mỗi chu kỳ thời gian, hệ thống tự động đổ thêm r tokens vào thùng.
- Mỗi request đến phải lấy 1 token. Nếu thùng rỗng, trả về HTTP 429 (Too Many Requests).

Dùng Redis Lua script giúp việc kiểm tra và trừ token diễn ra nguyên tử (atomic), không bị race condition trong môi trường phân tán.', NULL, 'System Design', 'user_nam', 640, '5 phút đọc', 'approved', '2026-02-20T08:15:00.000Z') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;
INSERT INTO post_tags (post_id, tag) VALUES ('post_006', 'System Design') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_006', 'Redis') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_006', 'Backend') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_006', 'demo_user') ON CONFLICT DO NOTHING;

INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ('post_007', 'Tailwind CSS v4 Có Gì Mới? Tối Ưu Build Nhanh Gấp 10 Lần Với Engine Oxide', 'tailwind-css-v4-co-gi-moi', 'Không còn file tailwind.config.js cồng kềnh, cấu hình trực tiếp trong CSS với @theme và kiến trúc Rust engine siêu tốc.', 'Tailwind CSS v4 là bản nâng cấp toàn diện viết lại hoàn toàn từ đầu bằng ngôn ngữ Rust.

### Điểm Mới Nổi Nổi Bật:
1. **Engine Oxide Siêu Tốc**: Tốc độ biên dịch CSS nhanh hơn từ 5 đến 10 lần so với v3.
2. **Cấu Hình Thuần CSS**: Toàn bộ biến theme, màu sắc và font được định nghĩa trực tiếp bằng cú pháp `@theme` trong CSS.
3. **Tích hợp DaisyUI 5**: Hỗ trợ các component có sẵn với các theme sáng/tối linh hoạt chỉ qua một dòng import.

Dự án hiện tại của chúng ta cũng đang ứng dụng Tailwind CSS v4 và DaisyUI 5 để đem lại trải nghiệm mượt mà nhất.', NULL, 'Frontend', 'demo_user', 920, '4 phút đọc', 'approved', '2026-02-22T11:30:00.000Z') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;
INSERT INTO post_tags (post_id, tag) VALUES ('post_007', 'Frontend') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_007', 'Tailwind') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_007', 'CSS') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_007', 'user_hoang') ON CONFLICT DO NOTHING;
INSERT INTO post_bookmarks (post_id, user_id) VALUES ('post_007', 'user_hoang') ON CONFLICT DO NOTHING;

INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ('post_008', 'Agentic AI Là Gì? Xu Hướng Lập Trình Tiếp Theo Sau Kỷ Nguyên Prompt Chating', 'agentic-ai-la-gi-xu-huong-lap-trinh-tiep-theo', 'Sự chuyển dịch từ AI trả lời thụ động sang AI tự động lập kế hoạch, gọi Tools, phản biện và hoàn thành tác vụ phức tạp.', 'Năm 2024 - 2026 đánh dấu bước ngoặt lớn từ Generative AI đơn thuần sang Agentic AI.

Một AI Agent không chỉ trả về đoạn văn bản, mà có khả năng:
- **Planning**: Tự phân tách bài toán lớn thành các bước thực thi.
- **Tool Calling**: Sử dụng terminal, đọc ghi file, gọi API bên thứ ba.
- **Memory & Reflection**: Ghi nhớ ngữ cảnh dài hạn và tự sửa lỗi khi gặp vấn đề.

Lập trình viên biết cách kết hợp kỹ năng phần mềm truyền thống với AI Agents sẽ nâng cao năng suất gấp nhiều lần.', NULL, 'AI & LLM', 'user_linh', 1450, '5 phút đọc', 'approved', '2026-02-25T09:00:00.000Z') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;
INSERT INTO post_tags (post_id, tag) VALUES ('post_008', 'AI & LLM') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_008', 'LLM') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_008', 'Career') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_008', 'demo_user') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_008', 'user_hoang') ON CONFLICT DO NOTHING;
INSERT INTO post_bookmarks (post_id, user_id) VALUES ('post_008', 'demo_user') ON CONFLICT DO NOTHING;

INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ('post_009', 'Kinh Nghiệm Phỏng Vấn Kỹ Thuật (Live Coding & System Design) Cho Lập Trình Viên', 'kinh-nghiem-phong-van-ky-thuat', 'Tổng hợp các mẹo chuẩn bị portfolio, cách tư duy to miệng khi giải thuật LeetCode và cấu trúc trả lời phỏng vấn hành vi STAR.', 'Vượt qua vòng phỏng vấn kỹ thuật không chỉ dựa vào việc bạn viết code giỏi mà còn phụ thuộc lớn vào kỹ năng giao tiếp và làm rõ yêu cầu.

### 3 Nguyên Tắc Vàng Khi Live Coding:
1. **Làm rõ yêu cầu trước khi gõ phím**: Đừng vội viết code ngay, hãy hỏi về edge cases, giới hạn dữ liệu đầu vào.
2. **Think out loud**: Vừa nghĩ vừa nói cho người phỏng vấn hiểu hướng tiếp cận của bạn.
3. **Bắt đầu từ giải pháp thô (Brute-force) rồi tối ưu dần**: Đừng cố tìm giải pháp hoàn hảo ngay từ giây đầu tiên.

Hãy chuẩn bị đồ án môn học thật chỉn chu để tự tin chia sẻ những khó khăn kỹ thuật bạn đã giải quyết!', NULL, 'Career', 'user_hoang', 1680, '6 phút đọc', 'approved', '2026-02-26T08:00:00.000Z') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;
INSERT INTO post_tags (post_id, tag) VALUES ('post_009', 'Career') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_009', 'Interview') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_009', 'demo_user') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_009', 'user_linh') ON CONFLICT DO NOTHING;
INSERT INTO post_likes (post_id, user_id) VALUES ('post_009', 'user_nam') ON CONFLICT DO NOTHING;
INSERT INTO post_bookmarks (post_id, user_id) VALUES ('post_009', 'demo_user') ON CONFLICT DO NOTHING;
INSERT INTO comments (id, post_id, user_id, user_name, user_avatar, content, created_at) VALUES ('cmt_009_1', 'post_009', 'demo_user', 'Người dùng Demo', 'https://api.dicebear.com/7.x/bottts/svg?seed=demouser', 'Bài chia sẻ cực kỳ thực tế và hữu ích, cảm ơn tác giả!', '2026-02-26T10:00:00.000Z') ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content;

INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ('post_010', 'Kiến Trúc Microservices Với Go và gRPC: Từ Thiết Kế Đến Triển Khai', 'kien-truc-microservices-voi-go-va-grpc', 'Hướng dẫn xây dựng các dịch vụ độc lập giao tiếp hiệu năng cao qua Protocol Buffers và gRPC trong môi trường production.', 'Trong kiến trúc microservices hiện đại, việc tối ưu hóa giao tiếp giữa các service là yếu tố quyết định độ trễ của toàn hệ thống.

### 1. Tại sao lại là gRPC thay vì REST?
- Sử dụng nhị phân HTTP/2 và Protobuf giúp payload nhỏ hơn gấp 3-5 lần JSON.
- Hỗ trợ full-duplex streaming mạnh mẽ.
- Tự động sinh mã nguồn client/server đa ngôn ngữ.

Bài viết này đi sâu vào cách viết Proto file, khởi tạo gRPC server với Go và triển khai Load Balancing.', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80', 'Backend', 'user_nam', 120, '7 phút đọc', 'pending', '2026-03-01T09:00:00.000Z') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;
INSERT INTO post_tags (post_id, tag) VALUES ('post_010', 'Go') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_010', 'Microservices') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_010', 'gRPC') ON CONFLICT DO NOTHING;

INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ('post_011', 'Tối Ưu Truy Vấn Cơ Sở Dữ Liệu PostgreSQL Với Phân Trang Keyset Cursor', 'toi-uu-truy-van-postgresql-voi-phan-trang-keyset-cursor', 'Tại sao OFFSET và LIMIT lại làm chậm database khi dữ liệu lớn hàng triệu dòng? Phân tích giải pháp Cursor-based Pagination.', 'Khi ứng dụng tăng trưởng về quy mô dữ liệu, kỹ thuật phân trang truyền thống sử dụng OFFSET bắt đầu bộc lộ nhược điểm nghiêm trọng.

Database buộc phải quét và bỏ qua hàng triệu dòng trước khi trả kết quả. Bằng cách sử dụng Keyset Cursor dựa trên khóa chính hoặc mốc thời gian index, truy vấn luôn đạt thời gian O(1) bất kể trang thứ bao nhiêu!', 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&auto=format&fit=crop&q=80', 'Database', 'user_linh', 85, '5 phút đọc', 'pending', '2026-03-02T10:30:00.000Z') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;
INSERT INTO post_tags (post_id, tag) VALUES ('post_011', 'Database') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_011', 'PostgreSQL') ON CONFLICT DO NOTHING;
INSERT INTO post_tags (post_id, tag) VALUES ('post_011', 'SQL') ON CONFLICT DO NOTHING;

INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ('post_012', 'Thủ Thuật Bẻ Khóa Phần Mềm & Vượt Tường Lửa Không Rõ Nguồn Gốc', 'thu-thuat-be-khoa-phan-mem-vuot-tuong-lua', 'Nội dung vi phạm quy chuẩn cộng đồng, đã bị bộ phận kiểm duyệt từ chối xuất bản.', 'Bài viết này bị từ chối xuất bản vì không tuân thủ chính sách bảo mật, đạo đức nghề nghiệp và quy chuẩn nội dung kỹ thuật của diễn đàn IT Blog.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80', 'System Design', 'user_hoang', 10, '2 phút đọc', 'rejected', '2026-02-28T14:00:00.000Z') ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;
INSERT INTO post_tags (post_id, tag) VALUES ('post_012', 'Security') ON CONFLICT DO NOTHING;
