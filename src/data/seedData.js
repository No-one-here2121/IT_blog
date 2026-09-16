/**
 * Dữ liệu mẫu ban đầu (Seed Data) cho hệ thống IT Blog
 * (Tất cả người dùng đều là thành viên bình đẳng, chưa phân quyền tác nhân)
 */

export const SEED_USERS = [
  {
    id: "demo_user",
    name: "Người dùng Demo",
    email: "demo@itblog.local",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=demouser",
    bio: "Tài khoản dùng thử để trải nghiệm tính năng trên IT Blog",
    following: ["user_hoang", "user_linh"],
    createdAt: "2026-02-01T08:00:00.000Z"
  },
  {
    id: "user_hoang",
    name: "Hoàng Minh",
    email: "hoang@itblog.local",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=hoang",
    bio: "Lập trình viên Web | Đam mê React 19, Go & System Design",
    following: ["user_linh"],
    createdAt: "2026-01-10T10:00:00.000Z"
  },
  {
    id: "user_linh",
    name: "Linh Nguyễn",
    email: "linh@itblog.local",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=linh",
    bio: "Kỹ sư Trí tuệ nhân tạo | Nghiên cứu LLMs và RAG",
    following: ["user_hoang"],
    createdAt: "2026-01-12T11:00:00.000Z"
  },
  {
    id: "user_nam",
    name: "Nam Trần",
    email: "nam@itblog.local",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=nam",
    bio: "Kỹ sư DevOps & Cloud | Docker, CI/CD Pipelines",
    following: ["user_hoang"],
    createdAt: "2026-01-20T14:00:00.000Z"
  }
];

export const CATEGORIES = [
  "Tất cả",
  "Frontend",
  "Backend",
  "AI & LLM",
  "DevOps",
  "Database",
  "System Design",
  "Career"
];

export const POPULAR_TAGS = [
  "React",
  "Tailwind",
  "FastAPI",
  "Go",
  "Docker",
  "Kubernetes",
  "PostgreSQL",
  "Redis",
  "RAG",
  "LLM",
  "Microservices",
  "TypeScript"
];

export const SEED_POSTS = [
  {
    id: "post_001",
    title: "React 19 Ra Mắt: Những Tính Năng Đột Phá Lập Trình Viên Cần Nắm Rõ",
    slug: "react-19-ra-mat-nhung-tinh-nang-dot-pha",
    excerpt: "Khám phá React Compiler, Server Actions, useActionState, useOptimistic và việc loại bỏ forwardRef và memo truyền thống.",
    content: `React 19 đã chính thức ra mắt mang lại những cải tiến mang tính cách mạng cho hệ sinh thái Frontend. 

### 1. React Compiler Tự Động Tối Ưu
Trước đây lập trình viên phải chủ động dùng useMemo, useCallback để tránh re-render thừa. Với React Compiler mới, việc memoize được biên dịch tự động ở build-time.

### 2. Actions & Hook useActionState
Actions cho phép bạn quản lý luồng gửi dữ liệu bất đồng bộ với trạng thái loading, lỗi và phản hồi tức thì mà không cần tự viết nhiều useState rời rạc.

### 3. Hỗ trợ Refs Dưới Dạng Props
Bạn không còn phải bọc component trong \`forwardRef\` nữa. Ref giờ đây chỉ là một prop bình thường được truyền thẳng vào Function Component!

\`\`\`jsx
function MyInput({ placeholder, ref }) {
  return <input ref={ref} placeholder={placeholder} className="input" />;
}
\`\`\`

Đây thực sự là bước chuyển mình lớn của React hướng tới trải nghiệm lập trình đơn giản và hiệu quả hơn.`,
    category: "Frontend",
    tags: ["React", "JavaScript", "Frontend"],
    authorId: "user_hoang",
    likes: ["demo_user", "user_linh"],
    bookmarks: ["demo_user"],
    comments: [
      {
        id: "cmt_001_1",
        userId: "demo_user",
        userName: "Người dùng Demo",
        userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=demouser",
        content: "Bài viết rất chi tiết ạ, mình thích nhất tính năng bỏ forwardRef, code gọn hơn hẳn!",
        createdAt: "2026-02-10T14:20:00.000Z"
      }
    ],
    views: 1240,
    readTime: "5 phút đọc",
    createdAt: "2026-02-09T08:30:00.000Z"
  },
  {
    id: "post_002",
    title: "Xây Dựng Ứng Dụng RAG (Retrieval-Augmented Generation) Với Vector Database",
    slug: "xay-dung-ung-dung-rag-voi-vector-database",
    excerpt: "Hướng dẫn từng bước tích hợp LLM với kho tài liệu nội bộ qua Embedding và Vector Search như Qdrant, ChromaDB hoặc pgvector.",
    content: `RAG đang là kiến trúc tiêu chuẩn để giải quyết bài toán LLM 'ảo tưởng' (hallucination) và thiếu cập nhật tri thức chuyên ngành.

### Luồng Hoạt Động Của RAG:
1. **Document Ingestion**: Chia nhỏ tài liệu thành các chunks (200 - 500 tokens).
2. **Embedding**: Chuyển đổi văn bản thành vector nhúng đa chiều.
3. **Vector Storage**: Lưu vào cơ sở dữ liệu vector.
4. **Semantic Retrieval**: Khi người dùng đặt câu hỏi, tìm các đoạn văn bản tương đồng nhất.
5. **Generation**: Đưa ngữ cảnh tìm được vào prompt gửi cho LLM tổng hợp câu trả lời chính xác.

\`\`\`python
# Ví dụ truy vấn tương đồng cosine
results = vector_db.search(
    collection_name="docs",
    query_vector=query_embedding,
    limit=3
)
\`\`\`

Phương pháp này giúp ứng dụng AI trả lời chính xác dựa trên dữ liệu riêng mà không cần fine-tune mô hình tốn kém.`,
    category: "AI & LLM",
    tags: ["AI & LLM", "RAG", "LLM", "Python"],
    authorId: "user_linh",
    likes: ["demo_user", "user_hoang"],
    bookmarks: [],
    comments: [
      {
        id: "cmt_002_1",
        userId: "user_hoang",
        userName: "Hoàng Minh",
        userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=hoang",
        content: "pgvector trong PostgreSQL hiện tại dùng cho production cực kỳ ổn định!",
        createdAt: "2026-02-12T09:15:00.000Z"
      }
    ],
    views: 980,
    readTime: "7 phút đọc",
    createdAt: "2026-02-11T10:00:00.000Z"
  },
  {
    id: "post_003",
    title: "FastAPI vs Go: Lựa Chọn Nào Cho Hệ Thống Microservices Tốc Độ Cao?",
    slug: "fastapi-vs-go-lua-chon-nao-cho-microservices",
    excerpt: "So sánh hiệu năng thực tế, tốc độ phát triển, memory footprint và hệ sinh thái thư viện giữa Python FastAPI và Golang.",
    content: `Khi xây dựng Backend cho ứng dụng hiện đại, hai cái tên sáng giá thường được đưa lên bàn cân là FastAPI và Golang.

### FastAPI: Tốc độ phát triển thần tốc
- Syntax async/await hiện đại với Pydantic type checking.
- Tự động sinh Swagger OpenAPI docs.
- Cực kỳ mạnh mẽ cho các dịch vụ AI / Data processing.

### Go: Tối ưu tài nguyên tuyệt đối
- Tốc độ thực thi tiệm cận C/C++, Goroutines xử lý hàng trăm nghìn kết nối đồng thời với RAM cực thấp.
- Single binary file dễ dàng đóng gói Docker chỉ tầm 10-15MB.

### Kết Luận:
Nếu team mạnh về Python và làm việc nhiều với mô hình AI, FastAPI là lựa chọn tuyệt vời. Khi hệ thống cần chịu tải hàng trăm nghìn RPS với chi phí máy chủ tối thiểu, Go là người chiến thắng.`,
    category: "Backend",
    tags: ["Backend", "FastAPI", "Go", "Microservices"],
    authorId: "user_hoang",
    likes: ["demo_user", "user_nam"],
    bookmarks: [],
    comments: [],
    views: 850,
    readTime: "6 phút đọc",
    createdAt: "2026-02-14T07:45:00.000Z"
  },
  {
    id: "post_004",
    title: "Tối Ưu Docker Image Cho Ứng Dụng Node.js Từ 1GB Xuống Còn Dưới 50MB",
    slug: "toi-uu-docker-image-cho-node-js",
    excerpt: "Kỹ thuật Multi-stage build, sử dụng distroless hoặc alpine, loại bỏ devDependencies và tận dụng Docker cache hiệu quả.",
    content: `Một lỗi phổ biến của các bạn mới làm việc với Docker là copy toàn bộ mã nguồn và node_modules vào image dẫn đến image nặng hàng GB.

### 4 Bước Tinh Gọn Image:
1. **Dùng Multi-stage Build**: Tách riêng giai đoạn build (chứa dev tool) và giai đoạn chạy runtime.
2. **Chọn Base Image Nhẹ**: Dùng \`node:alpine\` hoặc Google Distroless thay vì bản full Ubuntu.
3. **Chỉ cài production dependencies**: Chạy \`npm ci --only=production\`.
4. **Không chạy dưới quyền root**: Thêm user unprivileged để bảo mật.

\`\`\`dockerfile
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
\`\`\`

Kết quả kích thước image giảm từ 1.1GB xuống chỉ còn 48MB, tốc độ deploy CI/CD nhanh gấp 10 lần!`,
    category: "DevOps",
    tags: ["DevOps", "Docker", "CI/CD"],
    authorId: "user_nam",
    likes: ["user_hoang", "demo_user"],
    bookmarks: ["demo_user"],
    comments: [],
    views: 1120,
    readTime: "4 phút đọc",
    createdAt: "2026-02-16T13:20:00.000Z"
  },
  {
    id: "post_005",
    title: "Hiểu Sâu Về B-Tree Index Trong PostgreSQL Để Tối Ưu Truy Vấn Hàng Triệu Record",
    slug: "hieu-sau-ve-b-tree-index-trong-postgresql",
    excerpt: "Cách PostgreSQL duyệt cây B-Tree, sự khác nhau giữa Seq Scan và Index Scan, cùng những sai lầm khiến Index bị vô hiệu hóa.",
    content: `Tại sao có đánh Index mà câu lệnh SQL vẫn chạy chậm? Hãy cùng phân tích cách hoạt động bên dưới của PostgreSQL Index.

### Cấu Trúc B-Tree
B-Tree (Balanced Tree) giữ cho dữ liệu luôn được sắp xếp theo thứ tự, giúp độ phức tạp tìm kiếm chỉ là O(log N).

### Những Sai Lầm Làm Vô Hiệu Hóa Index:
- Sử dụng hàm trên cột có đánh index (ví dụ: \`WHERE LOWER(email) = ...\`). Giải pháp: Dùng Expression Index \`CREATE INDEX ON users (LOWER(email))\`.
- Tìm kiếm wildcard bắt đầu bằng dấu \`%\`: \`WHERE name LIKE '%tech'\`.
- Không cập nhật thống kê định kỳ (\`ANALYZE\`) khiến Query Planner chọn sai phương án.

Luôn dùng \`EXPLAIN ANALYZE\` trước khi đưa câu truy vấn phức tạp lên môi trường thực tế!`,
    category: "Database",
    tags: ["Database", "PostgreSQL", "System Design"],
    authorId: "user_hoang",
    likes: ["user_nam"],
    bookmarks: ["user_nam"],
    comments: [],
    views: 730,
    readTime: "6 phút đọc",
    createdAt: "2026-02-18T16:00:00.000Z"
  },
  {
    id: "post_006",
    title: "Chiến Lược Rate Limiting Hiệu Quả Với Redis Token Bucket Algorithm",
    slug: "chien-luoc-rate-limiting-hieu-qua-voi-redis",
    excerpt: "Bảo vệ hệ thống API trước tấn công DDoS và Spam bằng thuật toán Token Bucket kết hợp Redis Lua Script nguyên tử.",
    content: `Rate Limiting là lớp bảo vệ thiết yếu ngăn chặn người dùng hoặc bot gửi request ồ ạt làm tê liệt API server.

### Thuật Toán Token Bucket
- Một 'thùng chứa' (bucket) có dung lượng tối đa C tokens.
- Cứ sau mỗi chu kỳ thời gian, hệ thống tự động đổ thêm r tokens vào thùng.
- Mỗi request đến phải lấy 1 token. Nếu thùng rỗng, trả về HTTP 429 (Too Many Requests).

Dùng Redis Lua script giúp việc kiểm tra và trừ token diễn ra nguyên tử (atomic), không bị race condition trong môi trường phân tán.`,
    category: "System Design",
    tags: ["System Design", "Redis", "Backend"],
    authorId: "user_nam",
    likes: ["demo_user"],
    bookmarks: [],
    comments: [],
    views: 640,
    readTime: "5 phút đọc",
    createdAt: "2026-02-20T08:15:00.000Z"
  },
  {
    id: "post_007",
    title: "Tailwind CSS v4 Có Gì Mới? Tối Ưu Build Nhanh Gấp 10 Lần Với Engine Oxide",
    slug: "tailwind-css-v4-co-gi-moi",
    excerpt: "Không còn file tailwind.config.js cồng kềnh, cấu hình trực tiếp trong CSS với @theme và kiến trúc Rust engine siêu tốc.",
    content: `Tailwind CSS v4 là bản nâng cấp toàn diện viết lại hoàn toàn từ đầu bằng ngôn ngữ Rust.

### Điểm Mới Nổi Nổi Bật:
1. **Engine Oxide Siêu Tốc**: Tốc độ biên dịch CSS nhanh hơn từ 5 đến 10 lần so với v3.
2. **Cấu Hình Thuần CSS**: Toàn bộ biến theme, màu sắc và font được định nghĩa trực tiếp bằng cú pháp \`@theme\` trong CSS.
3. **Tích hợp DaisyUI 5**: Hỗ trợ các component có sẵn với các theme sáng/tối linh hoạt chỉ qua một dòng import.

Dự án hiện tại của chúng ta cũng đang ứng dụng Tailwind CSS v4 và DaisyUI 5 để đem lại trải nghiệm mượt mà nhất.`,
    category: "Frontend",
    tags: ["Frontend", "Tailwind", "CSS"],
    authorId: "demo_user",
    likes: ["user_hoang"],
    bookmarks: ["user_hoang"],
    comments: [],
    views: 920,
    readTime: "4 phút đọc",
    createdAt: "2026-02-22T11:30:00.000Z"
  },
  {
    id: "post_008",
    title: "Agentic AI Là Gì? Xu Hướng Lập Trình Tiếp Theo Sau Kỷ Nguyên Prompt Chating",
    slug: "agentic-ai-la-gi-xu-huong-lap-trinh-tiep-theo",
    excerpt: "Sự chuyển dịch từ AI trả lời thụ động sang AI tự động lập kế hoạch, gọi Tools, phản biện và hoàn thành tác vụ phức tạp.",
    content: `Năm 2024 - 2026 đánh dấu bước ngoặt lớn từ Generative AI đơn thuần sang Agentic AI.

Một AI Agent không chỉ trả về đoạn văn bản, mà có khả năng:
- **Planning**: Tự phân tách bài toán lớn thành các bước thực thi.
- **Tool Calling**: Sử dụng terminal, đọc ghi file, gọi API bên thứ ba.
- **Memory & Reflection**: Ghi nhớ ngữ cảnh dài hạn và tự sửa lỗi khi gặp vấn đề.

Lập trình viên biết cách kết hợp kỹ năng phần mềm truyền thống với AI Agents sẽ nâng cao năng suất gấp nhiều lần.`,
    category: "AI & LLM",
    tags: ["AI & LLM", "LLM", "Career"],
    authorId: "user_linh",
    likes: ["demo_user", "user_hoang"],
    bookmarks: ["demo_user"],
    comments: [],
    views: 1450,
    readTime: "5 phút đọc",
    createdAt: "2026-02-25T09:00:00.000Z"
  },
  {
    id: "post_009",
    title: "Kinh Nghiệm Phỏng Vấn Kỹ Thuật (Live Coding & System Design) Cho Lập Trình Viên",
    slug: "kinh-nghiem-phong-van-ky-thuat",
    excerpt: "Tổng hợp các mẹo chuẩn bị portfolio, cách tư duy to miệng khi giải thuật LeetCode và cấu trúc trả lời phỏng vấn hành vi STAR.",
    content: `Vượt qua vòng phỏng vấn kỹ thuật không chỉ dựa vào việc bạn viết code giỏi mà còn phụ thuộc lớn vào kỹ năng giao tiếp và làm rõ yêu cầu.

### 3 Nguyên Tắc Vàng Khi Live Coding:
1. **Làm rõ yêu cầu trước khi gõ phím**: Đừng vội viết code ngay, hãy hỏi về edge cases, giới hạn dữ liệu đầu vào.
2. **Think out loud**: Vừa nghĩ vừa nói cho người phỏng vấn hiểu hướng tiếp cận của bạn.
3. **Bắt đầu từ giải pháp thô (Brute-force) rồi tối ưu dần**: Đừng cố tìm giải pháp hoàn hảo ngay từ giây đầu tiên.

Hãy chuẩn bị đồ án môn học thật chỉn chu để tự tin chia sẻ những khó khăn kỹ thuật bạn đã giải quyết!`,
    category: "Career",
    tags: ["Career", "Interview"],
    authorId: "user_hoang",
    likes: ["demo_user", "user_linh", "user_nam"],
    bookmarks: ["demo_user"],
    comments: [
      {
        id: "cmt_009_1",
        userId: "demo_user",
        userName: "Người dùng Demo",
        userAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=demouser",
        content: "Bài chia sẻ cực kỳ thực tế và hữu ích, cảm ơn tác giả!",
        createdAt: "2026-02-26T10:00:00.000Z"
      }
    ],
    views: 1680,
    readTime: "6 phút đọc",
    createdAt: "2026-02-26T08:00:00.000Z"
  },
  {
    id: "post_010",
    title: "Kiến Trúc Microservices Với Go và gRPC: Từ Thiết Kế Đến Triển Khai",
    slug: "kien-truc-microservices-voi-go-va-grpc",
    excerpt: "Hướng dẫn xây dựng các dịch vụ độc lập giao tiếp hiệu năng cao qua Protocol Buffers và gRPC trong môi trường production.",
    content: `Trong kiến trúc microservices hiện đại, việc tối ưu hóa giao tiếp giữa các service là yếu tố quyết định độ trễ của toàn hệ thống.

### 1. Tại sao lại là gRPC thay vì REST?
- Sử dụng nhị phân HTTP/2 và Protobuf giúp payload nhỏ hơn gấp 3-5 lần JSON.
- Hỗ trợ full-duplex streaming mạnh mẽ.
- Tự động sinh mã nguồn client/server đa ngôn ngữ.

Bài viết này đi sâu vào cách viết Proto file, khởi tạo gRPC server với Go và triển khai Load Balancing.`,
    coverImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80",
    category: "Backend",
    tags: ["Go", "Microservices", "gRPC"],
    authorId: "user_nam",
    likes: [],
    bookmarks: [],
    comments: [],
    views: 120,
    readTime: "7 phút đọc",
    status: "pending",
    createdAt: "2026-03-01T09:00:00.000Z"
  },
  {
    id: "post_011",
    title: "Tối Ưu Truy Vấn Cơ Sở Dữ Liệu PostgreSQL Với Phân Trang Keyset Cursor",
    slug: "toi-uu-truy-van-postgresql-voi-phan-trang-keyset-cursor",
    excerpt: "Tại sao OFFSET và LIMIT lại làm chậm database khi dữ liệu lớn hàng triệu dòng? Phân tích giải pháp Cursor-based Pagination.",
    content: `Khi ứng dụng tăng trưởng về quy mô dữ liệu, kỹ thuật phân trang truyền thống sử dụng OFFSET bắt đầu bộc lộ nhược điểm nghiêm trọng.

Database buộc phải quét và bỏ qua hàng triệu dòng trước khi trả kết quả. Bằng cách sử dụng Keyset Cursor dựa trên khóa chính hoặc mốc thời gian index, truy vấn luôn đạt thời gian O(1) bất kể trang thứ bao nhiêu!`,
    coverImage: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&auto=format&fit=crop&q=80",
    category: "Database",
    tags: ["Database", "PostgreSQL", "SQL"],
    authorId: "user_linh",
    likes: [],
    bookmarks: [],
    comments: [],
    views: 85,
    readTime: "5 phút đọc",
    status: "pending",
    createdAt: "2026-03-02T10:30:00.000Z"
  },
  {
    id: "post_012",
    title: "Thủ Thuật Bẻ Khóa Phần Mềm & Vượt Tường Lửa Không Rõ Nguồn Gốc",
    slug: "thu-thuat-be-khoa-phan-mem-vuot-tuong-lua",
    excerpt: "Nội dung vi phạm quy chuẩn cộng đồng, đã bị bộ phận kiểm duyệt từ chối xuất bản.",
    content: `Bài viết này bị từ chối xuất bản vì không tuân thủ chính sách bảo mật, đạo đức nghề nghiệp và quy chuẩn nội dung kỹ thuật của diễn đàn IT Blog.`,
    coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
    category: "System Design",
    tags: ["Security"],
    authorId: "user_hoang",
    likes: [],
    bookmarks: [],
    comments: [],
    views: 10,
    readTime: "2 phút đọc",
    status: "rejected",
    createdAt: "2026-02-28T14:00:00.000Z"
  }
];
