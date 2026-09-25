# -*- coding: utf-8 -*-
import os
import sys
import json

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models.quiz import QuizQuestion

TOPICS_LIST = [
    {
        "id": "all",
        "title": "Tất cả Chuyên đề",
        "icon": "🌐",
        "badge": "Tổng hợp",
        "description": "Luyện tập ngẫu nhiên từ toàn bộ kho câu hỏi công nghệ chuẩn hóa."
    },
    {
        "id": "React",
        "title": "React 19 & Frontend",
        "icon": "⚛️",
        "badge": "Frontend",
        "description": "Hooks, Server Actions, useActionState, Suspense, Fiber và React Compiler."
    },
    {
        "id": "FastAPI",
        "title": "FastAPI & Backend",
        "icon": "⚡",
        "badge": "Backend",
        "description": "Async def, Pydantic V2, Dependency Injection, Lifespan và CORS."
    },
    {
        "id": "PostgreSQL",
        "title": "PostgreSQL & Database",
        "icon": "🐘",
        "badge": "Database",
        "description": "Connection Pooling, GIN Index, EXPLAIN ANALYZE, MVCC và Partitioning."
    },
    {
        "id": "DevOps",
        "title": "DevOps, Docker & K8s",
        "icon": "🐳",
        "badge": "DevOps",
        "description": "Multi-stage builds, Kubernetes Pods/Probes, CI/CD và Reverse Proxy."
    },
    {
        "id": "Python",
        "title": "Python Core & Async",
        "icon": "🐍",
        "badge": "Language",
        "description": "Asyncio TaskGroup, Faster CPython 3.11+, Generators, GIL và Metaclasses."
    },
    {
        "id": "Security",
        "title": "Bảo mật Web & Ứng dụng",
        "icon": "🛡️",
        "badge": "Security",
        "description": "OWASP Top 10, SQL Injection, XSS, CSRF, JWT và Password Hashing."
    },
    {
        "id": "Architecture",
        "title": "Kiến trúc Hệ thống",
        "icon": "🏗️",
        "badge": "System Design",
        "description": "Microservices, Saga Pattern, Caching Redis, Kafka vs RabbitMQ và CAP."
    },
    {
        "id": "Fullstack",
        "title": "Fullstack Engineering",
        "icon": "💻",
        "badge": "Software Eng",
        "description": "gRPC vs REST, HTTP/2 & 3, SSE, SOLID, Clean Architecture và SemVer."
    }
]

print("Seeder template ready")

QUESTIONS_DATA = [
    # --- 1. REACT 19 (11 câu) ---
    {
        "language": "React",
        "question": "Trong React 19, cú pháp để truyền và nhận ref trong một function component đã được đơn giản hóa như thế nào?",
        "options": [
            "Bắt buộc phải bọc component trong forwardRef()",
            "ref có thể được nhận trực tiếp dưới dạng một prop thông thường",
            "Phải sử dụng hook useRef() từ component cha",
            "Chỉ có thể dùng ref trong Class Component"
        ],
        "answer_index": 1,
        "explanation": "React 19 đã loại bỏ sự cần thiết của forwardRef(). Function component giờ đây có thể nhận trực tiếp prop ref như mọi prop thông thường khác.",
        "difficulty": "easy"
    },
    {
        "language": "React",
        "question": "Hook useActionState trong React 19 cung cấp giải pháp cho vấn đề gì khi xử lý biểu mẫu (forms)?",
        "options": [
            "Tự động đồng bộ hóa biểu mẫu với LocalStorage",
            "Tự động quản lý pending state, giá trị trả về và lỗi của form action bất đồng bộ",
            "Thay thế hoàn toàn cho thư viện React Hook Form",
            "Chỉ dùng để validate định dạng email và mật khẩu"
        ],
        "answer_index": 1,
        "explanation": "Hook useActionState nhận vào một action bất đồng bộ và trả về [state, formAction, isPending], tự động theo dõi trạng thái loading và kết quả xử lý.",
        "difficulty": "medium"
    },
    {
        "language": "React",
        "question": "Hook useOptimistic trong React 19 thường được sử dụng nhằm mục đích gì trong giao diện người dùng?",
        "options": [
            "Tối ưu kích thước bundle JavaScript khi build",
            "Cập nhật giao diện ngay lập tức trước khi server phản hồi để tăng trải nghiệm người dùng mượt mà",
            "Tự động phân bổ lại bộ nhớ heap của trình duyệt",
            "Tránh re-render các component con không cần thiết"
        ],
        "answer_index": 1,
        "explanation": "useOptimistic cho phép hiển thị trạng thái giao diện dự đoán (optimistic UI) trong khi một hành động bất đồng bộ đang diễn ra trên máy chủ, và tự động hoàn tác nếu thao tác thất bại.",
        "difficulty": "medium"
    },
    {
        "language": "React",
        "question": "Trong kiến trúc React Server Components (RSC), điều gì là ĐÚNG về Server Components?",
        "options": [
            "Có thể sử dụng các hook như useState, useEffect và sự kiện onClick",
            "Mã nguồn của Server Component không bị đóng gói vào client bundle, giúp giảm đáng kể kích thước JavaScript tải về trình duyệt",
            "Chỉ chạy được trên server Node.js, không chạy được trên Edge Runtime",
            "Không thể import hoặc render Client Components"
        ],
        "answer_index": 1,
        "explanation": "Server Components chạy hoàn toàn trên server và chỉ gửi kết quả JSON/HTML về client, giúp zero-bundle-size cho client và có thể truy cập trực tiếp vào database hoặc filesystem.",
        "difficulty": "hard"
    },
    {
        "language": "React",
        "question": "Cơ chế React Fiber mang lại lợi thế cốt lõi nào cho React so với thuật toán Virtual DOM nguyên bản (Stack Reconciler)?",
        "options": [
            "Khả năng chia nhỏ công việc rendering thành các đơn vị nhỏ (incremental rendering) và tạm dừng/ưu tiên tác vụ",
            "Tự động biên dịch mã JSX sang WebAssembly",
            "Không cần sử dụng DOM ảo nữa mà thao tác trực tiếp trên DOM thật",
            "Bắt buộc mọi component phải chạy song song trên Web Workers"
        ],
        "answer_index": 0,
        "explanation": "React Fiber là một cấu trúc dữ liệu dạng cây liên kết đơn cho phép React chia nhỏ quá trình render thành nhiều frame, có thể tạm hoãn, hủy hoặc ưu tiên các tác vụ có độ ưu tiên cao như gõ phím hay animation.",
        "difficulty": "hard"
    },
    {
        "language": "React",
        "question": "Khi thực hiện gọi API trong useEffect, cách tốt nhất để xử lý hiện tượng race condition khi component re-render hoặc unmount là gì?",
        "options": [
            "Sử dụng setTimeout để hoãn gọi API",
            "Sử dụng AbortController trong hàm cleanup để hủy request đang chờ xử lý",
            "Dùng async/await trực tiếp trong callback của useEffect",
            "Bắt buộc lưu response vào biến global"
        ],
        "answer_index": 1,
        "explanation": "Bằng cách tạo một thể hiện AbortController và gọi controller.abort() trong hàm cleanup của useEffect, request HTTP cũ sẽ bị hủy nếu component re-render hoặc unmount, tránh ghi đè dữ liệu sai lệch.",
        "difficulty": "medium"
    },
    {
        "language": "React",
        "question": "Khi nào bạn NÊN sử dụng useMemo hoặc useCallback trong React?",
        "options": [
            "Bọc tất cả các hàm và biểu thức tính toán trong toàn bộ ứng dụng",
            "Chỉ khi thực hiện phép tính thực sự tốn kém tài nguyên hoặc truyền hàm/đối tượng làm prop xuống component con đã được bọc bằng React.memo",
            "Chỉ trong Class Component",
            "Bắt buộc dùng trước mọi lệnh console.log"
        ],
        "answer_index": 1,
        "explanation": "useMemo và useCallback có chi phí khởi tạo và kiểm tra dependency. Chỉ nên dùng khi phép tính nặng hoặc cần bảo toàn tham chiếu (referential equality) để tránh re-render component con đã memoized.",
        "difficulty": "easy"
    },
    {
        "language": "React",
        "question": "Trong Zustand, cú pháp nào sau đây là cách tạo một store đơn giản và chuẩn xác nhất?",
        "options": [
            "const useStore = create((set) => ({ count: 0, inc: () => set((state) => ({ count: state.count + 1 })) }))",
            "const store = new ZustandStore({ count: 0 })",
            "const useStore = createContext(useReducer(reducer, initialState))",
            "const useStore = registerStore({ state: { count: 0 } })"
        ],
        "answer_index": 0,
        "explanation": "Zustand sử dụng hàm create nhận vào hàm callback có tham số set để cập nhật trạng thái đơn giản, không cần boilerplate như Redux hay Provider bọc ngoài.",
        "difficulty": "easy"
    },
    {
        "language": "React",
        "question": "Điểm khác biệt lớn về cơ chế Event Delegation giữa React 17/18/19 và React 16 trở về trước là gì?",
        "options": [
            "React gắn các event listener vào root container (nơi render ứng dụng) thay vì gắn vào thẻ document",
            "React gắn trực tiếp event listener vào từng DOM node thật",
            "React bỏ hoàn toàn cơ chế SyntheticEvent",
            "React chỉ lắng nghe sự kiện trên thẻ window"
        ],
        "answer_index": 0,
        "explanation": "Từ React 17, React đính kèm trình xử lý sự kiện vào DOM node gốc (root element) nơi component tree được mount, thay vì document node, giúp chạy nhiều phiên bản React lồng nhau an toàn hơn.",
        "difficulty": "hard"
    },
    {
        "language": "React",
        "question": "Thành phần <Suspense> trong React có tác dụng chính là gì?",
        "options": [
            "Bắt và xử lý mọi ngoại lệ runtime tương tự try/catch",
            "Hiển thị giao diện fallback (loading UI) trong khi các component con đang chờ nạp mã nguồn hoặc dữ liệu bất đồng bộ",
            "Tự động retry lại request HTTP khi gặp mã lỗi 500",
            "Ngăn chặn component con re-render khi props thay đổi"
        ],
        "answer_index": 1,
        "explanation": "Suspense cho phép khai báo trạng thái fallback UI hiển thị trong khi một cây component con đang thực hiện các thao tác bất đồng bộ (như React.lazy hoặc Suspense-enabled data fetching).",
        "difficulty": "easy"
    },
    {
        "language": "React",
        "question": "React Compiler (React Forget) được thiết kế nhằm giải quyết bài toán cốt lõi nào của lập trình viên React?",
        "options": [
            "Thay thế hoàn toàn ngôn ngữ TypeScript bằng PureScript",
            "Tự động memoize các giá trị và component tại thời điểm build mà không cần lập trình viên viết useMemo/useCallback thủ công",
            "Biến ứng dụng web thành ứng dụng desktop native qua Electron",
            "Xóa bỏ sự phụ thuộc vào Node.js"
        ],
        "answer_index": 1,
        "explanation": "React Compiler phân tích luồng dữ liệu của component và tự động áp dụng memoization tối ưu tại bước biên dịch, giải phóng lập trình viên khỏi gánh nặng quản lý dependency array thủ công.",
        "difficulty": "medium"
    },

    # --- 2. FASTAPI & PYTHON BACKEND (11 câu) ---
    {
        "language": "FastAPI",
        "question": "Nền tảng cốt lõi giúp FastAPI đạt hiệu năng cao tương đương NodeJS và Go là việc kết hợp hai thư viện nào?",
        "options": [
            "Flask và Django ORM",
            "Starlette (cho phần web/networking) và Pydantic (cho data validation)",
            "Tornado và Marshmallow",
            "Bottle và SQLAlchemy"
        ],
        "answer_index": 1,
        "explanation": "FastAPI được xây dựng trên nền Starlette để xử lý routing và ASGI web server hiệu năng cao, cùng với Pydantic để serialize và kiểm tra tính hợp lệ của dữ liệu cực nhanh.",
        "difficulty": "easy"
    },
    {
        "language": "FastAPI",
        "question": "Trong FastAPI, khi nào một endpoint được định nghĩa với def thông thường thay vì async def?",
        "options": [
            "Không bao giờ được dùng def thông thường vì sẽ làm sập server",
            "Khi endpoint thực hiện các tác vụ blocking I/O (như thư viện DB cũ chưa hỗ trợ async); FastAPI sẽ tự động chạy nó trên một threadpool riêng",
            "Khi endpoint cần chạy với tốc độ cao hơn async def",
            "Khi endpoint không nhận tham số query"
        ],
        "answer_index": 1,
        "explanation": "Khi dùng def, FastAPI tự động gửi request đến một threadpool (worker threads) để tránh block Event Loop chính. Với async def, hàm phải gọi các non-blocking awaitable.",
        "difficulty": "medium"
    },
    {
        "language": "FastAPI",
        "question": "Trong Pydantic v2, phương thức chuẩn nào được khuyến nghị để chuyển đổi một dictionary hoặc đối tượng sang model instance?",
        "options": [
            "MyModel.parse_obj(data)",
            "MyModel.model_validate(data)",
            "MyModel.from_dict(data)",
            "MyModel.validate_all(data)"
        ],
        "answer_index": 1,
        "explanation": "Pydantic v2 thay thế parse_obj bằng model_validate(), mang lại tốc độ xử lý nhanh hơn hàng chục lần nhờ lõi pydantic-core được viết bằng Rust.",
        "difficulty": "easy"
    },
    {
        "language": "FastAPI",
        "question": "Hệ thống Dependency Injection (Depends) trong FastAPI mang lại lợi ích quan trọng nào sau đây?",
        "options": [
            "Tự động tạo các bảng trong cơ sở dữ liệu khi server khởi động",
            "Tái sử dụng logic xác thực, chia sẻ kết nối database session và kiểm soát phân quyền dễ dàng cho từng route",
            "Tự động deploy code lên Docker Swarm",
            "Mã hóa toàn bộ request body gửi từ client"
        ],
        "answer_index": 1,
        "explanation": "Depends cho phép module hóa logic (như get_db, get_current_user), quản lý lifecycle (yield để dọn dẹp kết nối) và kiểm tra quyền hạn một cách nhất quán.",
        "difficulty": "medium"
    },
    {
        "language": "FastAPI",
        "question": "Điểm khác biệt quan trọng giữa BackgroundTasks tích hợp sẵn của FastAPI và hệ thống hàng đợi Celery/Redis là gì?",
        "options": [
            "BackgroundTasks chạy trên cùng tiến trình server, phù hợp cho tác vụ nhẹ (như gửi email); Celery chạy phân tán trên worker riêng, phù hợp cho tác vụ nặng hoặc lâu dài",
            "BackgroundTasks chỉ dùng được với Python 2.7",
            "Celery không thể gửi email hay xử lý file",
            "BackgroundTasks tự động lưu task vào ổ đĩa để retry khi server khởi động lại"
        ],
        "answer_index": 0,
        "explanation": "BackgroundTasks của FastAPI chạy trong memory của tiến trình hiện tại. Nếu ứng dụng restart, task chưa chạy sẽ mất. Celery có message broker (Redis/RabbitMQ) để phân tán và retry bền vững.",
        "difficulty": "medium"
    },
    {
        "language": "FastAPI",
        "question": "Cấu hình middleware CORS trong FastAPI được thực hiện như thế nào để cho phép frontend gọi API từ domain khác?",
        "options": [
            "app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])",
            "app.enable_cors(True)",
            "app.use(CORS(all=True))",
            "app.cors_allow_all()"
        ],
        "answer_index": 0,
        "explanation": "FastAPI sử dụng CORSMiddleware từ starlette.middleware.cors và cấu hình thông qua phương thức app.add_middleware() với các thiết lập allow_origins, allow_credentials, allow_methods, allow_headers.",
        "difficulty": "easy"
    },
    {
        "language": "FastAPI",
        "question": "Để trả về một lỗi HTTP chuẩn cùng mã trạng thái và thông báo chi tiết trong route của FastAPI, bạn sử dụng cách nào?",
        "options": [
            "raise HTTPException(status_code=404, detail='Không tìm thấy dữ liệu')",
            "return {'error': '404', 'message': 'Not Found'}",
            "sys.exit(404)",
            "raise StandardError('404')"
        ],
        "answer_index": 0,
        "explanation": "Ném ngoại lệ HTTPException từ fastapi cho phép framework tự động sinh phản hồi JSON có định dạng chuẩn {'detail': '...'} với HTTP status code tương ứng.",
        "difficulty": "easy"
    },
    {
        "language": "FastAPI",
        "question": "Trong FastAPI hiện đại, cơ chế nào thay thế cho hai sự kiện @app.on_event('startup') và @app.on_event('shutdown')?",
        "options": [
            "Sử dụng context manager @asynccontextmanager làm lifespan cho FastAPI instance",
            "Sử dụng cronjob định kỳ của Linux",
            "Dùng hàm __init__ của lớp FastAPI",
            "Cấu hình trực tiếp trong tệp settings.ini"
        ],
        "answer_index": 0,
        "explanation": "FastAPI hỗ trợ lifespan context manager: code trước yield chạy lúc startup (khởi tạo DB pool, cache) và code sau yield chạy lúc shutdown, giúp chia sẻ tài nguyên an toàn.",
        "difficulty": "hard"
    },
    {
        "language": "FastAPI",
        "question": "Khi cần truyền dữ liệu dạng luồng (Server-Sent Events hoặc tải file dung lượng lớn) trong FastAPI, bạn nên sử dụng Response class nào?",
        "options": [
            "StreamingResponse",
            "JSONResponse",
            "FileResponse duy nhất",
            "PlainTextResponse"
        ],
        "answer_index": 0,
        "explanation": "StreamingResponse nhận một generator hoặc async generator để truyền từng chunk dữ liệu về client mà không cần nạp toàn bộ nội dung vào RAM máy chủ.",
        "difficulty": "medium"
    },
    {
        "language": "FastAPI",
        "question": "Thư viện kiểm thử (Testing) tiêu chuẩn thường được sử dụng cùng TestClient để kiểm thử toàn diện các API của FastAPI là gì?",
        "options": [
            "pytest",
            "selenium",
            "mocha",
            "junit"
        ],
        "answer_index": 0,
        "explanation": "pytest kết hợp với TestClient (dựa trên httpx) là tiêu chuẩn vàng trong hệ sinh thái FastAPI, hỗ trợ viết fixture, mock database và kiểm thử async.",
        "difficulty": "easy"
    },
    {
        "language": "FastAPI",
        "question": "Schema nào sau đây trong OpenAPI được FastAPI tự động sinh để cung cấp tài liệu trực quan tương tác?",
        "options": [
            "Swagger UI (tại đường dẫn /docs) và ReDoc (tại /redoc)",
            "Postman Collections file duy nhất",
            "PDF Documentation tự in ra console",
            "XML Schema Documentation"
        ],
        "answer_index": 0,
        "explanation": "Dựa trên chuẩn OpenAPI (OAS 3.x), FastAPI tự động tạo 2 giao diện tài liệu động trực tiếp là Swagger UI (/docs) và ReDoc (/redoc).",
        "difficulty": "easy"
    },

    # --- 3. POSTGRESQL & DATABASE (11 câu) ---
    {
        "language": "PostgreSQL",
        "question": "Mục tiêu cốt lõi của việc thiết lập Connection Pooling (như PgBouncer) trong hệ thống Backend PostgreSQL là gì?",
        "options": [
            "Tái sử dụng các kết nối cơ sở dữ liệu đã mở, giảm overhead khởi tạo kết nối TCP và xác thực người dùng",
            "Tự động mã hóa toàn bộ ổ đĩa của database server",
            "Thay thế hoàn toàn cho việc viết câu truy vấn SQL",
            "Mở rộng dung lượng RAM của máy chủ lưu trữ"
        ],
        "answer_index": 0,
        "explanation": "Mỗi kết nối tới PostgreSQL tạo một tiến trình (process) mới tốn khoảng 5-10MB RAM. Connection Pooling tái sử dụng socket có sẵn, giảm áp lực CPU/RAM và latency.",
        "difficulty": "medium"
    },
    {
        "language": "PostgreSQL",
        "question": "Loại chỉ mục (Index) nào trong PostgreSQL là lựa chọn tối ưu nhất khi cần tìm kiếm các phần tử nằm trong trường dữ liệu kiểu JSONB hoặc mảng (Array)?",
        "options": [
            "GIN (Generalized Inverted Index)",
            "B-Tree thông thường",
            "Hash Index",
            "BRIN (Block Range Index)"
        ],
        "answer_index": 0,
        "explanation": "Chỉ mục GIN được thiết kế đặc biệt cho các giá trị đa thành phần (như JSONB, Array, Full-Text Search), cho phép tra cứu key-value và mảng cực kỳ nhanh chóng.",
        "difficulty": "hard"
    },
    {
        "language": "PostgreSQL",
        "question": "Khi sử dụng lệnh EXPLAIN ANALYZE trong PostgreSQL, kết quả trả về khác biệt gì so với lệnh EXPLAIN thông thường?",
        "options": [
            "EXPLAIN ANALYZE thực sự chạy câu truy vấn để đo thời gian thực tế và số hàng trả về, trong khi EXPLAIN chỉ ước lượng kế hoạch tối ưu",
            "EXPLAIN ANALYZE sẽ tự động xóa dữ liệu sau khi chạy",
            "Không có sự khác biệt nào",
            "EXPLAIN ANALYZE chỉ kiểm tra lỗi chính tả SQL"
        ],
        "answer_index": 0,
        "explanation": "EXPLAIN chỉ đưa ra kế hoạch truy vấn ước tính dựa trên thống kê của optimizer; EXPLAIN ANALYZE thực thi truy vấn thật, đo lường chính xác thời gian thực tế và số hàng được xử lý.",
        "difficulty": "medium"
    },
    {
        "language": "PostgreSQL",
        "question": "Mức độ cô lập giao dịch (Transaction Isolation Level) mặc định trong PostgreSQL là gì?",
        "options": [
            "Read Committed",
            "Read Uncommitted",
            "Repeatable Read",
            "Serializable"
        ],
        "answer_index": 0,
        "explanation": "Mặc định PostgreSQL hoạt động ở mức Read Committed, trong đó một câu lệnh chỉ nhìn thấy các dòng dữ liệu đã được commit trước khi câu lệnh đó bắt đầu chạy.",
        "difficulty": "medium"
    },
    {
        "language": "PostgreSQL",
        "question": "Cơ chế MVCC (Multi-Version Concurrency Control) trong PostgreSQL hoạt động dựa trên nguyên lý cơ bản nào?",
        "options": [
            "Khóa toàn bộ bảng mỗi khi có thao tác ghi dữ liệu",
            "Mỗi thao tác UPDATE hoặc DELETE tạo một phiên bản tuple mới, giúp người đọc không khóa người ghi và người ghi không khóa người đọc",
            "Chỉ cho phép duy nhất một transaction chạy tại một thời điểm",
            "Ghi trực tiếp đè lên dữ liệu cũ ngay trên đĩa"
        ],
        "answer_index": 1,
        "explanation": "MVCC giữ nhiều phiên bản của dòng dữ liệu với các định danh xmin và xmax. Người đọc và người ghi không chặn lẫn nhau, và tiến trình VACUUM sẽ dọn dẹp các tuple chết (dead tuples).",
        "difficulty": "hard"
    },
    {
        "language": "PostgreSQL",
        "question": "Hiện tượng N+1 Query Problem trong ORM (như SQLAlchemy) có thể được giải quyết triệt để trong PostgreSQL bằng phương pháp nào?",
        "options": [
            "Sử dụng Eager Loading với joinedload() hoặc selectinload() để nạp dữ liệu liên kết trong 1 hoặc 2 query duy nhất",
            "Viết vòng lặp for trong Python để select từng dòng",
            "Tắt toàn bộ cache của cơ sở dữ liệu",
            "Chuyển toàn bộ dữ liệu sang SQLite"
        ],
        "answer_index": 0,
        "explanation": "Thay vì phát sinh 1 query lấy danh sách cha và N query lấy từng quan hệ con, joinedload (JOIN) hoặc selectinload (IN (...)) gộp việc nạp dữ liệu chỉ trong 1 hoặc 2 câu lệnh SQL hiệu quả.",
        "difficulty": "medium"
    },
    {
        "language": "PostgreSQL",
        "question": "Khi bảng cơ sở dữ liệu đạt tới hàng chục triệu bản ghi lịch sử theo thời gian (logs, metrics), kỹ thuật nào trong PostgreSQL giúp tăng tốc độ truy vấn và dọn dẹp dữ liệu cũ nhanh chóng?",
        "options": [
            "Table Partitioning (Phân vùng bảng theo Range ngày/tháng)",
            "Tạo thêm 50 chỉ mục B-Tree trên bảng",
            "Chuyển kiểu dữ liệu sang Text",
            "Khởi động lại server mỗi ngày"
        ],
        "answer_index": 0,
        "explanation": "Phân vùng bảng (Partitioning by Range) cho phép truy vấn chỉ quét trên partition cần thiết (Partition Pruning) và khi cần xóa dữ liệu cũ chỉ cần DROP TABLE partition con mà không tốn công chạy DELETE lớn.",
        "difficulty": "hard"
    },
    {
        "language": "PostgreSQL",
        "question": "Tại sao việc sử dụng UUIDv7 ngày càng được ưu tiên hơn UUIDv4 khi làm khóa chính (Primary Key) trong PostgreSQL?",
        "options": [
            "UUIDv7 có chứa timestamp ở phần đầu giúp sắp xếp tuần tự theo thời gian, giảm phân mảnh cây chỉ mục B-Tree và cải thiện hiệu năng INSERT",
            "UUIDv7 có kích thước chỉ 1 byte",
            "UUIDv7 không bao giờ trùng lặp còn UUIDv4 thì rất hay trùng",
            "UUIDv7 tự động mã hóa mật khẩu"
        ],
        "answer_index": 0,
        "explanation": "UUIDv4 hoàn toàn ngẫu nhiên khiến việc chèn vào B-Tree gây ra page splits liên tục. UUIDv7 kết hợp UNIX timestamp vào các bit đầu, giữ trật tự tuần tự và tối ưu I/O ghi đĩa.",
        "difficulty": "hard"
    },
    {
        "language": "PostgreSQL",
        "question": "Từ khóa CTE (Common Table Expression) trong SQL được khai báo bằng từ khóa nào sau đây?",
        "options": [
            "WITH",
            "LET",
            "DEFINE",
            "DECLARE"
        ],
        "answer_index": 0,
        "explanation": "Cú pháp WITH temp_table AS (SELECT ...) SELECT * FROM temp_table cho phép định nghĩa CTE, giúp truy vấn phức tạp trở nên dễ đọc, module hóa và có thể đệ quy (WITH RECURSIVE).",
        "difficulty": "easy"
    },
    {
        "language": "PostgreSQL",
        "question": "Câu lệnh PostgreSQL nào được sử dụng để giải phóng không gian lưu trữ bị chiếm giữ bởi các dòng dữ liệu chết (dead tuples) và cập nhật thống kê cho optimizer?",
        "options": [
            "VACUUM ANALYZE",
            "PURGE DATABASE",
            "CLEANUP MEMORY",
            "DROP FREE_SPACE"
        ],
        "answer_index": 0,
        "explanation": "VACUUM đánh dấu các không gian đĩa của dead tuples để tái sử dụng, và ANALYZE thu thập số liệu thống kê phân phối dữ liệu cho bộ lập kế hoạch truy vấn (query planner).",
        "difficulty": "easy"
    },
    {
        "language": "PostgreSQL",
        "question": "Trong PostgreSQL, kiểu dữ liệu nào sau đây là lựa chọn chuẩn xác nhất để lưu trữ tiền tệ hoặc giá trị số học đòi hỏi độ chính xác tuyệt đối mà không bị sai số làm tròn số thực?",
        "options": [
            "NUMERIC (hoặc DECIMAL)",
            "FLOAT",
            "REAL",
            "DOUBLE PRECISION"
        ],
        "answer_index": 0,
        "explanation": "FLOAT/REAL là kiểu số thực dấu phẩy động xấp xỉ tuân theo chuẩn IEEE 754 có thể gây sai số làm tròn thập phân. NUMERIC (DECIMAL) lưu trữ số học chính xác không có sai số.",
        "difficulty": "easy"
    },

    # --- 4. DEVOPS, DOCKER & K8S (11 câu) ---
    {
        "language": "DevOps",
        "question": "Trong Dockerfile, kỹ thuật 'Multi-stage Build' mang lại ưu thế vượt trội nào cho quy trình CI/CD?",
        "options": [
            "Tách riêng môi trường build (chứa compiler, devDependencies) và môi trường production, giúp giảm kích thước image thành phẩm và hạn chế lỗ hổng bảo mật",
            "Cho phép chạy nhiều container trên cùng một network port",
            "Tự động phân tán image lên các node Kubernetes",
            "Tự động restart container khi bị crash"
        ],
        "answer_index": 0,
        "explanation": "Multi-stage build cho phép dùng một image nặng để compile mã nguồn (ví dụ golang, node-build) rồi sao chép duy nhất file binary/dist sang base image siêu nhẹ (như alpine, distroless), giảm kích thước từ hàng GB xuống vài chục MB.",
        "difficulty": "easy"
    },
    {
        "language": "DevOps",
        "question": "Điểm khác biệt căn bản nhất giữa một Docker Container và một Máy ảo (Virtual Machine - VM) là gì?",
        "options": [
            "Container chia sẻ chung Kernel của hệ điều hành máy chủ và chạy dưới dạng tiến trình cô lập, trong khi VM yêu cầu một hệ điều hành khách (Guest OS) riêng biệt",
            "Container chỉ chạy được trên hệ điều hành Windows",
            "VM không cần phần cứng CPU",
            "Container luôn an toàn hơn VM trong mọi tình huống"
        ],
        "answer_index": 0,
        "explanation": "Container ảo hóa ở tầng hệ điều hành (dùng cgroups và namespaces của Linux Kernel), không cần chạy Guest OS riêng nên nhẹ hơn, khởi động trong vài phần trăm giây và dùng ít RAM hơn VM rất nhiều.",
        "difficulty": "easy"
    },
    {
        "language": "DevOps",
        "question": "Trong Kubernetes, thành phần nào chịu trách nhiệm gom nhóm một hoặc nhiều container và là đơn vị triển khai nhỏ nhất có thể quản lý được?",
        "options": [
            "Pod",
            "Deployment",
            "Ingress",
            "ConfigMap"
        ],
        "answer_index": 0,
        "explanation": "Pod là đơn vị tính toán nhỏ nhất trong Kubernetes, bao gồm một hoặc nhiều container chia sẻ chung mạng (IP và cổng), bộ nhớ lưu trữ và các thông số chạy.",
        "difficulty": "easy"
    },
    {
        "language": "DevOps",
        "question": "Chiến lược triển khai (Deployment Strategy) nào triển khai phiên bản mới song song với phiên bản cũ rồi chuyển hướng 100% traffic qua phiên bản mới thông qua Router/Load Balancer?",
        "options": [
            "Blue-Green Deployment",
            "Canary Deployment",
            "Recreate Deployment",
            "Rolling Update"
        ],
        "answer_index": 0,
        "explanation": "Blue-Green Deployment duy trì hai môi trường giống hệt nhau (Blue: hiện tại, Green: mới). Khi Green kiểm thử thành công, router đổi hướng toàn bộ traffic sang Green gần như tức thời (zero downtime).",
        "difficulty": "medium"
    },
    {
        "language": "DevOps",
        "question": "Tín hiệu Linux nào được Docker hoặc Kubernetes gửi tới tiến trình ứng dụng trước để thông báo container sắp bị dừng lại một cách nhẹ nhàng (Graceful Shutdown)?",
        "options": [
            "SIGTERM (Signal 15)",
            "SIGKILL (Signal 9)",
            "SIGHUP (Signal 1)",
            "SIGSTOP (Signal 17)"
        ],
        "answer_index": 0,
        "explanation": "Khi dừng container, Docker/K8s gửi SIGTERM để ứng dụng có thời gian đóng kết nối database, hoàn thành request dở dang. Sau thời gian timeout (thường 30s), nếu chưa dừng nó mới gửi SIGKILL để cưỡng chế hủy.",
        "difficulty": "medium"
    },
    {
        "language": "DevOps",
        "question": "Loại kiểm tra (Probe) nào trong Kubernetes được sử dụng để xác định xem container đã sẵn sàng nhận lưu lượng truy cập từ Service hay chưa?",
        "options": [
            "readinessProbe",
            "livenessProbe",
            "startupProbe",
            "networkProbe"
        ],
        "answer_index": 0,
        "explanation": "readinessProbe kiểm tra xem ứng dụng đã sẵn sàng tiếp nhận request chưa. Nếu fail, K8s sẽ tạm ngắt Pod khỏi Service Load Balancer mà không restart container (khác với livenessProbe sẽ restart Pod).",
        "difficulty": "medium"
    },
    {
        "language": "DevOps",
        "question": "Khi cấu hình Nginx làm Reverse Proxy và Load Balancer, thuật toán phân phối tải nào sẽ phân bổ request tới server đang có ít kết nối hoạt động nhất?",
        "options": [
            "least_conn",
            "round_robin",
            "ip_hash",
            "random"
        ],
        "answer_index": 0,
        "explanation": "Thuật toán least_conn tự động chuyển tiếp request mới tới backend server hiện có số lượng kết nối đang xử lý thấp nhất, rất phù hợp khi thời gian xử lý request không đồng đều.",
        "difficulty": "easy"
    },
    {
        "language": "DevOps",
        "question": "Trong hệ thống giám sát bằng Prometheus, phương pháp RED Method bao gồm việc theo dõi 3 đại lượng cốt lõi nào của dịch vụ?",
        "options": [
            "Rate (Tần suất request/giây), Errors (Số lỗi phát sinh), Duration (Thời gian phản hồi/độ trễ)",
            "Read, Execute, Delete",
            "RAM, Energy, Disk",
            "Replicas, Endpoints, DNS"
        ],
        "answer_index": 0,
        "explanation": "Phương pháp RED (Rate, Errors, Duration) là chuẩn mực giám sát kiến trúc microservices và API được thiết kế bởi Tom Wilkie nhằm theo dõi sức khỏe dịch vụ lấy người dùng làm trung tâm.",
        "difficulty": "hard"
    },
    {
        "language": "DevOps",
        "question": "Trong Docker, loại Volume nào gắn trực tiếp một thư mục hoặc tệp tin trên máy chủ chủ quản (Host OS) vào trong container theo đường dẫn tuyệt đối?",
        "options": [
            "Bind Mount",
            "Named Volume",
            "tmpfs Mount",
            "Overlay Network"
        ],
        "answer_index": 0,
        "explanation": "Bind Mount liên kết trực tiếp một đường dẫn trên host (ví dụ /var/data) vào trong container, rất hữu ích cho môi trường development để hot-reload code trực tiếp.",
        "difficulty": "easy"
    },
    {
        "language": "DevOps",
        "question": "Trong pipeline CI/CD GitHub Actions, cú pháp nào cho phép một job chỉ chạy sau khi job kiểm thử (test) đã hoàn thành thành công?",
        "options": [
            "needs: test",
            "depends_on: test",
            "after: test",
            "require: test"
        ],
        "answer_index": 0,
        "explanation": "Từ khóa needs trong GitHub Actions workflow thiết lập quan hệ phụ thuộc giữa các jobs, đảm bảo job hiện tại chỉ chạy khi các jobs trong mảng needs chạy thành công.",
        "difficulty": "easy"
    },
    {
        "language": "DevOps",
        "question": "Giải pháp nào sau đây được coi là thực hành tốt nhất (Best Practice) để quản lý secret nhạy cảm (như API Key, DB Password) trong môi trường Cloud Native?",
        "options": [
            "Sử dụng công cụ quản lý bảo mật chuyên dụng như HashiCorp Vault, AWS Secrets Manager hoặc K8s Secrets được mã hóa etcd",
            "Hardcode trực tiếp chuỗi mật khẩu vào source code Git",
            "Commit tệp .env lên repository công khai",
            "In mật khẩu ra tệp access.log"
        ],
        "answer_index": 0,
        "explanation": "Tuyệt đối không hardcode secret vào source control. Việc dùng Vault hoặc Secrets Manager cho phép xoay vòng khóa tự động (rotation), mã hóa at-rest và kiểm soát truy cập nghiêm ngặt.",
        "difficulty": "easy"
    },

    # --- 5. PYTHON CORE & ASYNC (11 câu) ---
    {
        "language": "Python",
        "question": "Cơ chế 'Faster CPython' được giới thiệu từ Python 3.11 giúp tăng tốc hiệu năng thực thi mã nguồn chủ yếu nhờ cải tiến gì?",
        "options": [
            "Trình thông dịch chuyên biệt hóa thích ứng (Adaptive Specializing Interpreter)",
            "Loại bỏ hoàn toàn tính năng dynamic typing của Python",
            "Chuyển toàn bộ mã nguồn sang chạy bằng PyPy",
            "Bắt buộc biên dịch toàn bộ code thành tệp thực thi .exe"
        ],
        "answer_index": 0,
        "explanation": "Adaptive Specializing Interpreter theo dõi các bytecode thường xuyên được gọi và thay thế chúng bằng các phiên bản bytecode chuyên biệt theo kiểu dữ liệu cụ thể tại runtime (quickening).",
        "difficulty": "hard"
    },
    {
        "language": "Python",
        "question": "Global Interpreter Lock (GIL) trong CPython truyền thống có đặc điểm gì đối với các luồng thực thi (threads)?",
        "options": [
            "Chỉ cho phép duy nhất một luồng máy chủ thực thi mã bytecode của Python tại một thời điểm, giới hạn khả năng tận dụng đa lõi CPU cho tác vụ CPU-bound",
            "Ngăn chặn các luồng thực hiện gọi I/O mạng",
            "Tự động khóa ổ cứng khi máy tính nóng lên",
            "Chỉ xuất hiện trên hệ điều hành Linux"
        ],
        "answer_index": 0,
        "explanation": "GIL đảm bảo an toàn bộ nhớ cho reference counting của CPython bằng cách cho phép chỉ 1 thread chạy Python bytecode tại một thời điểm. Với tác vụ CPU-bound cần dùng multiprocessing thay vì threading.",
        "difficulty": "medium"
    },
    {
        "language": "Python",
        "question": "Trong thư viện asyncio của Python 3.11+, cú pháp nào là cách quản lý vòng đời nhiều coroutine an toàn nhất, tự động hủy các task còn lại nếu một task gặp lỗi?",
        "options": [
            "async with asyncio.TaskGroup() as tg:",
            "asyncio.gather(*tasks, return_exceptions=True)",
            "asyncio.wait(tasks)",
            "for t in tasks: await t"
        ],
        "answer_index": 0,
        "explanation": "asyncio.TaskGroup triển khai Structured Concurrency: nếu một task trong group bị lỗi, tất cả các task khác đang chạy trong group sẽ được tự động cancel và đóng lại an toàn.",
        "difficulty": "hard"
    },
    {
        "language": "Python",
        "question": "Khác biệt cơ bản giữa yield (Generator) và return trong một hàm Python là gì?",
        "options": [
            "yield tạm dừng thực thi hàm và trả về giá trị hiện tại, ghi nhớ trạng thái để tiếp tục chạy ở lần gọi tiếp theo, giúp tiết kiệm bộ nhớ với tập dữ liệu lớn",
            "yield chạy chậm hơn return 100 lần và không nên dùng",
            "yield bắt buộc phải trả về kiểu chuỗi ký tự",
            "return chỉ dùng được trong vòng lặp while"
        ],
        "answer_index": 0,
        "explanation": "Generator dùng yield tạo ra các giá trị theo cơ chế lazy evaluation (tới đâu tính tới đó), không nạp toàn bộ danh sách vào RAM, cực kỳ tối ưu khi xử lý file lớn hoặc luồng stream.",
        "difficulty": "easy"
    },
    {
        "language": "Python",
        "question": "Khi viết một Decorator tùy chỉnh trong Python, tại sao luôn khuyến nghị sử dụng @functools.wraps(func) trên hàm wrapper?",
        "options": [
            "Để bảo toàn tên hàm nguyên bản (__name__), docstring (__doc__) và các metadata của hàm ban đầu",
            "Để làm cho hàm chạy nhanh hơn gấp đôi",
            "Để biến hàm thành async function tự động",
            "Bắt buộc phải có nếu không code sẽ bị cú pháp lỗi"
        ],
        "answer_index": 0,
        "explanation": "functools.wraps sao chép các thuộc tính phản chiếu (introspection) như __name__, __doc__, __annotations__ từ hàm gốc sang hàm wrapper, giúp debug và sinh tài liệu chính xác.",
        "difficulty": "easy"
    },
    {
        "language": "Python",
        "question": "Cơ chế thu hồi bộ nhớ tự động (Garbage Collection) của CPython kết hợp hai phương pháp nào?",
        "options": [
            "Đếm tham chiếu (Reference Counting) làm cơ chế chính kết hợp cùng bộ dò chu trình tham chiếu vòng (Generational Garbage Collector)",
            "Chỉ dùng duy nhất Mark-and-Sweep định kỳ",
            "Giải phóng thủ công bằng lệnh free() như C++",
            "Không bao giờ tự thu hồi bộ nhớ"
        ],
        "answer_index": 0,
        "explanation": "CPython giải phóng đối tượng ngay lập tức khi reference count giảm về 0. Đồng thời nó có Generational GC (chia 3 thế hệ generation 0, 1, 2) để phát hiện và dọn dẹp các đối tượng tham chiếu vòng (cyclic references).",
        "difficulty": "hard"
    },
    {
        "language": "Python",
        "question": "Để một class tùy chỉnh có thể sử dụng được cú pháp 'with MyContext():', class đó bắt buộc phải hiện thực hai phương thức đặc biệt (dunder methods) nào?",
        "options": [
            "__enter__() và __exit__()",
            "__init__() và __del__()",
            "__start__() và __stop__()",
            "__open__() và __close__()"
        ],
        "answer_index": 0,
        "explanation": "Giao thức Context Manager yêu cầu __enter__ để khởi tạo/trả về tài nguyên khi vào khối with, và __exit__ để dọn dẹp tài nguyên kể cả khi có exception xảy ra.",
        "difficulty": "easy"
    },
    {
        "language": "Python",
        "question": "Trong hệ thống kiểu dữ liệu tĩnh của Python (typing), cú pháp nào đại diện cho một giá trị có thể mang kiểu dữ liệu T hoặc có thể là None?",
        "options": [
            "Optional[T] (hoặc T | None từ Python 3.10)",
            "Nullable[T]",
            "Maybe[T]",
            "Nil[T]"
        ],
        "answer_index": 0,
        "explanation": "Trong module typing, Optional[T] là cú pháp viết tắt của Union[T, None]. Từ Python 3.10 trở lên, có thể viết ngắn gọn là T | None.",
        "difficulty": "easy"
    },
    {
        "language": "Python",
        "question": "Điểm khác biệt giữa hai phương thức chuyển đổi chuỗi __str__ và __repr__ trong Python là gì?",
        "options": [
            "__str__ dành cho người dùng cuối (dễ đọc, thân thiện); __repr__ dành cho lập trình viên để gỡ lỗi (chính xác, không mơ hồ và có thể dùng để tái tạo đối tượng)",
            "__str__ chỉ in số, __repr__ chỉ in chữ",
            "__repr__ bắt buộc phải mã hóa base64",
            "Hai phương thức này hoàn toàn giống nhau"
        ],
        "answer_index": 0,
        "explanation": "Quy tắc chuẩn của Python: __repr__ là biểu diễn chính thức hướng đến debugging (thường trả về dạng ClassName(arg=val)), còn __str__ hướng đến hiển thị thân thiện cho người dùng.",
        "difficulty": "medium"
    },
    {
        "language": "Python",
        "question": "Đối với tác vụ tính toán chuyên sâu CPU (CPU-bound) như xử lý ảnh hoặc huấn luyện mô hình toán học trong Python, giải pháp nào sau đây giúp tối ưu hiệu năng tốt nhất?",
        "options": [
            "Sử dụng module multiprocessing hoặc concurrent.futures.ProcessPoolExecutor để chạy trên nhiều tiến trình độc lập",
            "Dùng asyncio lồng trong nhiều vòng for",
            "Sử dụng threading để tạo 1000 luồng",
            "Chỉ dùng duy nhất một vòng lặp đơn"
        ],
        "answer_index": 0,
        "explanation": "Do tác động của GIL đối với CPython, threading không thể chạy đa lõi thực sự cho CPU-bound. multiprocessing tạo các tiến trình con có interpreter và bộ nhớ riêng, tận dụng trọn vẹn mọi lõi CPU.",
        "difficulty": "medium"
    },
    {
        "language": "Python",
        "question": "Biểu thức 'List Comprehension' nào sau đây là hợp lệ và tối ưu nhất để lấy bình phương của các số chẵn trong mảng numbers?",
        "options": [
            "[x**2 for x in numbers if x % 2 == 0]",
            "[for x in numbers: if x % 2 == 0: x**2]",
            "[x**2 if x % 2 == 0 else pass for x in numbers]",
            "[square(x) while x % 2 == 0]"
        ],
        "answer_index": 0,
        "explanation": "Cú pháp chuẩn của list comprehension lọc điều kiện là [expression for item in iterable if condition]. Biểu thức này chạy nhanh hơn vòng for append thủ công nhờ thực thi ở tầng C bytecode.",
        "difficulty": "easy"
    },

    # --- 6. BẢO MẬT WEB & AN TOÀN THÔNG TIN (10 câu) ---
    {
        "language": "Security",
        "question": "Cách phòng chống lỗ hổng SQL Injection hiệu quả và triệt để nhất trong lập trình ứng dụng là gì?",
        "options": [
            "Luôn sử dụng Parameterized Queries (Prepared Statements) hoặc Object-Relational Mapping (ORM) thay vì cộng chuỗi SQL",
            "Thay thế dấu nháy đơn bằng dấu nháy kép",
            "Chỉ chạy website bằng quyền root để hệ điều hành tự bảo vệ",
            "Tắt toàn bộ tính năng ghi log của database"
        ],
        "answer_index": 0,
        "explanation": "Parameterized queries tách biệt hoàn toàn mã lệnh SQL và dữ liệu đầu vào. Database coi tham số người dùng truyền vào thuần túy là giá trị (literal value), không bao giờ biên dịch nó thành lệnh thực thi.",
        "difficulty": "easy"
    },
    {
        "language": "Security",
        "question": "Lỗ hổng Cross-Site Scripting (XSS) cho phép kẻ tấn công làm điều gì nguy hiểm trên trình duyệt của nạn nhân?",
        "options": [
            "Chèn và thực thi mã JavaScript độc hại trong ngữ cảnh trình duyệt của người dùng, đánh cắp cookie phiên hoặc thông tin nhạy cảm",
            "Tự động tắt nguồn máy tính của nạn nhân",
            "Xóa toàn bộ cơ sở dữ liệu trên server qua cổng 80",
            "Thay đổi mật khẩu BIOS của máy chủ"
        ],
        "answer_index": 0,
        "explanation": "XSS cho phép thực thi script ngoài ý muốn trên trình duyệt người dùng. Kẻ tấn công có thể đọc trộm localStorage, session tokens, chuyển hướng người dùng hoặc mạo danh thao tác.",
        "difficulty": "easy"
    },
    {
        "language": "Security",
        "question": "Để bảo vệ Cookie chứa mã thông báo phiên (Session Token / JWT) khỏi bị đánh cắp bởi các cuộc tấn công XSS, lập trình viên PHẢI bật cờ (flag) nào cho cookie?",
        "options": [
            "HttpOnly",
            "SameSite=None",
            "Path=/",
            "Domain=.local"
        ],
        "answer_index": 0,
        "explanation": "Khi cờ HttpOnly được bật, mã JavaScript chạy trên trình duyệt (thông qua document.cookie) sẽ hoàn toàn không thể đọc hoặc can thiệp vào cookie đó, ngăn chặn việc đánh cắp token qua XSS.",
        "difficulty": "easy"
    },
    {
        "language": "Security",
        "question": "Tấn công Cross-Site Request Forgery (CSRF) là dạng tấn công như thế nào?",
        "options": [
            "Lừa trình duyệt của người dùng đã xác thực tự động gửi các yêu cầu trái phép đến ứng dụng web mục tiêu",
            "Tấn công làm tràn bộ đệm RAM máy chủ bằng lệnh gọi đệ quy",
            "Chặn bắt gói tin trên đường truyền mạng không dây",
            "Gửi hàng triệu email rác vào hòm thư"
        ],
        "answer_index": 0,
        "explanation": "CSRF lợi dụng việc trình duyệt tự động đính kèm cookie xác thực khi gửi request tới domain mục tiêu. Có thể ngăn chặn bằng cách dùng cờ SameSite=Lax/Strict hoặc Anti-CSRF Tokens.",
        "difficulty": "medium"
    },
    {
        "language": "Security",
        "question": "Trong cấu trúc của JSON Web Token (JWT), phần nào đảm bảo rằng token không bị kẻ xấu chỉnh sửa trái phép nội dung?",
        "options": [
            "Signature (Chữ ký điện tử được ký bằng secret key hoặc private key)",
            "Payload",
            "Header",
            "Algorithm type"
        ],
        "answer_index": 0,
        "explanation": "Signature được tạo bằng cách băm Header + Payload cùng với secret key (với HMAC) hoặc ký bằng private key (với RSA/ECDSA). Nếu kẻ xấu sửa Payload, chữ ký sẽ không khớp và server từ chối token.",
        "difficulty": "medium"
    },
    {
        "language": "Security",
        "question": "Cơ chế CORS (Cross-Origin Resource Sharing) trong trình duyệt gửi loại HTTP request nào trước (Preflight Request) để kiểm tra quyền truy cập khi có header hoặc method tùy chỉnh?",
        "options": [
            "OPTIONS",
            "HEAD",
            "GET",
            "TRACE"
        ],
        "answer_index": 0,
        "explanation": "Trình duyệt tự động gửi một preflight request với phương thức OPTIONS kèm các header Access-Control-Request-* để hỏi máy chủ xem request thực tế có được phép thực hiện hay không.",
        "difficulty": "medium"
    },
    {
        "language": "Security",
        "question": "Thuật toán nào sau đây là tiêu chuẩn được khuyến nghị cao nhất hiện nay để băm và lưu trữ mật khẩu người dùng (Password Hashing)?",
        "options": [
            "Argon2id hoặc Bcrypt",
            "MD5",
            "SHA-1",
            "Base64"
        ],
        "answer_index": 0,
        "explanation": "MD5 và SHA-1 đã lỗi thời và dễ bị tấn công va chạm/rainbow table. Argon2id (thắng giải Password Hashing Competition) và Bcrypt là các hàm băm chậm thích ứng (memory-hard và time-cost), chống tấn công GPU/ASIC cực tốt.",
        "difficulty": "easy"
    },
    {
        "language": "Security",
        "question": "Header bảo mật nào chỉ dẫn trình duyệt chỉ được phép tải các tài nguyên (scripts, images, styles) từ những nguồn gốc (origins) được tin cậy?",
        "options": [
            "Content-Security-Policy (CSP)",
            "X-Frame-Options",
            "Strict-Transport-Security",
            "X-Content-Type-Options"
        ],
        "answer_index": 0,
        "explanation": "Content-Security-Policy (CSP) là lớp bảo vệ vững chắc chống XSS và data injection bằng cách thiết lập danh sách trắng các domain được phép nạp script, style, hình ảnh và cấm thực thi inline script độc hại.",
        "difficulty": "medium"
    },
    {
        "language": "Security",
        "question": "Thuật toán Rate Limiting nào hoạt động bằng cách cấp phát một số lượng token nhất định theo chu kỳ thời gian và tiêu thụ token cho mỗi request được gọi?",
        "options": [
            "Token Bucket",
            "Binary Search",
            "Depth First Search",
            "Round Robin"
        ],
        "answer_index": 0,
        "explanation": "Thuật toán Token Bucket (hoặc Leaky Bucket) duy trì thùng chứa token được nạp đầy theo tốc độ cố định. Mỗi request lấy đi 1 token; nếu hết token thì request bị từ chối (HTTP 429 Too Many Requests).",
        "difficulty": "medium"
    },
    {
        "language": "Security",
        "question": "Header HTTP Strict Transport Security (HSTS) thông báo điều gì cho trình duyệt của người dùng?",
        "options": [
            "Yêu cầu trình duyệt chỉ được phép giao tiếp với trang web qua kết nối bảo mật HTTPS trong suốt khoảng thời gian quy định",
            "Yêu cầu người dùng nhập lại mật khẩu sau mỗi 5 phút",
            "Tự động tắt quảng cáo trên website",
            "Cho phép mở website trong iFrame bất kỳ"
        ],
        "answer_index": 0,
        "explanation": "HSTS (Strict-Transport-Security) ngăn chặn tấn công hạ cấp giao thức SSL Stripping bằng cách buộc trình duyệt luôn chuyển đổi HTTP sang HTTPS trước khi gửi bất kỳ gói tin nào ra mạng.",
        "difficulty": "hard"
    },

    # --- 7. KIẾN TRÚC HỆ THỐNG & MICROSERVICES (10 câu) ---
    {
        "language": "Architecture",
        "question": "Trong kiến trúc Microservices, Pattern nào thường được sử dụng để duy trì tính nhất quán dữ liệu giữa các dịch vụ phân tán thay cho Distributed 2PC (Two-Phase Commit)?",
        "options": [
            "Saga Pattern (triển khai qua Choreography hoặc Orchestration)",
            "Singleton Pattern",
            "Factory Pattern",
            "Flyweight Pattern"
        ],
        "answer_index": 0,
        "explanation": "Saga Pattern chia một giao dịch phân tán thành chuỗi các local transaction. Nếu một bước thất bại, Saga sẽ kích hoạt các giao dịch bù trừ (compensating transactions) để hoàn tác dữ liệu của các bước trước đó.",
        "difficulty": "hard"
    },
    {
        "language": "Architecture",
        "question": "Chiến lược Caching 'Cache-Aside' (Lazy Loading) hoạt động theo trình tự nào khi ứng dụng cần đọc dữ liệu?",
        "options": [
            "Ứng dụng kiểm tra Cache trước; nếu có (Cache Hit) thì trả về ngay; nếu không có (Cache Miss), ứng dụng truy vấn Database rồi ghi dữ liệu vào Cache và trả về cho client",
            "Ứng dụng luôn ghi thẳng vào Database rồi để Database tự bắn dữ liệu sang Cache",
            "Ứng dụng chỉ đọc từ Cache, không bao giờ đọc từ Database",
            "Cache tự động quét Database theo định kỳ 1 giây"
        ],
        "answer_index": 0,
        "explanation": "Trong Cache-Aside, ứng dụng trực tiếp quản lý cache: đọc cache trước -> miss thì đọc DB -> cập nhật cache -> trả kết quả. Đây là chiến lược phổ biến và linh hoạt nhất.",
        "difficulty": "medium"
    },
    {
        "language": "Architecture",
        "question": "Cấu trúc dữ liệu nào trong Redis là lựa chọn lý tưởng nhất để xây dựng hệ thống Bảng Xếp Hạng (Leaderboard) theo điểm số thời gian thực?",
        "options": [
            "Sorted Sets (ZSET)",
            "Hashes",
            "Lists",
            "Bitmaps"
        ],
        "answer_index": 0,
        "explanation": "Redis Sorted Sets lưu trữ các phần tử duy nhất kèm theo một trọng số (score). Các thao tác thêm, cập nhật điểm, và lấy top người chơi (ZRANGEBYSCORE, ZREVRANK) đều đạt độ phức tạp O(log(N)).",
        "difficulty": "medium"
    },
    {
        "language": "Architecture",
        "question": "Điểm khác biệt mấu chốt giữa Apache Kafka và RabbitMQ trong việc lưu trữ và tiêu thụ thông điệp (Message Streaming vs Queueing) là gì?",
        "options": [
            "Kafka lưu trữ message dưới dạng append-only log bền vững trên ổ đĩa cho phép nhiều consumer đọc lại theo offset; RabbitMQ xóa message khỏi queue sau khi consumer xử lý và ack thành công",
            "RabbitMQ chỉ chạy được trên điện thoại di động",
            "Kafka không cho phép xử lý dữ liệu theo thời gian thực",
            "RabbitMQ có thể lưu hàng petabyte dữ liệu vĩnh viễn"
        ],
        "answer_index": 0,
        "explanation": "Kafka là distributed event streaming platform lưu trữ log theo thời gian (retention period), cho phép replay message. RabbitMQ là message broker truyền thống hướng theo trạng thái message (queue empty khi đã tiêu thụ xong).",
        "difficulty": "hard"
    },
    {
        "language": "Architecture",
        "question": "Định lý CAP (CAP Theorem) khẳng định điều gì về một hệ thống cơ sở dữ liệu phân tán khi xảy ra phân mảnh mạng (Network Partition)?",
        "options": [
            "Chỉ có thể lựa chọn thỏa mãn một trong hai: Tính nhất quán (Consistency - CP) hoặc Tính sẵn sàng (Availability - AP)",
            "Hệ thống có thể đạt được trọn vẹn cả 3 tiêu chí cùng lúc",
            "Hệ thống buộc phải dừng hoạt động hoàn toàn",
            "Phân mảnh mạng không bao giờ xảy ra trong thực tế"
        ],
        "answer_index": 0,
        "explanation": "Khi phân mảnh mạng (Partition) xảy ra (điều không thể tránh khỏi trong mạng phân tán), hệ thống buộc phải chọn: hoặc từ chối request để đảm bảo mọi node giữ nguyên dữ liệu đúng (Consistency), hoặc vẫn trả lời bằng dữ liệu có thể cũ (Availability).",
        "difficulty": "medium"
    },
    {
        "language": "Architecture",
        "question": "Kỹ thuật 'Database Sharding' (Horizontal Partitioning) giải quyết bài toán gì của hệ thống dữ liệu quy mô lớn?",
        "options": [
            "Chia nhỏ một tập dữ liệu khổng lồ thành nhiều cơ sở dữ liệu độc lập (shards) dựa trên sharding key để phân tán tải I/O và dung lượng lưu trữ",
            "Sao chép toàn bộ bảng sang cùng một ổ cứng nhỏ hơn",
            "Nén dữ liệu dạng zip trước khi lưu",
            "Chuyển toàn bộ database sang dạng tệp văn bản .txt"
        ],
        "answer_index": 0,
        "explanation": "Sharding chia ngang bảng theo hàng dựa trên shard key (như user_id hash), phân bổ các phần dữ liệu lên nhiều server vật lý riêng biệt, cho phép mở rộng quy mô tuyến tính vượt qua giới hạn của một máy chủ đơn.",
        "difficulty": "hard"
    },
    {
        "language": "Architecture",
        "question": "Vai trò cốt lõi của một API Gateway trong hệ thống kiến trúc Microservices là gì?",
        "options": [
            "Làm điểm tiếp nhận duy nhất cho client, đảm nhiệm định tuyến request, xác thực phân quyền, rate limiting, SSL termination và ghi log tập trung",
            "Thay thế hoàn toàn database của các microservices",
            "Biên dịch mã backend sang WebAssembly",
            "Làm nhiệm vụ thiết kế giao diện đồ họa cho website"
        ],
        "answer_index": 0,
        "explanation": "API Gateway đóng vai trò làm reverse proxy trung tâm che giấu kiến trúc nội bộ của hệ thống, xử lý các mối quan tâm xuyên suốt (cross-cutting concerns) như auth, telemetry, throttling.",
        "difficulty": "easy"
    },
    {
        "language": "Architecture",
        "question": "Pattern 'CQRS' (Command Query Responsibility Segregation) đề xuất kiến trúc như thế nào cho ứng dụng?",
        "options": [
            "Tách biệt mô hình dữ liệu và đường dẫn xử lý của thao tác ghi (Commands: tạo, sửa, xóa) khỏi thao tác đọc (Queries: truy vấn xem)",
            "Bắt buộc mọi bảng phải có đúng 2 cột",
            "Gộp chung toàn bộ code đọc và ghi vào một hàm duy nhất",
            "Chỉ cho phép đọc dữ liệu vào ban ngày và ghi dữ liệu vào ban đêm"
        ],
        "answer_index": 0,
        "explanation": "CQRS phân tách rõ ràng trách nhiệm: Command thực hiện thay đổi trạng thái nghiệp vụ, còn Query tối ưu hóa riêng cho việc đọc (thậm chí có thể dùng cơ sở dữ liệu đọc riêng như Elasticsearch song song với PostgreSQL).",
        "difficulty": "hard"
    },
    {
        "language": "Architecture",
        "question": "Thuộc tính 'Idempotency' (Tính lũy đẳng) trong thiết kế RESTful API có ý nghĩa gì đối với thao tác của client?",
        "options": [
            "Thực hiện một yêu cầu nhiều lần liên tiếp cũng mang lại kết quả trạng thái hệ thống giống hệt như khi chỉ thực hiện một lần duy nhất",
            "Mọi request đều phải trả về kết quả ngẫu nhiên",
            "Request chỉ được phép chạy trong vòng 1 nano giây",
            "Chỉ hỗ trợ phương thức GET"
        ],
        "answer_index": 0,
        "explanation": "Tính lũy đẳng đảm bảo việc gửi lặp lại cùng một request (ví dụ do mạng chập chờn timeout) không gây tác dụng phụ ngoài ý muốn (như trừ tiền tài khoản hai lần). GET, PUT, DELETE vốn có tính lũy đẳng; POST có thể dùng Idempotency-Key.",
        "difficulty": "medium"
    },
    {
        "language": "Architecture",
        "question": "Phương thức phục hồi (Resilience Pattern) nào tự động ngắt các cuộc gọi tới một dịch vụ đang gặp sự cố để tránh gây tắc nghẽn dây chuyền toàn hệ thống?",
        "options": [
            "Circuit Breaker Pattern",
            "Observer Pattern",
            "Decorator Pattern",
            "Prototype Pattern"
        ],
        "answer_index": 0,
        "explanation": "Circuit Breaker giám sát tỷ lệ lỗi: khi số lần gọi thất bại vượt ngưỡng, mạch sẽ 'Open' (ngắt hoàn toàn), trả về fallback ngay lập tức mà không gửi tiếp request tới service đang chết, giúp service đó có thời gian hồi phục.",
        "difficulty": "medium"
    },

    # --- 8. FULLSTACK & KỸ NĂNG PHẦN MỀM (10 câu) ---
    {
        "language": "Fullstack",
        "question": "Điểm khác biệt quan trọng giữa giao thức gRPC và REST API truyền thống qua HTTP/1.1 là gì?",
        "options": [
            "gRPC sử dụng HTTP/2 làm phương thức vận chuyển và Protocol Buffers (dạng nhị phân) để tuần tự hóa dữ liệu, giúp giảm kích thước gói tin và tốc độ nhanh hơn nhiều so với JSON/HTTP 1.1",
            "gRPC chỉ truyền được dữ liệu dạng tệp ảnh",
            "REST API không thể gửi mã trạng thái HTTP",
            "gRPC bắt buộc phải dùng trình duyệt Internet Explorer"
        ],
        "answer_index": 0,
        "explanation": "gRPC sử dụng Protobuf nhị phân siêu gọn nhẹ và HTTP/2 multiplexing, streaming 2 chiều, phù hợp tối ưu cho giao tiếp giữa các microservices nội bộ với độ trễ cực thấp.",
        "difficulty": "medium"
    },
    {
        "language": "Fullstack",
        "question": "Giao thức HTTP/2 mang lại cải tiến đột phá nào so với HTTP/1.1 trong việc tải các tài nguyên trên web?",
        "options": [
            "Multiplexing (Ghép kênh nhiều request và response trên cùng một kết nối TCP duy nhất) và nén tiêu đề HPACK",
            "Bỏ hoàn toàn việc kiểm tra lỗi gói tin",
            "Chỉ truyền được văn bản thô không dấu",
            "Bắt buộc mọi website phải dùng cổng 8080"
        ],
        "answer_index": 0,
        "explanation": "HTTP/1.1 gặp vấn đề Head-of-Line blocking ở tầng HTTP và giới hạn 6 kết nối/domain. HTTP/2 cho phép gửi/nhận đồng thời hàng trăm tài nguyên trên một kết nối TCP duy nhất mà không bị nghẽn.",
        "difficulty": "medium"
    },
    {
        "language": "Fullstack",
        "question": "Khi cần xây dựng tính năng thông báo theo thời gian thực một chiều từ server đẩy xuống client (ví dụ tỷ số bóng đá, thông báo hệ thống), giải pháp nào nhẹ nhàng và tối ưu hơn WebSocket?",
        "options": [
            "Server-Sent Events (SSE)",
            "Long Polling với setInterval 50ms",
            "Tải lại trang web mỗi 3 giây",
            "Gửi email thông báo"
        ],
        "answer_index": 0,
        "explanation": "Server-Sent Events (SSE) hoạt động qua kết nối HTTP chuẩn một chiều từ server xuống client, tự động kết nối lại khi mất mạng và cấu hình đơn giản hơn rất nhiều so với WebSocket 2 chiều phức tạp.",
        "difficulty": "medium"
    },
    {
        "language": "Fullstack",
        "question": "Nguyên lý 'Single Responsibility Principle' (Chữ S trong SOLID) phát biểu điều gì về một module hoặc class?",
        "options": [
            "Một class chỉ nên có duy nhất một lý do để thay đổi (chỉ đảm nhiệm một trách nhiệm duy nhất)",
            "Một file chỉ được phép có tối đa 1 dòng code",
            "Một ứng dụng chỉ được phép có duy nhất một người lập trình",
            "Mọi hàm đều phải trả về giá trị boolean"
        ],
        "answer_index": 0,
        "explanation": "SRP quy định một class hoặc module chỉ nên phục vụ một mục đích hoặc một nhóm tác nhân duy nhất, giúp code dễ đọc, dễ kiểm thử và hạn chế ảnh hưởng lan truyền khi sửa đổi logic.",
        "difficulty": "easy"
    },
    {
        "language": "Fullstack",
        "question": "Trong chỉ số Core Web Vitals của Google, chỉ số LCP (Largest Contentful Paint) đo lường điều gì?",
        "options": [
            "Thời gian cần thiết để phần tử nội dung lớn nhất (hình ảnh chính, khối văn bản lớn) được render hoàn tất trên màn hình của người dùng",
            "Tổng dung lượng RAM mà trình duyệt sử dụng",
            "Số lượng dòng code JavaScript trong trang",
            "Thời gian phản hồi khi người dùng bấm chuột"
        ],
        "answer_index": 0,
        "explanation": "LCP đo lường hiệu năng tải trang cảm nhận của người dùng. Một trang web tốt nên có LCP dưới 2.5 giây kể từ khi bắt đầu nạp trang.",
        "difficulty": "easy"
    },
    {
        "language": "Fullstack",
        "question": "Phương pháp kết xuất (Rendering) nào phù hợp nhất cho các trang thương mại điện tử cần tối ưu hóa công cụ tìm kiếm (SEO) và cập nhật dữ liệu hàng hóa liên tục theo thời gian thực?",
        "options": [
            "Server-Side Rendering (SSR) hoặc Incremental Static Regeneration (ISR)",
            "Client-Side Rendering (CSR) thuần túy với thẻ div root rỗng",
            "Chỉ dùng hình ảnh chụp màn hình không có chữ",
            "Lưu trang web vào tệp PDF"
        ],
        "answer_index": 0,
        "explanation": "SSR render HTML hoàn chỉnh ngay trên server trước khi gửi về client, giúp các bot tìm kiếm (Google, Bing) đọc dữ liệu lập chỉ mục lập tức, và dữ liệu luôn cập nhật mới nhất từ DB.",
        "difficulty": "easy"
    },
    {
        "language": "Fullstack",
        "question": "Quy tắc Semantic Versioning (SemVer) có định dạng MAJOR.MINOR.PATCH (ví dụ 2.4.1). Khi nào bạn CẦN tăng chỉ số MAJOR?",
        "options": [
            "Khi bạn thực hiện các thay đổi không tương thích ngược (Breaking Changes) với phiên bản API trước đó",
            "Khi bạn sửa một lỗi nhỏ bảo mật mà không đổi API",
            "Khi bạn thêm tính năng mới nhưng vẫn tương thích ngược hoàn toàn",
            "Mỗi khi bạn commit code lên GitHub"
        ],
        "answer_index": 0,
        "explanation": "Chuẩn SemVer quy định: PATCH tăng khi sửa bug tương thích; MINOR tăng khi thêm tính năng mới tương thích ngược; MAJOR tăng khi có thay đổi phá vỡ tương thích ngược (Breaking Changes).",
        "difficulty": "easy"
    },
    {
        "language": "Fullstack",
        "question": "Chiến lược di chuyển cơ sở dữ liệu không gián đoạn dịch vụ (Zero-Downtime Migration) thường áp dụng quy trình nào sau đây?",
        "options": [
            "Expand and Contract (Mở rộng trước, chạy song song hỗ trợ code mới/cũ, sau đó Thu hẹp và xóa cột cũ)",
            "Tắt server trong 24 giờ để chạy migrate",
            "Xóa bảng cũ và tạo lại bảng mới ngay lập tức",
            "Đổi tên database trong file cấu hình"
        ],
        "answer_index": 0,
        "explanation": "Quy tắc Expand and Contract: 1. Thêm cột/bảng mới (Expand); 2. Deploy code mới đọc/ghi cả hai; 3. Backfill dữ liệu; 4. Chuyển hoàn toàn sang schema mới; 5. Xóa cột/bảng cũ (Contract).",
        "difficulty": "hard"
    },
    {
        "language": "Fullstack",
        "question": "Chiến lược phân nhánh Git nào ưu tiên việc các lập trình viên tích hợp mã nguồn thường xuyên vào một nhánh chính duy nhất (main/trunk) kết hợp cùng Feature Flags thay vì duy trì các nhánh tính năng lâu ngày?",
        "options": [
            "Trunk-Based Development",
            "GitFlow truyền thống với nhiều nhánh release/hotfix kéo dài",
            "Mỗi người làm một repository riêng không merge",
            "Chỉ làm việc trên nhánh master không có nhánh con"
        ],
        "answer_index": 0,
        "explanation": "Trunk-Based Development khuyến khích commit thường xuyên vào trunk mỗi ngày kết hợp với CI tự động và Feature Flags, tránh 'Merge Hell' của các feature branch kéo dài nhiều tuần.",
        "difficulty": "medium"
    },
    {
        "language": "Fullstack",
        "question": "Trong kiến trúc Clean Architecture, nguyên tắc phụ thuộc (Dependency Rule) quy định luồng phụ thuộc giữa các tầng như thế nào?",
        "options": [
            "Các phụ thuộc mã nguồn chỉ được phép trỏ vào bên trong, hướng về phía các tầng chính sách và logic nghiệp vụ cốt lõi (Domain / Entities)",
            "Tầng Domain phải phụ thuộc trực tiếp vào thư viện Database ORM cụ thể",
            "Mọi tầng đều phải phụ thuộc trực tiếp vào Framework giao diện người dùng",
            "Không có bất kỳ quy tắc nào"
        ],
        "answer_index": 0,
        "explanation": "Dependency Rule là trái tim của Clean Architecture: Các tầng bên ngoài (UI, Frameworks, DB Drivers) phụ thuộc vào Use Cases và Domain bên trong, còn Domain không biết gì về chi tiết kỹ thuật bên ngoài.",
        "difficulty": "hard"
    }
]

def seed_quiz_bank():
    print(f"🚀 Bắt đầu nạp ngân hàng đề thi chuẩn hóa ({len(QUESTIONS_DATA)} câu hỏi)...")
    db = SessionLocal()
    try:
        # Lưu ra file JSON dự phòng dùng chung cho frontend và backend
        json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "quiz_bank.json")
        os.makedirs(os.path.dirname(json_path), exist_ok=True)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(QUESTIONS_DATA, f, ensure_ascii=False, indent=2)
        print(f"✓ Đã lưu file dữ liệu JSON tại: {json_path}")

        # Thống kê câu hỏi hiện tại
        existing_count = db.query(QuizQuestion).count()
        print(f"Số lượng câu hỏi hiện có trong DB: {existing_count}")

        # Nạp câu hỏi vào PostgreSQL (tránh trùng lặp theo question text)
        inserted = 0
        updated = 0
        for item in QUESTIONS_DATA:
            q_text = item["question"].strip()
            existing = db.query(QuizQuestion).filter(QuizQuestion.question == q_text).first()
            if not existing:
                q_obj = QuizQuestion(
                    language=item["language"],
                    question=q_text,
                    options=item["options"],
                    answer_index=item["answer_index"],
                    explanation=item.get("explanation", ""),
                    difficulty=item.get("difficulty", "medium"),
                    source="manual"
                )
                db.add(q_obj)
                inserted += 1
            else:
                existing.language = item["language"]
                existing.options = item["options"]
                existing.answer_index = item["answer_index"]
                existing.explanation = item.get("explanation", "")
                existing.difficulty = item.get("difficulty", "medium")
                updated += 1

        db.commit()
        total_now = db.query(QuizQuestion).count()
        print(f"🎉 Hoàn tất! Đã thêm mới: {inserted}, Cập nhật: {updated}. Tổng số câu hỏi hiện có: {total_now}")

        # In thống kê theo chủ đề
        from collections import Counter
        all_q = db.query(QuizQuestion).all()
        counts = Counter(q.language for q in all_q)
        print("\n📊 Thống kê số lượng câu hỏi theo từng chuyên đề:")
        for topic, count in sorted(counts.items()):
            print(f"  - {topic}: {count} câu")

    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi khi nạp dữ liệu: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_quiz_bank()
