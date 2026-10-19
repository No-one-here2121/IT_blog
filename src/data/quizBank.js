/**
 * Ngan hang cau hoi trac nghiem IT Blog (Fallback & Cache)
 */

export const RAW_QUIZ_TOPICS = [
  {
    "id": "all",
    "title": "Tất cả Đề tài",
    "icon": "🌐",
    "badge": "Toàn diện",
    "description": "Luyện tập tổng hợp câu hỏi từ tất cả các chuyên đề kỹ thuật."
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
];

const RAW_QUIZ_QUESTIONS = [
  {
    "id": 1,
    "question": "Trong React 19, ref được truyền vào function component như thế nào?",
    "options": [
      "Phải dùng forwardRef()",
      "Là một prop bình thường",
      "Chỉ dùng được với class component",
      "Bắt buộc phải qua useContext()"
    ],
    "answer_index": 1,
    "explanation": "Từ React 19, ref đã trở thành một prop bình thường trong function component và không còn cần forwardRef().",
    "difficulty": "easy",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 2,
    "question": "Hook nào quản lý luồng gửi Form Action bất đồng bộ trong React 19?",
    "options": [
      "useEffect",
      "useActionState",
      "useMemo",
      "useRef"
    ],
    "answer_index": 1,
    "explanation": "Hook useActionState() tự động quản lý trạng thái loading, lỗi và kết quả khi thực hiện action bất đồng bộ.",
    "difficulty": "medium",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 3,
    "question": "FastAPI sử dụng thư viện nào làm nền tảng kiểm tra kiểu dữ liệu (data validation) và serialization?",
    "options": [
      "Marshmallow",
      "Pydantic",
      "Django REST Serializer",
      "Cerberus"
    ],
    "answer_index": 1,
    "explanation": "FastAPI tích hợp Pydantic chặt chẽ để validate request body, query params và response schema tự động.",
    "difficulty": "easy",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 4,
    "question": "Mục tiêu cốt lõi của Connection Pooling trong hệ thống Backend là gì?",
    "options": [
      "Mã hóa dữ liệu tại chỗ",
      "Tái sử dụng các kết nối cơ sở dữ liệu đã mở, giảm overhead khởi tạo kết nối TCP/TLS",
      "Tự động phân vùng bảng lớn",
      "Tăng kích thước RAM của máy chủ"
    ],
    "answer_index": 1,
    "explanation": "Khởi tạo kết nối PostgreSQL tốn kém chi phí handshake và auth. Connection Pooling duy trì nhóm kết nối sẵn sàng sử dụng ngay.",
    "difficulty": "medium",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 5,
    "question": "Trong quy trình CI/CD với Docker, Multi-stage Build mang lại lợi ích quan trọng nào?",
    "options": [
      "Cho phép chạy nhiều container cùng một port",
      "Giảm đáng kể kích thước image thành phẩm bằng cách loại bỏ compiler và dev dependencies",
      "Tự động backup dữ liệu container",
      "Thay thế hoàn toàn Kubernetes"
    ],
    "answer_index": 1,
    "explanation": "Multi-stage build tách biệt giai đoạn build và runtime, chỉ copy artifact cần thiết vào image cuối, giúp tối ưu dung lượng và bảo mật.",
    "difficulty": "easy",
    "language": "DevOps",
    "course_id": 4
  },
  {
    "id": 6,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60%?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 7,
    "question": "Trong React 19, cú pháp để sử dụng Form Actions và xử lý trạng thái submit bất đồng bộ là gì?",
    "options": [
      "Sử dụng hook useActionState()",
      "Sử dụng hook useEffect() kết hợp useState()",
      "Bắt buộc dùng Redux Thunk",
      "Dùng useCallback() với ref"
    ],
    "answer_index": 0,
    "explanation": "React 19 giới thiệu hook useActionState để tự động quản lý trạng thái loading, lỗi và kết quả trả về của Form Actions.",
    "difficulty": "medium",
    "language": "React 19",
    "course_id": 3
  },
  {
    "id": 8,
    "question": "FastAPI sử dụng thư viện nào làm nền tảng kiểm tra kiểu dữ liệu (data validation) và serialization?",
    "options": [
      "Marshmallow",
      "Pydantic",
      "Django REST Serializer",
      "Cerberus"
    ],
    "answer_index": 1,
    "explanation": "FastAPI được xây dựng dựa trên Pydantic để thực hiện validation dữ liệu tự động với hiệu năng cao bằng Rust (Pydantic V2).",
    "difficulty": "medium",
    "language": "React 19",
    "course_id": 3
  },
  {
    "id": 9,
    "question": "Mục tiêu cốt lõi của việc thiết lập Connection Pooling trong PostgreSQL / SQLAlchemy 2.0 là gì?",
    "options": [
      "Mã hóa dữ liệu tại chỗ",
      "Tái sử dụng các kết nối cơ sở dữ liệu đã mở, giảm overhead khởi tạo kết nối TCP/TLS",
      "Tự động phân vùng bảng lớn",
      "Tăng kích thước RAM của máy chủ"
    ],
    "answer_index": 1,
    "explanation": "Khởi tạo kết nối PostgreSQL tốn kém tài nguyên. Connection Pooling duy trì một nhóm kết nối sẵn sàng để tái sử dụng ngay lập tức.",
    "difficulty": "medium",
    "language": "React 19",
    "course_id": 3
  },
  {
    "id": 10,
    "question": "Trong kiến trúc Microservices, Pattern nào thường được sử dụng để duy trì tính nhất quán dữ liệu giữa các dịch vụ phân tán?",
    "options": [
      "Singleton Pattern",
      "Saga Pattern (Choreography hoặc Orchestration)",
      "Factory Pattern",
      "Decorator Pattern"
    ],
    "answer_index": 1,
    "explanation": "Saga Pattern chia transaction phân tán thành chuỗi các local transaction với các giao dịch bù trừ (compensating transactions) khi có lỗi.",
    "difficulty": "medium",
    "language": "React 19",
    "course_id": 3
  },
  {
    "id": 11,
    "question": "Trong quy trình CI/CD với Docker, Multi-stage Build mang lại lợi ích quan trọng nào?",
    "options": [
      "Cho phép chạy nhiều container cùng một port",
      "Giảm đáng kể kích thước image thành phẩm bằng cách loại bỏ compiler và dev dependencies",
      "Tự động backup dữ liệu container",
      "Thay thế hoàn toàn Kubernetes"
    ],
    "answer_index": 1,
    "explanation": "Multi-stage build tách biệt giai đoạn build và runtime, chỉ copy artifact cần thiết vào image cuối, giúp tối ưu dung lượng và bảo mật.",
    "difficulty": "medium",
    "language": "React 19",
    "course_id": 3
  },
  {
    "id": 12,
    "question": "Trong kỹ thuật viết Dockerfile cho ứng dụng sản phẩm (Production), Multi-stage Build mang lại lợi ích cốt lõi nào?",
    "options": [
      "Tự động backup dữ liệu container lên đám mây",
      "Cho phép nhiều container cùng chạy trên một cổng mạng duy nhất mà không bị xung đột",
      "Giảm đáng kể dung lượng Docker Image thành phẩm bằng cách tách biệt môi trường build và runtime, loại bỏ công cụ biên dịch thừa",
      "Thay thế hoàn toàn cụm Kubernetes"
    ],
    "answer_index": 2,
    "explanation": "Multi-stage build chỉ copy kết quả build cần thiết sang image runtime siêu nhẹ (như alpine hay distroless), giúp image nhẹ hơn và an toàn hơn.",
    "difficulty": "medium",
    "language": "Docker",
    "course_id": 4
  },
  {
    "id": 13,
    "question": "Trong tệp cấu hình GitHub Actions Workflow (`.github/workflows/*.yml`), chỉ thị `on:` có nhiệm vụ gì?",
    "options": [
      "Cài đặt hệ điều hành cho máy tính cá nhân của lập trình viên",
      "Thiết lập mật khẩu đăng nhập vào máy chủ",
      "Định nghĩa các sự kiện kích hoạt quy trình CI/CD (ví dụ: push, pull_request, schedule)",
      "Chỉ định danh sách người nhận email báo cáo kết quả"
    ],
    "answer_index": 2,
    "explanation": "Chỉ thị 'on:' xác định các trigger (sự kiện) cụ thể trên kho mã nguồn GitHub sẽ làm quy trình CI/CD tự động khởi chạy.",
    "difficulty": "easy",
    "language": "CI/CD",
    "course_id": 4
  },
  {
    "id": 14,
    "question": "Sự khác biệt cơ bản nhất giữa Docker Container và Máy ảo truyền thống (Virtual Machine) là gì?",
    "options": [
      "Container luôn yêu cầu cài đặt đầy đủ một Guest OS riêng biệt",
      "Container bắt buộc phải có card đồ họa rời GPU mới chạy được",
      "Máy ảo không thể chạy ứng dụng web",
      "Container chia sẻ chung nhân hệ điều hành (Host OS Kernel) nên khởi động tính bằng giây và tiêu thụ ít RAM hơn rất nhiều so với máy ảo"
    ],
    "answer_index": 3,
    "explanation": "Container đóng gói ứng dụng với user-space libraries nhưng dùng chung kernel của máy chủ, giúp khởi động gần như tức thì và cực kỳ tiết kiệm tài nguyên.",
    "difficulty": "easy",
    "language": "Docker",
    "course_id": 4
  },
  {
    "id": 15,
    "question": "Trong Docker Compose (`docker-compose.yml`), thuộc tính `volumes:` thường được khai báo với mục đích gì?",
    "options": [
      "Tự động tăng RAM ảo cho container khi bị quá tải",
      "Điều chỉnh âm lượng âm thanh của hệ thống máy chủ",
      "Duy trì dữ liệu bền vững (persistence) bên ngoài vòng đời của container (như dữ liệu database)",
      "Giới hạn tốc độ băng thông internet của ứng dụng"
    ],
    "answer_index": 2,
    "explanation": "Dữ liệu bên trong container mặc định là tạm thời (ephemeral). Volumes ánh xạ thư mục ra máy chủ host để dữ liệu không bị mất khi container khởi động lại.",
    "difficulty": "easy",
    "language": "Docker",
    "course_id": 4
  },
  {
    "id": 16,
    "question": "Lệnh Docker nào được sử dụng để xây dựng một image từ Dockerfile trong thư mục hiện tại và gắn thẻ (tag) định danh tên cho image đó?",
    "options": [
      "docker commit my-app",
      "docker run -d my-app",
      "docker build -t my-app:latest .",
      "docker pull my-app"
    ],
    "answer_index": 2,
    "explanation": "Lệnh 'docker build -t <tên:tag> <đường_dẫn>' thực hiện đọc Dockerfile, thực thi các bước hướng dẫn và đóng gói thành image hoàn chỉnh.",
    "difficulty": "easy",
    "language": "Docker",
    "course_id": 4
  },
  {
    "id": 17,
    "question": "Trong React 19, hook nào được chuẩn hóa để xử lý Form Actions và tự động quản lý các trạng thái pending, error và kết quả trả về?",
    "options": [
      "useMemo() với dependency array",
      "useReducer() truyền thống",
      "useActionState()",
      "useEffect() kết hợp useState()"
    ],
    "answer_index": 2,
    "explanation": "React 19 giới thiệu hook useActionState giúp đơn giản hóa việc submit form và quản lý trạng thái tải/lỗi mà không cần viết boilerplate thủ công.",
    "difficulty": "medium",
    "language": "React 19",
    "course_id": 3
  },
  {
    "id": 18,
    "question": "Trong Tailwind CSS v4, tính năng cấu hình giao diện mới nào thay thế cho tệp `tailwind.config.js` truyền thống?",
    "options": [
      "Cấu hình trực tiếp bằng CSS-first với chỉ thị `@theme` trong tệp CSS chính",
      "Sử dụng tệp XML riêng biệt mang tên `tailwind.xml`",
      "Chuyển toàn bộ cấu hình sang biến môi trường `.env`",
      "Bắt buộc cấu hình qua runtime JavaScript inline"
    ],
    "answer_index": 0,
    "explanation": "Tailwind CSS v4 chuyển sang kiến trúc CSS-first sử dụng chỉ thị @theme trực tiếp trong CSS, giúp tăng tốc độ build bằng Lightning CSS.",
    "difficulty": "medium",
    "language": "Tailwind CSS",
    "course_id": 3
  },
  {
    "id": 19,
    "question": "Khái niệm Virtual DOM (DOM ảo) trong React có mục đích cốt lõi là gì?",
    "options": [
      "Tối ưu hiệu năng bằng cách tính toán sự khác biệt (diffing) trong bộ nhớ trước khi áp dụng thay đổi tối thiểu lên Real DOM",
      "Thay thế hoàn toàn bộ nhớ RAM của trình duyệt",
      "Tự động chuyển đổi code JSX sang ngôn ngữ C++",
      "Mã hóa bảo mật mã nguồn JavaScript trên máy khách"
    ],
    "answer_index": 0,
    "explanation": "Thao tác trên DOM thật rất chậm; React dùng Virtual DOM để so sánh (Reconciliation) và chỉ cập nhật những node thực sự thay đổi trên DOM thật.",
    "difficulty": "easy",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 20,
    "question": "Quy tắc quan trọng (Rule of Hooks) nào trong React bắt buộc lập trình viên phải tuân thủ?",
    "options": [
      "Bắt buộc đặt tên Hook bắt đầu bằng chữ 'get' thay vì 'use'",
      "Mọi Hook đều phải được khai báo trong Class Component",
      "Chỉ gọi Hooks ở cấp cao nhất của Functional Component, không gọi trong vòng lặp (loop), câu lệnh điều kiện (if) hay hàm lồng nhau",
      "Không được phép truyền tham số vào React Hook"
    ],
    "answer_index": 2,
    "explanation": "Quy tắc này đảm bảo các React Hooks luôn được thực thi theo cùng một thứ tự ở mỗi lần component re-render.",
    "difficulty": "easy",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 21,
    "question": "Trong React 19, thẻ `<form action={...}>` có thể nhận trực tiếp loại giá trị nào để thực thi cả ở máy chủ (Server Action) hoặc máy khách (Client Action)?",
    "options": [
      "Một hàm bất đồng bộ (Async Function) xử lý dữ liệu Form",
      "Bắt buộc phải truyền một biến Boolean true/false",
      "Chỉ chấp nhận đối tượng JSON tĩnh",
      "Chỉ nhận một chuỗi URL string trỏ tới endpoint backend"
    ],
    "answer_index": 0,
    "explanation": "React 19 nâng cấp thuộc tính action của thẻ form cho phép truyền trực tiếp function xử lý dữ liệu tự động tích hợp với useActionState.",
    "difficulty": "medium",
    "language": "React 19",
    "course_id": 3
  },
  {
    "id": 22,
    "question": "Trong kiến trúc xây dựng website cơ bản, ngôn ngữ nào đóng vai trò xác định 'bộ khung xương' và cấu trúc ngữ nghĩa của trang web?",
    "options": [
      "JavaScript (JS Engine)",
      "HTML (HyperText Markup Language)",
      "SQL (Structured Query Language)",
      "CSS (Cascading Style Sheets)"
    ],
    "answer_index": 1,
    "explanation": "HTML cung cấp cấu trúc ngữ nghĩa bằng các phần tử (tags/elements) để trình duyệt hiển thị đúng nội dung văn bản, ảnh, video của website.",
    "difficulty": "easy",
    "language": "HTML/Web",
    "course_id": 1
  },
  {
    "id": 23,
    "question": "Thẻ `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">` trong phần `<head>` của trang web có vai trò cốt lõi nào?",
    "options": [
      "Kích hoạt nạp tệp JavaScript bất đồng bộ",
      "Tự động làm mới trang web sau mỗi 10 giây",
      "Đảm bảo website hiển thị thích ứng chuẩn xác (Responsive) trên màn hình thiết bị di động",
      "Mã hóa bảo mật toàn bộ dữ liệu người dùng gửi lên"
    ],
    "answer_index": 2,
    "explanation": "Thẻ meta viewport thiết lập kích thước vùng nhìn bằng với độ rộng thiết bị và tỷ lệ phóng đại ban đầu là 1.0, là chuẩn mực bắt buộc cho thiết kế Web thích ứng.",
    "difficulty": "easy",
    "language": "HTML5",
    "course_id": 1
  },
  {
    "id": 24,
    "question": "Trong CSS hiện đại, thuộc tính nào được sử dụng để kích hoạt mô hình dàn trang 1 chiều linh hoạt, tự động căn chỉnh và phân bổ không gian giữa các phần tử?",
    "options": [
      "display: inline",
      "position: absolute",
      "float: left",
      "display: flex"
    ],
    "answer_index": 3,
    "explanation": "Mô hình Flexbox (display: flex) cho phép thiết kế giao diện linh hoạt, dễ dàng căn giữa (justify-content, align-items) và co giãn theo kích thước khung chứa.",
    "difficulty": "medium",
    "language": "CSS3",
    "course_id": 1
  },
  {
    "id": 25,
    "question": "Vai trò quan trọng nhất của ngôn ngữ JavaScript khi chạy trên trình duyệt web là gì?",
    "options": [
      "Quản lý việc lưu trữ bảng dữ liệu quan hệ tại máy chủ database",
      "Biên dịch mã HTML sang mã nhị phân của hệ điều hành",
      "Định dạng màu sắc, font chữ và căn chỉnh lề margin cho trang web",
      "Bắt các sự kiện tương tác của người dùng, thực thi logic nghiệp vụ và cập nhật cây cấu trúc DOM động"
    ],
    "answer_index": 3,
    "explanation": "JavaScript mang lại tính tương tác cho trang web, cho phép phản hồi các thao tác như click, gõ phím, kéo thả và gọi API lấy dữ liệu mà không cần tải lại trang.",
    "difficulty": "easy",
    "language": "JavaScript",
    "course_id": 1
  },
  {
    "id": 26,
    "question": "Giao thức truyền tải web an toàn sử dụng cổng chuẩn 443 kết hợp chứng chỉ số TLS/SSL để mã hóa đường truyền dữ liệu là gì?",
    "options": [
      "FTP (File Transfer Protocol - cổng 21)",
      "HTTPS (HyperText Transfer Protocol Secure)",
      "HTTP không mã hóa (cổng 80)",
      "Telnet (cổng 23)"
    ],
    "answer_index": 1,
    "explanation": "HTTPS mã hóa toàn bộ dữ liệu trao đổi giữa trình duyệt của người dùng và máy chủ, ngăn chặn nghe lén thông tin và bảo vệ quyền riêng tư.",
    "difficulty": "easy",
    "language": "Web Security",
    "course_id": 1
  },
  {
    "id": 27,
    "question": "Trong kiến trúc xây dựng website cơ bản, ngôn ngữ nào đóng vai trò xác định 'bộ khung xương' và cấu trúc ngữ nghĩa của trang web?",
    "options": [
      "SQL (Structured Query Language)",
      "JavaScript (JS Engine)",
      "HTML (HyperText Markup Language)",
      "CSS (Cascading Style Sheets)"
    ],
    "answer_index": 2,
    "explanation": "HTML cung cấp cấu trúc ngữ nghĩa bằng các phần tử (tags/elements) để trình duyệt hiển thị đúng nội dung văn bản, ảnh, video của website.",
    "difficulty": "easy",
    "language": "HTML/Web",
    "course_id": 1
  },
  {
    "id": 28,
    "question": "Thẻ `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">` trong phần `<head>` của trang web có vai trò cốt lõi nào?",
    "options": [
      "Đảm bảo website hiển thị thích ứng chuẩn xác (Responsive) trên màn hình thiết bị di động",
      "Tự động làm mới trang web sau mỗi 10 giây",
      "Mã hóa bảo mật toàn bộ dữ liệu người dùng gửi lên",
      "Kích hoạt nạp tệp JavaScript bất đồng bộ"
    ],
    "answer_index": 0,
    "explanation": "Thẻ meta viewport thiết lập kích thước vùng nhìn bằng với độ rộng thiết bị và tỷ lệ phóng đại ban đầu là 1.0, là chuẩn mực bắt buộc cho thiết kế Web thích ứng.",
    "difficulty": "easy",
    "language": "HTML5",
    "course_id": 1
  },
  {
    "id": 29,
    "question": "Trong CSS hiện đại, thuộc tính nào được sử dụng để kích hoạt mô hình dàn trang 1 chiều linh hoạt, tự động căn chỉnh và phân bổ không gian giữa các phần tử?",
    "options": [
      "display: flex",
      "position: absolute",
      "display: inline",
      "float: left"
    ],
    "answer_index": 0,
    "explanation": "Mô hình Flexbox (display: flex) cho phép thiết kế giao diện linh hoạt, dễ dàng căn giữa (justify-content, align-items) và co giãn theo kích thước khung chứa.",
    "difficulty": "medium",
    "language": "CSS3",
    "course_id": 1
  },
  {
    "id": 30,
    "question": "Vai trò quan trọng nhất của ngôn ngữ JavaScript khi chạy trên trình duyệt web là gì?",
    "options": [
      "Quản lý việc lưu trữ bảng dữ liệu quan hệ tại máy chủ database",
      "Biên dịch mã HTML sang mã nhị phân của hệ điều hành",
      "Định dạng màu sắc, font chữ và căn chỉnh lề margin cho trang web",
      "Bắt các sự kiện tương tác của người dùng, thực thi logic nghiệp vụ và cập nhật cây cấu trúc DOM động"
    ],
    "answer_index": 3,
    "explanation": "JavaScript mang lại tính tương tác cho trang web, cho phép phản hồi các thao tác như click, gõ phím, kéo thả và gọi API lấy dữ liệu mà không cần tải lại trang.",
    "difficulty": "easy",
    "language": "JavaScript",
    "course_id": 1
  },
  {
    "id": 31,
    "question": "Giao thức truyền tải web an toàn sử dụng cổng chuẩn 443 kết hợp chứng chỉ số TLS/SSL để mã hóa đường truyền dữ liệu là gì?",
    "options": [
      "HTTPS (HyperText Transfer Protocol Secure)",
      "Telnet (cổng 23)",
      "HTTP không mã hóa (cổng 80)",
      "FTP (File Transfer Protocol - cổng 21)"
    ],
    "answer_index": 0,
    "explanation": "HTTPS mã hóa toàn bộ dữ liệu trao đổi giữa trình duyệt của người dùng và máy chủ, ngăn chặn nghe lén thông tin và bảo vệ quyền riêng tư.",
    "difficulty": "easy",
    "language": "Web Security",
    "course_id": 1
  },
  {
    "id": 32,
    "question": "Trong kỹ thuật viết Dockerfile cho ứng dụng sản phẩm (Production), Multi-stage Build mang lại lợi ích cốt lõi nào?",
    "options": [
      "Cho phép nhiều container cùng chạy trên một cổng mạng duy nhất mà không bị xung đột",
      "Thay thế hoàn toàn cụm Kubernetes",
      "Giảm đáng kể dung lượng Docker Image thành phẩm bằng cách tách biệt môi trường build và runtime, loại bỏ công cụ biên dịch thừa",
      "Tự động backup dữ liệu container lên đám mây"
    ],
    "answer_index": 2,
    "explanation": "Multi-stage build chỉ copy kết quả build cần thiết sang image runtime siêu nhẹ (như alpine hay distroless), giúp image nhẹ hơn và an toàn hơn.",
    "difficulty": "medium",
    "language": "Docker",
    "course_id": 4
  },
  {
    "id": 33,
    "question": "Trong tệp cấu hình GitHub Actions Workflow (`.github/workflows/*.yml`), chỉ thị `on:` có nhiệm vụ gì?",
    "options": [
      "Cài đặt hệ điều hành cho máy tính cá nhân của lập trình viên",
      "Thiết lập mật khẩu đăng nhập vào máy chủ",
      "Định nghĩa các sự kiện kích hoạt quy trình CI/CD (ví dụ: push, pull_request, schedule)",
      "Chỉ định danh sách người nhận email báo cáo kết quả"
    ],
    "answer_index": 2,
    "explanation": "Chỉ thị 'on:' xác định các trigger (sự kiện) cụ thể trên kho mã nguồn GitHub sẽ làm quy trình CI/CD tự động khởi chạy.",
    "difficulty": "easy",
    "language": "CI/CD",
    "course_id": 4
  },
  {
    "id": 34,
    "question": "Sự khác biệt cơ bản nhất giữa Docker Container và Máy ảo truyền thống (Virtual Machine) là gì?",
    "options": [
      "Container bắt buộc phải có card đồ họa rời GPU mới chạy được",
      "Container chia sẻ chung nhân hệ điều hành (Host OS Kernel) nên khởi động tính bằng giây và tiêu thụ ít RAM hơn rất nhiều so với máy ảo",
      "Container luôn yêu cầu cài đặt đầy đủ một Guest OS riêng biệt",
      "Máy ảo không thể chạy ứng dụng web"
    ],
    "answer_index": 1,
    "explanation": "Container đóng gói ứng dụng với user-space libraries nhưng dùng chung kernel của máy chủ, giúp khởi động gần như tức thì và cực kỳ tiết kiệm tài nguyên.",
    "difficulty": "easy",
    "language": "Docker",
    "course_id": 4
  },
  {
    "id": 35,
    "question": "Trong Docker Compose (`docker-compose.yml`), thuộc tính `volumes:` thường được khai báo với mục đích gì?",
    "options": [
      "Điều chỉnh âm lượng âm thanh của hệ thống máy chủ",
      "Tự động tăng RAM ảo cho container khi bị quá tải",
      "Giới hạn tốc độ băng thông internet của ứng dụng",
      "Duy trì dữ liệu bền vững (persistence) bên ngoài vòng đời của container (như dữ liệu database)"
    ],
    "answer_index": 3,
    "explanation": "Dữ liệu bên trong container mặc định là tạm thời (ephemeral). Volumes ánh xạ thư mục ra máy chủ host để dữ liệu không bị mất khi container khởi động lại.",
    "difficulty": "easy",
    "language": "Docker",
    "course_id": 4
  },
  {
    "id": 36,
    "question": "Lệnh Docker nào được sử dụng để xây dựng một image từ Dockerfile trong thư mục hiện tại và gắn thẻ (tag) định danh tên cho image đó?",
    "options": [
      "docker build -t my-app:latest .",
      "docker pull my-app",
      "docker run -d my-app",
      "docker commit my-app"
    ],
    "answer_index": 0,
    "explanation": "Lệnh 'docker build -t <tên:tag> <đường_dẫn>' thực hiện đọc Dockerfile, thực thi các bước hướng dẫn và đóng gói thành image hoàn chỉnh.",
    "difficulty": "easy",
    "language": "Docker",
    "course_id": 4
  },
  {
    "id": 37,
    "question": "FastAPI sử dụng thư viện nào làm nền tảng kiểm tra kiểu dữ liệu (Data Validation) và tự động sinh Swagger OpenAPI documentation?",
    "options": [
      "Marshmallow",
      "Pydantic (Pydantic V2 được viết lại bằng Rust)",
      "Cerberus",
      "Django Forms Serializer"
    ],
    "answer_index": 1,
    "explanation": "FastAPI được xây dựng dựa trên Pydantic để thực hiện validation dữ liệu tự động với hiệu năng cực cao và kiểu dữ liệu Python chuẩn (type hints).",
    "difficulty": "easy",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 38,
    "question": "Trong FastAPI, cơ chế nào cho phép tái sử dụng logic dùng chung như xác thực quyền (authentication), kết nối CSDL và xử lý phân quyền?",
    "options": [
      "Sử dụng biến static trong Class Singleton",
      "Hệ thống Dependency Injection thông qua hàm `Depends()`",
      "Bắt buộc dùng decorators `@property` lồng nhau",
      "Ghi đè thuộc tính toàn cục `__globals__`"
    ],
    "answer_index": 1,
    "explanation": "FastAPI có hệ thống Dependency Injection mạnh mẽ và trực quan thông qua Depends(), giúp inject DB Session, current user rất sạch sẽ và dễ test.",
    "difficulty": "medium",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 39,
    "question": "Mục đích quan trọng nhất của việc sử dụng Connection Pooling (nhóm kết nối) trong PostgreSQL với SQLAlchemy là gì?",
    "options": [
      "Tái sử dụng các kết nối cơ sở dữ liệu đã mở, giảm chi phí overhead khởi tạo kết nối TCP/TLS tốn kém",
      "Xóa bỏ hoàn toàn nhu cầu đánh Index cho bảng dữ liệu",
      "Tự động mã hóa toàn bộ ổ đĩa cứng của server database",
      "Tăng tốc độ mạng internet của máy tính client"
    ],
    "answer_index": 0,
    "explanation": "Khởi tạo kết nối mới tới PostgreSQL tiêu tốn nhiều tài nguyên CPU và RAM. Connection Pool duy trì sẵn các kết nối mở để tái sử dụng ngay lập tức.",
    "difficulty": "medium",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 40,
    "question": "Trong kiến trúc Microservices phân tán, Pattern nào thường được sử dụng để quản lý các transaction liên quan đến nhiều service mà không cần dùng Two-Phase Commit (2PC)?",
    "options": [
      "Factory Pattern",
      "Saga Pattern (Choreography hoặc Orchestration)",
      "Singleton Pattern",
      "Observer Pattern"
    ],
    "answer_index": 1,
    "explanation": "Saga Pattern chia transaction phân tán thành chuỗi các local transaction với các giao dịch bù trừ (compensating transactions) khi xảy ra lỗi.",
    "difficulty": "hard",
    "language": "Architecture",
    "course_id": 2
  },
  {
    "id": 41,
    "question": "Khái niệm `async / await` trong Python và FastAPI mang lại lợi ích gì cho các tác vụ I/O bound (gọi database, HTTP API ngoài)?",
    "options": [
      "Tăng xung nhịp phần cứng CPU của máy chủ",
      "Tự động biên dịch mã nguồn Python sang Java",
      "Bỏ qua hoàn toàn việc kiểm tra lỗi runtime",
      "Cho phép một tiến trình xử lý hàng ngàn request đồng thời (non-blocking concurrency) mà không bị block luồng khi đợi I/O"
    ],
    "answer_index": 3,
    "explanation": "Asyncio giải phóng Event Loop khi đang chờ phản hồi từ CSDL hay network I/O, giúp server tiếp tục phục vụ các request khác song song.",
    "difficulty": "medium",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 42,
    "question": "Trong React 19, hook nào được chuẩn hóa để xử lý Form Actions và tự động quản lý các trạng thái pending, error và kết quả trả về?",
    "options": [
      "useActionState()",
      "useReducer() truyền thống",
      "useEffect() kết hợp useState()",
      "useMemo() với dependency array"
    ],
    "answer_index": 0,
    "explanation": "React 19 giới thiệu hook useActionState giúp đơn giản hóa việc submit form và quản lý trạng thái tải/lỗi mà không cần viết boilerplate thủ công.",
    "difficulty": "medium",
    "language": "React 19",
    "course_id": 3
  },
  {
    "id": 43,
    "question": "Trong Tailwind CSS v4, tính năng cấu hình giao diện mới nào thay thế cho tệp `tailwind.config.js` truyền thống?",
    "options": [
      "Bắt buộc cấu hình qua runtime JavaScript inline",
      "Sử dụng tệp XML riêng biệt mang tên `tailwind.xml`",
      "Cấu hình trực tiếp bằng CSS-first với chỉ thị `@theme` trong tệp CSS chính",
      "Chuyển toàn bộ cấu hình sang biến môi trường `.env`"
    ],
    "answer_index": 2,
    "explanation": "Tailwind CSS v4 chuyển sang kiến trúc CSS-first sử dụng chỉ thị @theme trực tiếp trong CSS, giúp tăng tốc độ build bằng Lightning CSS.",
    "difficulty": "medium",
    "language": "Tailwind CSS",
    "course_id": 3
  },
  {
    "id": 44,
    "question": "Khái niệm Virtual DOM (DOM ảo) trong React có mục đích cốt lõi là gì?",
    "options": [
      "Tối ưu hiệu năng bằng cách tính toán sự khác biệt (diffing) trong bộ nhớ trước khi áp dụng thay đổi tối thiểu lên Real DOM",
      "Tự động chuyển đổi code JSX sang ngôn ngữ C++",
      "Thay thế hoàn toàn bộ nhớ RAM của trình duyệt",
      "Mã hóa bảo mật mã nguồn JavaScript trên máy khách"
    ],
    "answer_index": 0,
    "explanation": "Thao tác trên DOM thật rất chậm; React dùng Virtual DOM để so sánh (Reconciliation) và chỉ cập nhật những node thực sự thay đổi trên DOM thật.",
    "difficulty": "easy",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 45,
    "question": "Quy tắc quan trọng (Rule of Hooks) nào trong React bắt buộc lập trình viên phải tuân thủ?",
    "options": [
      "Chỉ gọi Hooks ở cấp cao nhất của Functional Component, không gọi trong vòng lặp (loop), câu lệnh điều kiện (if) hay hàm lồng nhau",
      "Mọi Hook đều phải được khai báo trong Class Component",
      "Bắt buộc đặt tên Hook bắt đầu bằng chữ 'get' thay vì 'use'",
      "Không được phép truyền tham số vào React Hook"
    ],
    "answer_index": 0,
    "explanation": "Quy tắc này đảm bảo các React Hooks luôn được thực thi theo cùng một thứ tự ở mỗi lần component re-render.",
    "difficulty": "easy",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 46,
    "question": "Trong React 19, thẻ `<form action={...}>` có thể nhận trực tiếp loại giá trị nào để thực thi cả ở máy chủ (Server Action) hoặc máy khách (Client Action)?",
    "options": [
      "Một hàm bất đồng bộ (Async Function) xử lý dữ liệu Form",
      "Bắt buộc phải truyền một biến Boolean true/false",
      "Chỉ chấp nhận đối tượng JSON tĩnh",
      "Chỉ nhận một chuỗi URL string trỏ tới endpoint backend"
    ],
    "answer_index": 0,
    "explanation": "React 19 nâng cấp thuộc tính action của thẻ form cho phép truyền trực tiếp function xử lý dữ liệu tự động tích hợp với useActionState.",
    "difficulty": "medium",
    "language": "React 19",
    "course_id": 3
  },
  {
    "id": 47,
    "question": "Trong kiến trúc xây dựng website cơ bản, ngôn ngữ nào đóng vai trò xác định 'bộ khung xương' và cấu trúc ngữ nghĩa của trang web?",
    "options": [
      "HTML (HyperText Markup Language)",
      "JavaScript (JS Engine)",
      "SQL (Structured Query Language)",
      "CSS (Cascading Style Sheets)"
    ],
    "answer_index": 0,
    "explanation": "HTML cung cấp cấu trúc ngữ nghĩa bằng các phần tử (tags/elements) để trình duyệt hiển thị đúng nội dung văn bản, ảnh, video của website.",
    "difficulty": "easy",
    "language": "HTML/Web",
    "course_id": 1
  },
  {
    "id": 48,
    "question": "Thẻ `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">` trong phần `<head>` của trang web có vai trò cốt lõi nào?",
    "options": [
      "Mã hóa bảo mật toàn bộ dữ liệu người dùng gửi lên",
      "Kích hoạt nạp tệp JavaScript bất đồng bộ",
      "Tự động làm mới trang web sau mỗi 10 giây",
      "Đảm bảo website hiển thị thích ứng chuẩn xác (Responsive) trên màn hình thiết bị di động"
    ],
    "answer_index": 3,
    "explanation": "Thẻ meta viewport thiết lập kích thước vùng nhìn bằng với độ rộng thiết bị và tỷ lệ phóng đại ban đầu là 1.0, là chuẩn mực bắt buộc cho thiết kế Web thích ứng.",
    "difficulty": "easy",
    "language": "HTML5",
    "course_id": 1
  },
  {
    "id": 49,
    "question": "Trong CSS hiện đại, thuộc tính nào được sử dụng để kích hoạt mô hình dàn trang 1 chiều linh hoạt, tự động căn chỉnh và phân bổ không gian giữa các phần tử?",
    "options": [
      "display: inline",
      "float: left",
      "position: absolute",
      "display: flex"
    ],
    "answer_index": 3,
    "explanation": "Mô hình Flexbox (display: flex) cho phép thiết kế giao diện linh hoạt, dễ dàng căn giữa (justify-content, align-items) và co giãn theo kích thước khung chứa.",
    "difficulty": "medium",
    "language": "CSS3",
    "course_id": 1
  },
  {
    "id": 50,
    "question": "Vai trò quan trọng nhất của ngôn ngữ JavaScript khi chạy trên trình duyệt web là gì?",
    "options": [
      "Định dạng màu sắc, font chữ và căn chỉnh lề margin cho trang web",
      "Biên dịch mã HTML sang mã nhị phân của hệ điều hành",
      "Bắt các sự kiện tương tác của người dùng, thực thi logic nghiệp vụ và cập nhật cây cấu trúc DOM động",
      "Quản lý việc lưu trữ bảng dữ liệu quan hệ tại máy chủ database"
    ],
    "answer_index": 2,
    "explanation": "JavaScript mang lại tính tương tác cho trang web, cho phép phản hồi các thao tác như click, gõ phím, kéo thả và gọi API lấy dữ liệu mà không cần tải lại trang.",
    "difficulty": "easy",
    "language": "JavaScript",
    "course_id": 1
  },
  {
    "id": 51,
    "question": "Giao thức truyền tải web an toàn sử dụng cổng chuẩn 443 kết hợp chứng chỉ số TLS/SSL để mã hóa đường truyền dữ liệu là gì?",
    "options": [
      "HTTPS (HyperText Transfer Protocol Secure)",
      "Telnet (cổng 23)",
      "HTTP không mã hóa (cổng 80)",
      "FTP (File Transfer Protocol - cổng 21)"
    ],
    "answer_index": 0,
    "explanation": "HTTPS mã hóa toàn bộ dữ liệu trao đổi giữa trình duyệt của người dùng và máy chủ, ngăn chặn nghe lén thông tin và bảo vệ quyền riêng tư.",
    "difficulty": "easy",
    "language": "Web Security",
    "course_id": 1
  },
  {
    "id": 52,
    "question": "Trong kỹ thuật viết Dockerfile cho ứng dụng sản phẩm (Production), Multi-stage Build mang lại lợi ích cốt lõi nào?",
    "options": [
      "Tự động backup dữ liệu container lên đám mây",
      "Thay thế hoàn toàn cụm Kubernetes",
      "Cho phép nhiều container cùng chạy trên một cổng mạng duy nhất mà không bị xung đột",
      "Giảm đáng kể dung lượng Docker Image thành phẩm bằng cách tách biệt môi trường build và runtime, loại bỏ công cụ biên dịch thừa"
    ],
    "answer_index": 3,
    "explanation": "Multi-stage build chỉ copy kết quả build cần thiết sang image runtime siêu nhẹ (như alpine hay distroless), giúp image nhẹ hơn và an toàn hơn.",
    "difficulty": "medium",
    "language": "Docker",
    "course_id": 4
  },
  {
    "id": 53,
    "question": "Trong tệp cấu hình GitHub Actions Workflow (`.github/workflows/*.yml`), chỉ thị `on:` có nhiệm vụ gì?",
    "options": [
      "Chỉ định danh sách người nhận email báo cáo kết quả",
      "Thiết lập mật khẩu đăng nhập vào máy chủ",
      "Định nghĩa các sự kiện kích hoạt quy trình CI/CD (ví dụ: push, pull_request, schedule)",
      "Cài đặt hệ điều hành cho máy tính cá nhân của lập trình viên"
    ],
    "answer_index": 2,
    "explanation": "Chỉ thị 'on:' xác định các trigger (sự kiện) cụ thể trên kho mã nguồn GitHub sẽ làm quy trình CI/CD tự động khởi chạy.",
    "difficulty": "easy",
    "language": "CI/CD",
    "course_id": 4
  },
  {
    "id": 54,
    "question": "Sự khác biệt cơ bản nhất giữa Docker Container và Máy ảo truyền thống (Virtual Machine) là gì?",
    "options": [
      "Container chia sẻ chung nhân hệ điều hành (Host OS Kernel) nên khởi động tính bằng giây và tiêu thụ ít RAM hơn rất nhiều so với máy ảo",
      "Máy ảo không thể chạy ứng dụng web",
      "Container bắt buộc phải có card đồ họa rời GPU mới chạy được",
      "Container luôn yêu cầu cài đặt đầy đủ một Guest OS riêng biệt"
    ],
    "answer_index": 0,
    "explanation": "Container đóng gói ứng dụng với user-space libraries nhưng dùng chung kernel của máy chủ, giúp khởi động gần như tức thì và cực kỳ tiết kiệm tài nguyên.",
    "difficulty": "easy",
    "language": "Docker",
    "course_id": 4
  },
  {
    "id": 55,
    "question": "Trong Docker Compose (`docker-compose.yml`), thuộc tính `volumes:` thường được khai báo với mục đích gì?",
    "options": [
      "Giới hạn tốc độ băng thông internet của ứng dụng",
      "Điều chỉnh âm lượng âm thanh của hệ thống máy chủ",
      "Tự động tăng RAM ảo cho container khi bị quá tải",
      "Duy trì dữ liệu bền vững (persistence) bên ngoài vòng đời của container (như dữ liệu database)"
    ],
    "answer_index": 3,
    "explanation": "Dữ liệu bên trong container mặc định là tạm thời (ephemeral). Volumes ánh xạ thư mục ra máy chủ host để dữ liệu không bị mất khi container khởi động lại.",
    "difficulty": "easy",
    "language": "Docker",
    "course_id": 4
  },
  {
    "id": 56,
    "question": "Lệnh Docker nào được sử dụng để xây dựng một image từ Dockerfile trong thư mục hiện tại và gắn thẻ (tag) định danh tên cho image đó?",
    "options": [
      "docker pull my-app",
      "docker commit my-app",
      "docker build -t my-app:latest .",
      "docker run -d my-app"
    ],
    "answer_index": 2,
    "explanation": "Lệnh 'docker build -t <tên:tag> <đường_dẫn>' thực hiện đọc Dockerfile, thực thi các bước hướng dẫn và đóng gói thành image hoàn chỉnh.",
    "difficulty": "easy",
    "language": "Docker",
    "course_id": 4
  },
  {
    "id": 57,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "medium",
    "language": "python",
    "course_id": 2
  },
  {
    "id": 58,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "medium",
    "language": "python",
    "course_id": 2
  },
  {
    "id": 59,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "medium",
    "language": "python",
    "course_id": 2
  },
  {
    "id": 60,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "medium",
    "language": "python",
    "course_id": 2
  },
  {
    "id": 61,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "medium",
    "language": "python",
    "course_id": 2
  },
  {
    "id": 62,
    "question": "Trong React 19, cú pháp để truyền và nhận ref trong một function component đã được đơn giản hóa như thế nào?",
    "options": [
      "Bắt buộc phải bọc component trong forwardRef()",
      "ref có thể được nhận trực tiếp dưới dạng một prop thông thường",
      "Phải sử dụng hook useRef() từ component cha",
      "Chỉ có thể dùng ref trong Class Component"
    ],
    "answer_index": 1,
    "explanation": "React 19 đã loại bỏ sự cần thiết của forwardRef(). Function component giờ đây có thể nhận trực tiếp prop ref như mọi prop thông thường khác.",
    "difficulty": "easy",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 63,
    "question": "Hook useActionState trong React 19 cung cấp giải pháp cho vấn đề gì khi xử lý biểu mẫu (forms)?",
    "options": [
      "Tự động đồng bộ hóa biểu mẫu với LocalStorage",
      "Tự động quản lý pending state, giá trị trả về và lỗi của form action bất đồng bộ",
      "Thay thế hoàn toàn cho thư viện React Hook Form",
      "Chỉ dùng để validate định dạng email và mật khẩu"
    ],
    "answer_index": 1,
    "explanation": "Hook useActionState nhận vào một action bất đồng bộ và trả về [state, formAction, isPending], tự động theo dõi trạng thái loading và kết quả xử lý.",
    "difficulty": "medium",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 64,
    "question": "Hook useOptimistic trong React 19 thường được sử dụng nhằm mục đích gì trong giao diện người dùng?",
    "options": [
      "Tối ưu kích thước bundle JavaScript khi build",
      "Cập nhật giao diện ngay lập tức trước khi server phản hồi để tăng trải nghiệm người dùng mượt mà",
      "Tự động phân bổ lại bộ nhớ heap của trình duyệt",
      "Tránh re-render các component con không cần thiết"
    ],
    "answer_index": 1,
    "explanation": "useOptimistic cho phép hiển thị trạng thái giao diện dự đoán (optimistic UI) trong khi một hành động bất đồng bộ đang diễn ra trên máy chủ, và tự động hoàn tác nếu thao tác thất bại.",
    "difficulty": "medium",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 65,
    "question": "Trong kiến trúc React Server Components (RSC), điều gì là ĐÚNG về Server Components?",
    "options": [
      "Có thể sử dụng các hook như useState, useEffect và sự kiện onClick",
      "Mã nguồn của Server Component không bị đóng gói vào client bundle, giúp giảm đáng kể kích thước JavaScript tải về trình duyệt",
      "Chỉ chạy được trên server Node.js, không chạy được trên Edge Runtime",
      "Không thể import hoặc render Client Components"
    ],
    "answer_index": 1,
    "explanation": "Server Components chạy hoàn toàn trên server và chỉ gửi kết quả JSON/HTML về client, giúp zero-bundle-size cho client và có thể truy cập trực tiếp vào database hoặc filesystem.",
    "difficulty": "hard",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 66,
    "question": "Cơ chế React Fiber mang lại lợi thế cốt lõi nào cho React so với thuật toán Virtual DOM nguyên bản (Stack Reconciler)?",
    "options": [
      "Khả năng chia nhỏ công việc rendering thành các đơn vị nhỏ (incremental rendering) và tạm dừng/ưu tiên tác vụ",
      "Tự động biên dịch mã JSX sang WebAssembly",
      "Không cần sử dụng DOM ảo nữa mà thao tác trực tiếp trên DOM thật",
      "Bắt buộc mọi component phải chạy song song trên Web Workers"
    ],
    "answer_index": 0,
    "explanation": "React Fiber là một cấu trúc dữ liệu dạng cây liên kết đơn cho phép React chia nhỏ quá trình render thành nhiều frame, có thể tạm hoãn, hủy hoặc ưu tiên các tác vụ có độ ưu tiên cao như gõ phím hay animation.",
    "difficulty": "hard",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 67,
    "question": "Khi thực hiện gọi API trong useEffect, cách tốt nhất để xử lý hiện tượng race condition khi component re-render hoặc unmount là gì?",
    "options": [
      "Sử dụng setTimeout để hoãn gọi API",
      "Sử dụng AbortController trong hàm cleanup để hủy request đang chờ xử lý",
      "Dùng async/await trực tiếp trong callback của useEffect",
      "Bắt buộc lưu response vào biến global"
    ],
    "answer_index": 1,
    "explanation": "Bằng cách tạo một thể hiện AbortController và gọi controller.abort() trong hàm cleanup của useEffect, request HTTP cũ sẽ bị hủy nếu component re-render hoặc unmount, tránh ghi đè dữ liệu sai lệch.",
    "difficulty": "medium",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 68,
    "question": "Khi nào bạn NÊN sử dụng useMemo hoặc useCallback trong React?",
    "options": [
      "Bọc tất cả các hàm và biểu thức tính toán trong toàn bộ ứng dụng",
      "Chỉ khi thực hiện phép tính thực sự tốn kém tài nguyên hoặc truyền hàm/đối tượng làm prop xuống component con đã được bọc bằng React.memo",
      "Chỉ trong Class Component",
      "Bắt buộc dùng trước mọi lệnh console.log"
    ],
    "answer_index": 1,
    "explanation": "useMemo và useCallback có chi phí khởi tạo và kiểm tra dependency. Chỉ nên dùng khi phép tính nặng hoặc cần bảo toàn tham chiếu (referential equality) để tránh re-render component con đã memoized.",
    "difficulty": "easy",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 69,
    "question": "Trong Zustand, cú pháp nào sau đây là cách tạo một store đơn giản và chuẩn xác nhất?",
    "options": [
      "const useStore = create((set) => ({ count: 0, inc: () => set((state) => ({ count: state.count + 1 })) }))",
      "const store = new ZustandStore({ count: 0 })",
      "const useStore = createContext(useReducer(reducer, initialState))",
      "const useStore = registerStore({ state: { count: 0 } })"
    ],
    "answer_index": 0,
    "explanation": "Zustand sử dụng hàm create nhận vào hàm callback có tham số set để cập nhật trạng thái đơn giản, không cần boilerplate như Redux hay Provider bọc ngoài.",
    "difficulty": "easy",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 70,
    "question": "Điểm khác biệt lớn về cơ chế Event Delegation giữa React 17/18/19 và React 16 trở về trước là gì?",
    "options": [
      "React gắn các event listener vào root container (nơi render ứng dụng) thay vì gắn vào thẻ document",
      "React gắn trực tiếp event listener vào từng DOM node thật",
      "React bỏ hoàn toàn cơ chế SyntheticEvent",
      "React chỉ lắng nghe sự kiện trên thẻ window"
    ],
    "answer_index": 0,
    "explanation": "Từ React 17, React đính kèm trình xử lý sự kiện vào DOM node gốc (root element) nơi component tree được mount, thay vì document node, giúp chạy nhiều phiên bản React lồng nhau an toàn hơn.",
    "difficulty": "hard",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 71,
    "question": "Thành phần <Suspense> trong React có tác dụng chính là gì?",
    "options": [
      "Bắt và xử lý mọi ngoại lệ runtime tương tự try/catch",
      "Hiển thị giao diện fallback (loading UI) trong khi các component con đang chờ nạp mã nguồn hoặc dữ liệu bất đồng bộ",
      "Tự động retry lại request HTTP khi gặp mã lỗi 500",
      "Ngăn chặn component con re-render khi props thay đổi"
    ],
    "answer_index": 1,
    "explanation": "Suspense cho phép khai báo trạng thái fallback UI hiển thị trong khi một cây component con đang thực hiện các thao tác bất đồng bộ (như React.lazy hoặc Suspense-enabled data fetching).",
    "difficulty": "easy",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 72,
    "question": "React Compiler (React Forget) được thiết kế nhằm giải quyết bài toán cốt lõi nào của lập trình viên React?",
    "options": [
      "Thay thế hoàn toàn ngôn ngữ TypeScript bằng PureScript",
      "Tự động memoize các giá trị và component tại thời điểm build mà không cần lập trình viên viết useMemo/useCallback thủ công",
      "Biến ứng dụng web thành ứng dụng desktop native qua Electron",
      "Xóa bỏ sự phụ thuộc vào Node.js"
    ],
    "answer_index": 1,
    "explanation": "React Compiler phân tích luồng dữ liệu của component và tự động áp dụng memoization tối ưu tại bước biên dịch, giải phóng lập trình viên khỏi gánh nặng quản lý dependency array thủ công.",
    "difficulty": "medium",
    "language": "React",
    "course_id": 3
  },
  {
    "id": 73,
    "question": "Nền tảng cốt lõi giúp FastAPI đạt hiệu năng cao tương đương NodeJS và Go là việc kết hợp hai thư viện nào?",
    "options": [
      "Flask và Django ORM",
      "Starlette (cho phần web/networking) và Pydantic (cho data validation)",
      "Tornado và Marshmallow",
      "Bottle và SQLAlchemy"
    ],
    "answer_index": 1,
    "explanation": "FastAPI được xây dựng trên nền Starlette để xử lý routing và ASGI web server hiệu năng cao, cùng với Pydantic để serialize và kiểm tra tính hợp lệ của dữ liệu cực nhanh.",
    "difficulty": "easy",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 74,
    "question": "Trong FastAPI, khi nào một endpoint được định nghĩa với def thông thường thay vì async def?",
    "options": [
      "Không bao giờ được dùng def thông thường vì sẽ làm sập server",
      "Khi endpoint thực hiện các tác vụ blocking I/O (như thư viện DB cũ chưa hỗ trợ async); FastAPI sẽ tự động chạy nó trên một threadpool riêng",
      "Khi endpoint cần chạy với tốc độ cao hơn async def",
      "Khi endpoint không nhận tham số query"
    ],
    "answer_index": 1,
    "explanation": "Khi dùng def, FastAPI tự động gửi request đến một threadpool (worker threads) để tránh block Event Loop chính. Với async def, hàm phải gọi các non-blocking awaitable.",
    "difficulty": "medium",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 75,
    "question": "Trong Pydantic v2, phương thức chuẩn nào được khuyến nghị để chuyển đổi một dictionary hoặc đối tượng sang model instance?",
    "options": [
      "MyModel.parse_obj(data)",
      "MyModel.model_validate(data)",
      "MyModel.from_dict(data)",
      "MyModel.validate_all(data)"
    ],
    "answer_index": 1,
    "explanation": "Pydantic v2 thay thế parse_obj bằng model_validate(), mang lại tốc độ xử lý nhanh hơn hàng chục lần nhờ lõi pydantic-core được viết bằng Rust.",
    "difficulty": "easy",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 76,
    "question": "Hệ thống Dependency Injection (Depends) trong FastAPI mang lại lợi ích quan trọng nào sau đây?",
    "options": [
      "Tự động tạo các bảng trong cơ sở dữ liệu khi server khởi động",
      "Tái sử dụng logic xác thực, chia sẻ kết nối database session và kiểm soát phân quyền dễ dàng cho từng route",
      "Tự động deploy code lên Docker Swarm",
      "Mã hóa toàn bộ request body gửi từ client"
    ],
    "answer_index": 1,
    "explanation": "Depends cho phép module hóa logic (như get_db, get_current_user), quản lý lifecycle (yield để dọn dẹp kết nối) và kiểm tra quyền hạn một cách nhất quán.",
    "difficulty": "medium",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 77,
    "question": "Điểm khác biệt quan trọng giữa BackgroundTasks tích hợp sẵn của FastAPI và hệ thống hàng đợi Celery/Redis là gì?",
    "options": [
      "BackgroundTasks chạy trên cùng tiến trình server, phù hợp cho tác vụ nhẹ (như gửi email); Celery chạy phân tán trên worker riêng, phù hợp cho tác vụ nặng hoặc lâu dài",
      "BackgroundTasks chỉ dùng được với Python 2.7",
      "Celery không thể gửi email hay xử lý file",
      "BackgroundTasks tự động lưu task vào ổ đĩa để retry khi server khởi động lại"
    ],
    "answer_index": 0,
    "explanation": "BackgroundTasks của FastAPI chạy trong memory của tiến trình hiện tại. Nếu ứng dụng restart, task chưa chạy sẽ mất. Celery có message broker (Redis/RabbitMQ) để phân tán và retry bền vững.",
    "difficulty": "medium",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 78,
    "question": "Cấu hình middleware CORS trong FastAPI được thực hiện như thế nào để cho phép frontend gọi API từ domain khác?",
    "options": [
      "app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])",
      "app.enable_cors(True)",
      "app.use(CORS(all=True))",
      "app.cors_allow_all()"
    ],
    "answer_index": 0,
    "explanation": "FastAPI sử dụng CORSMiddleware từ starlette.middleware.cors và cấu hình thông qua phương thức app.add_middleware() với các thiết lập allow_origins, allow_credentials, allow_methods, allow_headers.",
    "difficulty": "easy",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 79,
    "question": "Để trả về một lỗi HTTP chuẩn cùng mã trạng thái và thông báo chi tiết trong route của FastAPI, bạn sử dụng cách nào?",
    "options": [
      "raise HTTPException(status_code=404, detail='Không tìm thấy dữ liệu')",
      "return {'error': '404', 'message': 'Not Found'}",
      "sys.exit(404)",
      "raise StandardError('404')"
    ],
    "answer_index": 0,
    "explanation": "Ném ngoại lệ HTTPException từ fastapi cho phép framework tự động sinh phản hồi JSON có định dạng chuẩn {'detail': '...'} với HTTP status code tương ứng.",
    "difficulty": "easy",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 80,
    "question": "Trong FastAPI hiện đại, cơ chế nào thay thế cho hai sự kiện @app.on_event('startup') và @app.on_event('shutdown')?",
    "options": [
      "Sử dụng context manager @asynccontextmanager làm lifespan cho FastAPI instance",
      "Sử dụng cronjob định kỳ của Linux",
      "Dùng hàm __init__ của lớp FastAPI",
      "Cấu hình trực tiếp trong tệp settings.ini"
    ],
    "answer_index": 0,
    "explanation": "FastAPI hỗ trợ lifespan context manager: code trước yield chạy lúc startup (khởi tạo DB pool, cache) và code sau yield chạy lúc shutdown, giúp chia sẻ tài nguyên an toàn.",
    "difficulty": "hard",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 81,
    "question": "Khi cần truyền dữ liệu dạng luồng (Server-Sent Events hoặc tải file dung lượng lớn) trong FastAPI, bạn nên sử dụng Response class nào?",
    "options": [
      "StreamingResponse",
      "JSONResponse",
      "FileResponse duy nhất",
      "PlainTextResponse"
    ],
    "answer_index": 0,
    "explanation": "StreamingResponse nhận một generator hoặc async generator để truyền từng chunk dữ liệu về client mà không cần nạp toàn bộ nội dung vào RAM máy chủ.",
    "difficulty": "medium",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 82,
    "question": "Thư viện kiểm thử (Testing) tiêu chuẩn thường được sử dụng cùng TestClient để kiểm thử toàn diện các API của FastAPI là gì?",
    "options": [
      "pytest",
      "selenium",
      "mocha",
      "junit"
    ],
    "answer_index": 0,
    "explanation": "pytest kết hợp với TestClient (dựa trên httpx) là tiêu chuẩn vàng trong hệ sinh thái FastAPI, hỗ trợ viết fixture, mock database và kiểm thử async.",
    "difficulty": "easy",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 83,
    "question": "Schema nào sau đây trong OpenAPI được FastAPI tự động sinh để cung cấp tài liệu trực quan tương tác?",
    "options": [
      "Swagger UI (tại đường dẫn /docs) và ReDoc (tại /redoc)",
      "Postman Collections file duy nhất",
      "PDF Documentation tự in ra console",
      "XML Schema Documentation"
    ],
    "answer_index": 0,
    "explanation": "Dựa trên chuẩn OpenAPI (OAS 3.x), FastAPI tự động tạo 2 giao diện tài liệu động trực tiếp là Swagger UI (/docs) và ReDoc (/redoc).",
    "difficulty": "easy",
    "language": "FastAPI",
    "course_id": 2
  },
  {
    "id": 84,
    "question": "Mục tiêu cốt lõi của việc thiết lập Connection Pooling (như PgBouncer) trong hệ thống Backend PostgreSQL là gì?",
    "options": [
      "Tái sử dụng các kết nối cơ sở dữ liệu đã mở, giảm overhead khởi tạo kết nối TCP và xác thực người dùng",
      "Tự động mã hóa toàn bộ ổ đĩa của database server",
      "Thay thế hoàn toàn cho việc viết câu truy vấn SQL",
      "Mở rộng dung lượng RAM của máy chủ lưu trữ"
    ],
    "answer_index": 0,
    "explanation": "Mỗi kết nối tới PostgreSQL tạo một tiến trình (process) mới tốn khoảng 5-10MB RAM. Connection Pooling tái sử dụng socket có sẵn, giảm áp lực CPU/RAM và latency.",
    "difficulty": "medium",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 85,
    "question": "Loại chỉ mục (Index) nào trong PostgreSQL là lựa chọn tối ưu nhất khi cần tìm kiếm các phần tử nằm trong trường dữ liệu kiểu JSONB hoặc mảng (Array)?",
    "options": [
      "GIN (Generalized Inverted Index)",
      "B-Tree thông thường",
      "Hash Index",
      "BRIN (Block Range Index)"
    ],
    "answer_index": 0,
    "explanation": "Chỉ mục GIN được thiết kế đặc biệt cho các giá trị đa thành phần (như JSONB, Array, Full-Text Search), cho phép tra cứu key-value và mảng cực kỳ nhanh chóng.",
    "difficulty": "hard",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 86,
    "question": "Khi sử dụng lệnh EXPLAIN ANALYZE trong PostgreSQL, kết quả trả về khác biệt gì so với lệnh EXPLAIN thông thường?",
    "options": [
      "EXPLAIN ANALYZE thực sự chạy câu truy vấn để đo thời gian thực tế và số hàng trả về, trong khi EXPLAIN chỉ ước lượng kế hoạch tối ưu",
      "EXPLAIN ANALYZE sẽ tự động xóa dữ liệu sau khi chạy",
      "Không có sự khác biệt nào",
      "EXPLAIN ANALYZE chỉ kiểm tra lỗi chính tả SQL"
    ],
    "answer_index": 0,
    "explanation": "EXPLAIN chỉ đưa ra kế hoạch truy vấn ước tính dựa trên thống kê của optimizer; EXPLAIN ANALYZE thực thi truy vấn thật, đo lường chính xác thời gian thực tế và số hàng được xử lý.",
    "difficulty": "medium",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 87,
    "question": "Mức độ cô lập giao dịch (Transaction Isolation Level) mặc định trong PostgreSQL là gì?",
    "options": [
      "Read Committed",
      "Read Uncommitted",
      "Repeatable Read",
      "Serializable"
    ],
    "answer_index": 0,
    "explanation": "Mặc định PostgreSQL hoạt động ở mức Read Committed, trong đó một câu lệnh chỉ nhìn thấy các dòng dữ liệu đã được commit trước khi câu lệnh đó bắt đầu chạy.",
    "difficulty": "medium",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 88,
    "question": "Cơ chế MVCC (Multi-Version Concurrency Control) trong PostgreSQL hoạt động dựa trên nguyên lý cơ bản nào?",
    "options": [
      "Khóa toàn bộ bảng mỗi khi có thao tác ghi dữ liệu",
      "Mỗi thao tác UPDATE hoặc DELETE tạo một phiên bản tuple mới, giúp người đọc không khóa người ghi và người ghi không khóa người đọc",
      "Chỉ cho phép duy nhất một transaction chạy tại một thời điểm",
      "Ghi trực tiếp đè lên dữ liệu cũ ngay trên đĩa"
    ],
    "answer_index": 1,
    "explanation": "MVCC giữ nhiều phiên bản của dòng dữ liệu với các định danh xmin và xmax. Người đọc và người ghi không chặn lẫn nhau, và tiến trình VACUUM sẽ dọn dẹp các tuple chết (dead tuples).",
    "difficulty": "hard",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 89,
    "question": "Hiện tượng N+1 Query Problem trong ORM (như SQLAlchemy) có thể được giải quyết triệt để trong PostgreSQL bằng phương pháp nào?",
    "options": [
      "Sử dụng Eager Loading với joinedload() hoặc selectinload() để nạp dữ liệu liên kết trong 1 hoặc 2 query duy nhất",
      "Viết vòng lặp for trong Python để select từng dòng",
      "Tắt toàn bộ cache của cơ sở dữ liệu",
      "Chuyển toàn bộ dữ liệu sang SQLite"
    ],
    "answer_index": 0,
    "explanation": "Thay vì phát sinh 1 query lấy danh sách cha và N query lấy từng quan hệ con, joinedload (JOIN) hoặc selectinload (IN (...)) gộp việc nạp dữ liệu chỉ trong 1 hoặc 2 câu lệnh SQL hiệu quả.",
    "difficulty": "medium",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 90,
    "question": "Khi bảng cơ sở dữ liệu đạt tới hàng chục triệu bản ghi lịch sử theo thời gian (logs, metrics), kỹ thuật nào trong PostgreSQL giúp tăng tốc độ truy vấn và dọn dẹp dữ liệu cũ nhanh chóng?",
    "options": [
      "Table Partitioning (Phân vùng bảng theo Range ngày/tháng)",
      "Tạo thêm 50 chỉ mục B-Tree trên bảng",
      "Chuyển kiểu dữ liệu sang Text",
      "Khởi động lại server mỗi ngày"
    ],
    "answer_index": 0,
    "explanation": "Phân vùng bảng (Partitioning by Range) cho phép truy vấn chỉ quét trên partition cần thiết (Partition Pruning) và khi cần xóa dữ liệu cũ chỉ cần DROP TABLE partition con mà không tốn công chạy DELETE lớn.",
    "difficulty": "hard",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 91,
    "question": "Tại sao việc sử dụng UUIDv7 ngày càng được ưu tiên hơn UUIDv4 khi làm khóa chính (Primary Key) trong PostgreSQL?",
    "options": [
      "UUIDv7 có chứa timestamp ở phần đầu giúp sắp xếp tuần tự theo thời gian, giảm phân mảnh cây chỉ mục B-Tree và cải thiện hiệu năng INSERT",
      "UUIDv7 có kích thước chỉ 1 byte",
      "UUIDv7 không bao giờ trùng lặp còn UUIDv4 thì rất hay trùng",
      "UUIDv7 tự động mã hóa mật khẩu"
    ],
    "answer_index": 0,
    "explanation": "UUIDv4 hoàn toàn ngẫu nhiên khiến việc chèn vào B-Tree gây ra page splits liên tục. UUIDv7 kết hợp UNIX timestamp vào các bit đầu, giữ trật tự tuần tự và tối ưu I/O ghi đĩa.",
    "difficulty": "hard",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 92,
    "question": "Từ khóa CTE (Common Table Expression) trong SQL được khai báo bằng từ khóa nào sau đây?",
    "options": [
      "WITH",
      "LET",
      "DEFINE",
      "DECLARE"
    ],
    "answer_index": 0,
    "explanation": "Cú pháp WITH temp_table AS (SELECT ...) SELECT * FROM temp_table cho phép định nghĩa CTE, giúp truy vấn phức tạp trở nên dễ đọc, module hóa và có thể đệ quy (WITH RECURSIVE).",
    "difficulty": "easy",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 93,
    "question": "Câu lệnh PostgreSQL nào được sử dụng để giải phóng không gian lưu trữ bị chiếm giữ bởi các dòng dữ liệu chết (dead tuples) và cập nhật thống kê cho optimizer?",
    "options": [
      "VACUUM ANALYZE",
      "PURGE DATABASE",
      "CLEANUP MEMORY",
      "DROP FREE_SPACE"
    ],
    "answer_index": 0,
    "explanation": "VACUUM đánh dấu các không gian đĩa của dead tuples để tái sử dụng, và ANALYZE thu thập số liệu thống kê phân phối dữ liệu cho bộ lập kế hoạch truy vấn (query planner).",
    "difficulty": "easy",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 94,
    "question": "Trong PostgreSQL, kiểu dữ liệu nào sau đây là lựa chọn chuẩn xác nhất để lưu trữ tiền tệ hoặc giá trị số học đòi hỏi độ chính xác tuyệt đối mà không bị sai số làm tròn số thực?",
    "options": [
      "NUMERIC (hoặc DECIMAL)",
      "FLOAT",
      "REAL",
      "DOUBLE PRECISION"
    ],
    "answer_index": 0,
    "explanation": "FLOAT/REAL là kiểu số thực dấu phẩy động xấp xỉ tuân theo chuẩn IEEE 754 có thể gây sai số làm tròn thập phân. NUMERIC (DECIMAL) lưu trữ số học chính xác không có sai số.",
    "difficulty": "easy",
    "language": "PostgreSQL",
    "course_id": 2
  },
  {
    "id": 95,
    "question": "Trong Dockerfile, kỹ thuật 'Multi-stage Build' mang lại ưu thế vượt trội nào cho quy trình CI/CD?",
    "options": [
      "Tách riêng môi trường build (chứa compiler, devDependencies) và môi trường production, giúp giảm kích thước image thành phẩm và hạn chế lỗ hổng bảo mật",
      "Cho phép chạy nhiều container trên cùng một network port",
      "Tự động phân tán image lên các node Kubernetes",
      "Tự động restart container khi bị crash"
    ],
    "answer_index": 0,
    "explanation": "Multi-stage build cho phép dùng một image nặng để compile mã nguồn (ví dụ golang, node-build) rồi sao chép duy nhất file binary/dist sang base image siêu nhẹ (như alpine, distroless), giảm kích thước từ hàng GB xuống vài chục MB.",
    "difficulty": "easy",
    "language": "DevOps",
    "course_id": 4
  },
  {
    "id": 96,
    "question": "Điểm khác biệt căn bản nhất giữa một Docker Container và một Máy ảo (Virtual Machine - VM) là gì?",
    "options": [
      "Container chia sẻ chung Kernel của hệ điều hành máy chủ và chạy dưới dạng tiến trình cô lập, trong khi VM yêu cầu một hệ điều hành khách (Guest OS) riêng biệt",
      "Container chỉ chạy được trên hệ điều hành Windows",
      "VM không cần phần cứng CPU",
      "Container luôn an toàn hơn VM trong mọi tình huống"
    ],
    "answer_index": 0,
    "explanation": "Container ảo hóa ở tầng hệ điều hành (dùng cgroups và namespaces của Linux Kernel), không cần chạy Guest OS riêng nên nhẹ hơn, khởi động trong vài phần trăm giây và dùng ít RAM hơn VM rất nhiều.",
    "difficulty": "easy",
    "language": "DevOps",
    "course_id": 4
  },
  {
    "id": 97,
    "question": "Trong Kubernetes, thành phần nào chịu trách nhiệm gom nhóm một hoặc nhiều container và là đơn vị triển khai nhỏ nhất có thể quản lý được?",
    "options": [
      "Pod",
      "Deployment",
      "Ingress",
      "ConfigMap"
    ],
    "answer_index": 0,
    "explanation": "Pod là đơn vị tính toán nhỏ nhất trong Kubernetes, bao gồm một hoặc nhiều container chia sẻ chung mạng (IP và cổng), bộ nhớ lưu trữ và các thông số chạy.",
    "difficulty": "easy",
    "language": "DevOps",
    "course_id": 4
  },
  {
    "id": 98,
    "question": "Chiến lược triển khai (Deployment Strategy) nào triển khai phiên bản mới song song với phiên bản cũ rồi chuyển hướng 100% traffic qua phiên bản mới thông qua Router/Load Balancer?",
    "options": [
      "Blue-Green Deployment",
      "Canary Deployment",
      "Recreate Deployment",
      "Rolling Update"
    ],
    "answer_index": 0,
    "explanation": "Blue-Green Deployment duy trì hai môi trường giống hệt nhau (Blue: hiện tại, Green: mới). Khi Green kiểm thử thành công, router đổi hướng toàn bộ traffic sang Green gần như tức thời (zero downtime).",
    "difficulty": "medium",
    "language": "DevOps",
    "course_id": 4
  },
  {
    "id": 99,
    "question": "Tín hiệu Linux nào được Docker hoặc Kubernetes gửi tới tiến trình ứng dụng trước để thông báo container sắp bị dừng lại một cách nhẹ nhàng (Graceful Shutdown)?",
    "options": [
      "SIGTERM (Signal 15)",
      "SIGKILL (Signal 9)",
      "SIGHUP (Signal 1)",
      "SIGSTOP (Signal 17)"
    ],
    "answer_index": 0,
    "explanation": "Khi dừng container, Docker/K8s gửi SIGTERM để ứng dụng có thời gian đóng kết nối database, hoàn thành request dở dang. Sau thời gian timeout (thường 30s), nếu chưa dừng nó mới gửi SIGKILL để cưỡng chế hủy.",
    "difficulty": "medium",
    "language": "DevOps",
    "course_id": 4
  },
  {
    "id": 100,
    "question": "Loại kiểm tra (Probe) nào trong Kubernetes được sử dụng để xác định xem container đã sẵn sàng nhận lưu lượng truy cập từ Service hay chưa?",
    "options": [
      "readinessProbe",
      "livenessProbe",
      "startupProbe",
      "networkProbe"
    ],
    "answer_index": 0,
    "explanation": "readinessProbe kiểm tra xem ứng dụng đã sẵn sàng tiếp nhận request chưa. Nếu fail, K8s sẽ tạm ngắt Pod khỏi Service Load Balancer mà không restart container (khác với livenessProbe sẽ restart Pod).",
    "difficulty": "medium",
    "language": "DevOps",
    "course_id": 4
  },
  {
    "id": 101,
    "question": "Khi cấu hình Nginx làm Reverse Proxy và Load Balancer, thuật toán phân phối tải nào sẽ phân bổ request tới server đang có ít kết nối hoạt động nhất?",
    "options": [
      "least_conn",
      "round_robin",
      "ip_hash",
      "random"
    ],
    "answer_index": 0,
    "explanation": "Thuật toán least_conn tự động chuyển tiếp request mới tới backend server hiện có số lượng kết nối đang xử lý thấp nhất, rất phù hợp khi thời gian xử lý request không đồng đều.",
    "difficulty": "easy",
    "language": "DevOps",
    "course_id": 4
  },
  {
    "id": 102,
    "question": "Trong hệ thống giám sát bằng Prometheus, phương pháp RED Method bao gồm việc theo dõi 3 đại lượng cốt lõi nào của dịch vụ?",
    "options": [
      "Rate (Tần suất request/giây), Errors (Số lỗi phát sinh), Duration (Thời gian phản hồi/độ trễ)",
      "Read, Execute, Delete",
      "RAM, Energy, Disk",
      "Replicas, Endpoints, DNS"
    ],
    "answer_index": 0,
    "explanation": "Phương pháp RED (Rate, Errors, Duration) là chuẩn mực giám sát kiến trúc microservices và API được thiết kế bởi Tom Wilkie nhằm theo dõi sức khỏe dịch vụ lấy người dùng làm trung tâm.",
    "difficulty": "hard",
    "language": "DevOps",
    "course_id": 4
  },
  {
    "id": 103,
    "question": "Trong Docker, loại Volume nào gắn trực tiếp một thư mục hoặc tệp tin trên máy chủ chủ quản (Host OS) vào trong container theo đường dẫn tuyệt đối?",
    "options": [
      "Bind Mount",
      "Named Volume",
      "tmpfs Mount",
      "Overlay Network"
    ],
    "answer_index": 0,
    "explanation": "Bind Mount liên kết trực tiếp một đường dẫn trên host (ví dụ /var/data) vào trong container, rất hữu ích cho môi trường development để hot-reload code trực tiếp.",
    "difficulty": "easy",
    "language": "DevOps",
    "course_id": 4
  },
  {
    "id": 104,
    "question": "Trong pipeline CI/CD GitHub Actions, cú pháp nào cho phép một job chỉ chạy sau khi job kiểm thử (test) đã hoàn thành thành công?",
    "options": [
      "needs: test",
      "depends_on: test",
      "after: test",
      "require: test"
    ],
    "answer_index": 0,
    "explanation": "Từ khóa needs trong GitHub Actions workflow thiết lập quan hệ phụ thuộc giữa các jobs, đảm bảo job hiện tại chỉ chạy khi các jobs trong mảng needs chạy thành công.",
    "difficulty": "easy",
    "language": "DevOps",
    "course_id": 4
  },
  {
    "id": 105,
    "question": "Giải pháp nào sau đây được coi là thực hành tốt nhất (Best Practice) để quản lý secret nhạy cảm (như API Key, DB Password) trong môi trường Cloud Native?",
    "options": [
      "Sử dụng công cụ quản lý bảo mật chuyên dụng như HashiCorp Vault, AWS Secrets Manager hoặc K8s Secrets được mã hóa etcd",
      "Hardcode trực tiếp chuỗi mật khẩu vào source code Git",
      "Commit tệp .env lên repository công khai",
      "In mật khẩu ra tệp access.log"
    ],
    "answer_index": 0,
    "explanation": "Tuyệt đối không hardcode secret vào source control. Việc dùng Vault hoặc Secrets Manager cho phép xoay vòng khóa tự động (rotation), mã hóa at-rest và kiểm soát truy cập nghiêm ngặt.",
    "difficulty": "easy",
    "language": "DevOps",
    "course_id": 4
  },
  {
    "id": 106,
    "question": "Cơ chế 'Faster CPython' được giới thiệu từ Python 3.11 giúp tăng tốc hiệu năng thực thi mã nguồn chủ yếu nhờ cải tiến gì?",
    "options": [
      "Trình thông dịch chuyên biệt hóa thích ứng (Adaptive Specializing Interpreter)",
      "Loại bỏ hoàn toàn tính năng dynamic typing của Python",
      "Chuyển toàn bộ mã nguồn sang chạy bằng PyPy",
      "Bắt buộc biên dịch toàn bộ code thành tệp thực thi .exe"
    ],
    "answer_index": 0,
    "explanation": "Adaptive Specializing Interpreter theo dõi các bytecode thường xuyên được gọi và thay thế chúng bằng các phiên bản bytecode chuyên biệt theo kiểu dữ liệu cụ thể tại runtime (quickening).",
    "difficulty": "hard",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 107,
    "question": "Global Interpreter Lock (GIL) trong CPython truyền thống có đặc điểm gì đối với các luồng thực thi (threads)?",
    "options": [
      "Chỉ cho phép duy nhất một luồng máy chủ thực thi mã bytecode của Python tại một thời điểm, giới hạn khả năng tận dụng đa lõi CPU cho tác vụ CPU-bound",
      "Ngăn chặn các luồng thực hiện gọi I/O mạng",
      "Tự động khóa ổ cứng khi máy tính nóng lên",
      "Chỉ xuất hiện trên hệ điều hành Linux"
    ],
    "answer_index": 0,
    "explanation": "GIL đảm bảo an toàn bộ nhớ cho reference counting của CPython bằng cách cho phép chỉ 1 thread chạy Python bytecode tại một thời điểm. Với tác vụ CPU-bound cần dùng multiprocessing thay vì threading.",
    "difficulty": "medium",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 108,
    "question": "Trong thư viện asyncio của Python 3.11+, cú pháp nào là cách quản lý vòng đời nhiều coroutine an toàn nhất, tự động hủy các task còn lại nếu một task gặp lỗi?",
    "options": [
      "async with asyncio.TaskGroup() as tg:",
      "asyncio.gather(*tasks, return_exceptions=True)",
      "asyncio.wait(tasks)",
      "for t in tasks: await t"
    ],
    "answer_index": 0,
    "explanation": "asyncio.TaskGroup triển khai Structured Concurrency: nếu một task trong group bị lỗi, tất cả các task khác đang chạy trong group sẽ được tự động cancel và đóng lại an toàn.",
    "difficulty": "hard",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 109,
    "question": "Khác biệt cơ bản giữa yield (Generator) và return trong một hàm Python là gì?",
    "options": [
      "yield tạm dừng thực thi hàm và trả về giá trị hiện tại, ghi nhớ trạng thái để tiếp tục chạy ở lần gọi tiếp theo, giúp tiết kiệm bộ nhớ với tập dữ liệu lớn",
      "yield chạy chậm hơn return 100 lần và không nên dùng",
      "yield bắt buộc phải trả về kiểu chuỗi ký tự",
      "return chỉ dùng được trong vòng lặp while"
    ],
    "answer_index": 0,
    "explanation": "Generator dùng yield tạo ra các giá trị theo cơ chế lazy evaluation (tới đâu tính tới đó), không nạp toàn bộ danh sách vào RAM, cực kỳ tối ưu khi xử lý file lớn hoặc luồng stream.",
    "difficulty": "easy",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 110,
    "question": "Khi viết một Decorator tùy chỉnh trong Python, tại sao luôn khuyến nghị sử dụng @functools.wraps(func) trên hàm wrapper?",
    "options": [
      "Để bảo toàn tên hàm nguyên bản (__name__), docstring (__doc__) và các metadata của hàm ban đầu",
      "Để làm cho hàm chạy nhanh hơn gấp đôi",
      "Để biến hàm thành async function tự động",
      "Bắt buộc phải có nếu không code sẽ bị cú pháp lỗi"
    ],
    "answer_index": 0,
    "explanation": "functools.wraps sao chép các thuộc tính phản chiếu (introspection) như __name__, __doc__, __annotations__ từ hàm gốc sang hàm wrapper, giúp debug và sinh tài liệu chính xác.",
    "difficulty": "easy",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 111,
    "question": "Cơ chế thu hồi bộ nhớ tự động (Garbage Collection) của CPython kết hợp hai phương pháp nào?",
    "options": [
      "Đếm tham chiếu (Reference Counting) làm cơ chế chính kết hợp cùng bộ dò chu trình tham chiếu vòng (Generational Garbage Collector)",
      "Chỉ dùng duy nhất Mark-and-Sweep định kỳ",
      "Giải phóng thủ công bằng lệnh free() như C++",
      "Không bao giờ tự thu hồi bộ nhớ"
    ],
    "answer_index": 0,
    "explanation": "CPython giải phóng đối tượng ngay lập tức khi reference count giảm về 0. Đồng thời nó có Generational GC (chia 3 thế hệ generation 0, 1, 2) để phát hiện và dọn dẹp các đối tượng tham chiếu vòng (cyclic references).",
    "difficulty": "hard",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 112,
    "question": "Để một class tùy chỉnh có thể sử dụng được cú pháp 'with MyContext():', class đó bắt buộc phải hiện thực hai phương thức đặc biệt (dunder methods) nào?",
    "options": [
      "__enter__() và __exit__()",
      "__init__() và __del__()",
      "__start__() và __stop__()",
      "__open__() và __close__()"
    ],
    "answer_index": 0,
    "explanation": "Giao thức Context Manager yêu cầu __enter__ để khởi tạo/trả về tài nguyên khi vào khối with, và __exit__ để dọn dẹp tài nguyên kể cả khi có exception xảy ra.",
    "difficulty": "easy",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 113,
    "question": "Trong hệ thống kiểu dữ liệu tĩnh của Python (typing), cú pháp nào đại diện cho một giá trị có thể mang kiểu dữ liệu T hoặc có thể là None?",
    "options": [
      "Optional[T] (hoặc T | None từ Python 3.10)",
      "Nullable[T]",
      "Maybe[T]",
      "Nil[T]"
    ],
    "answer_index": 0,
    "explanation": "Trong module typing, Optional[T] là cú pháp viết tắt của Union[T, None]. Từ Python 3.10 trở lên, có thể viết ngắn gọn là T | None.",
    "difficulty": "easy",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 114,
    "question": "Điểm khác biệt giữa hai phương thức chuyển đổi chuỗi __str__ và __repr__ trong Python là gì?",
    "options": [
      "__str__ dành cho người dùng cuối (dễ đọc, thân thiện); __repr__ dành cho lập trình viên để gỡ lỗi (chính xác, không mơ hồ và có thể dùng để tái tạo đối tượng)",
      "__str__ chỉ in số, __repr__ chỉ in chữ",
      "__repr__ bắt buộc phải mã hóa base64",
      "Hai phương thức này hoàn toàn giống nhau"
    ],
    "answer_index": 0,
    "explanation": "Quy tắc chuẩn của Python: __repr__ là biểu diễn chính thức hướng đến debugging (thường trả về dạng ClassName(arg=val)), còn __str__ hướng đến hiển thị thân thiện cho người dùng.",
    "difficulty": "medium",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 115,
    "question": "Đối với tác vụ tính toán chuyên sâu CPU (CPU-bound) như xử lý ảnh hoặc huấn luyện mô hình toán học trong Python, giải pháp nào sau đây giúp tối ưu hiệu năng tốt nhất?",
    "options": [
      "Sử dụng module multiprocessing hoặc concurrent.futures.ProcessPoolExecutor để chạy trên nhiều tiến trình độc lập",
      "Dùng asyncio lồng trong nhiều vòng for",
      "Sử dụng threading để tạo 1000 luồng",
      "Chỉ dùng duy nhất một vòng lặp đơn"
    ],
    "answer_index": 0,
    "explanation": "Do tác động của GIL đối với CPython, threading không thể chạy đa lõi thực sự cho CPU-bound. multiprocessing tạo các tiến trình con có interpreter và bộ nhớ riêng, tận dụng trọn vẹn mọi lõi CPU.",
    "difficulty": "medium",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 116,
    "question": "Biểu thức 'List Comprehension' nào sau đây là hợp lệ và tối ưu nhất để lấy bình phương của các số chẵn trong mảng numbers?",
    "options": [
      "[x**2 for x in numbers if x % 2 == 0]",
      "[for x in numbers: if x % 2 == 0: x**2]",
      "[x**2 if x % 2 == 0 else pass for x in numbers]",
      "[square(x) while x % 2 == 0]"
    ],
    "answer_index": 0,
    "explanation": "Cú pháp chuẩn của list comprehension lọc điều kiện là [expression for item in iterable if condition]. Biểu thức này chạy nhanh hơn vòng for append thủ công nhờ thực thi ở tầng C bytecode.",
    "difficulty": "easy",
    "language": "Python",
    "course_id": 2
  },
  {
    "id": 117,
    "question": "Cách phòng chống lỗ hổng SQL Injection hiệu quả và triệt để nhất trong lập trình ứng dụng là gì?",
    "options": [
      "Luôn sử dụng Parameterized Queries (Prepared Statements) hoặc Object-Relational Mapping (ORM) thay vì cộng chuỗi SQL",
      "Thay thế dấu nháy đơn bằng dấu nháy kép",
      "Chỉ chạy website bằng quyền root để hệ điều hành tự bảo vệ",
      "Tắt toàn bộ tính năng ghi log của database"
    ],
    "answer_index": 0,
    "explanation": "Parameterized queries tách biệt hoàn toàn mã lệnh SQL và dữ liệu đầu vào. Database coi tham số người dùng truyền vào thuần túy là giá trị (literal value), không bao giờ biên dịch nó thành lệnh thực thi.",
    "difficulty": "easy",
    "language": "Security",
    "course_id": 2
  },
  {
    "id": 118,
    "question": "Lỗ hổng Cross-Site Scripting (XSS) cho phép kẻ tấn công làm điều gì nguy hiểm trên trình duyệt của nạn nhân?",
    "options": [
      "Chèn và thực thi mã JavaScript độc hại trong ngữ cảnh trình duyệt của người dùng, đánh cắp cookie phiên hoặc thông tin nhạy cảm",
      "Tự động tắt nguồn máy tính của nạn nhân",
      "Xóa toàn bộ cơ sở dữ liệu trên server qua cổng 80",
      "Thay đổi mật khẩu BIOS của máy chủ"
    ],
    "answer_index": 0,
    "explanation": "XSS cho phép thực thi script ngoài ý muốn trên trình duyệt người dùng. Kẻ tấn công có thể đọc trộm localStorage, session tokens, chuyển hướng người dùng hoặc mạo danh thao tác.",
    "difficulty": "easy",
    "language": "Security",
    "course_id": 2
  },
  {
    "id": 119,
    "question": "Để bảo vệ Cookie chứa mã thông báo phiên (Session Token / JWT) khỏi bị đánh cắp bởi các cuộc tấn công XSS, lập trình viên PHẢI bật cờ (flag) nào cho cookie?",
    "options": [
      "HttpOnly",
      "SameSite=None",
      "Path=/",
      "Domain=.local"
    ],
    "answer_index": 0,
    "explanation": "Khi cờ HttpOnly được bật, mã JavaScript chạy trên trình duyệt (thông qua document.cookie) sẽ hoàn toàn không thể đọc hoặc can thiệp vào cookie đó, ngăn chặn việc đánh cắp token qua XSS.",
    "difficulty": "easy",
    "language": "Security",
    "course_id": 2
  },
  {
    "id": 120,
    "question": "Tấn công Cross-Site Request Forgery (CSRF) là dạng tấn công như thế nào?",
    "options": [
      "Lừa trình duyệt của người dùng đã xác thực tự động gửi các yêu cầu trái phép đến ứng dụng web mục tiêu",
      "Tấn công làm tràn bộ đệm RAM máy chủ bằng lệnh gọi đệ quy",
      "Chặn bắt gói tin trên đường truyền mạng không dây",
      "Gửi hàng triệu email rác vào hòm thư"
    ],
    "answer_index": 0,
    "explanation": "CSRF lợi dụng việc trình duyệt tự động đính kèm cookie xác thực khi gửi request tới domain mục tiêu. Có thể ngăn chặn bằng cách dùng cờ SameSite=Lax/Strict hoặc Anti-CSRF Tokens.",
    "difficulty": "medium",
    "language": "Security",
    "course_id": 2
  },
  {
    "id": 121,
    "question": "Trong cấu trúc của JSON Web Token (JWT), phần nào đảm bảo rằng token không bị kẻ xấu chỉnh sửa trái phép nội dung?",
    "options": [
      "Signature (Chữ ký điện tử được ký bằng secret key hoặc private key)",
      "Payload",
      "Header",
      "Algorithm type"
    ],
    "answer_index": 0,
    "explanation": "Signature được tạo bằng cách băm Header + Payload cùng với secret key (với HMAC) hoặc ký bằng private key (với RSA/ECDSA). Nếu kẻ xấu sửa Payload, chữ ký sẽ không khớp và server từ chối token.",
    "difficulty": "medium",
    "language": "Security",
    "course_id": 2
  },
  {
    "id": 122,
    "question": "Cơ chế CORS (Cross-Origin Resource Sharing) trong trình duyệt gửi loại HTTP request nào trước (Preflight Request) để kiểm tra quyền truy cập khi có header hoặc method tùy chỉnh?",
    "options": [
      "OPTIONS",
      "HEAD",
      "GET",
      "TRACE"
    ],
    "answer_index": 0,
    "explanation": "Trình duyệt tự động gửi một preflight request với phương thức OPTIONS kèm các header Access-Control-Request-* để hỏi máy chủ xem request thực tế có được phép thực hiện hay không.",
    "difficulty": "medium",
    "language": "Security",
    "course_id": 2
  },
  {
    "id": 123,
    "question": "Thuật toán nào sau đây là tiêu chuẩn được khuyến nghị cao nhất hiện nay để băm và lưu trữ mật khẩu người dùng (Password Hashing)?",
    "options": [
      "Argon2id hoặc Bcrypt",
      "MD5",
      "SHA-1",
      "Base64"
    ],
    "answer_index": 0,
    "explanation": "MD5 và SHA-1 đã lỗi thời và dễ bị tấn công va chạm/rainbow table. Argon2id (thắng giải Password Hashing Competition) và Bcrypt là các hàm băm chậm thích ứng (memory-hard và time-cost), chống tấn công GPU/ASIC cực tốt.",
    "difficulty": "easy",
    "language": "Security",
    "course_id": 2
  },
  {
    "id": 124,
    "question": "Header bảo mật nào chỉ dẫn trình duyệt chỉ được phép tải các tài nguyên (scripts, images, styles) từ những nguồn gốc (origins) được tin cậy?",
    "options": [
      "Content-Security-Policy (CSP)",
      "X-Frame-Options",
      "Strict-Transport-Security",
      "X-Content-Type-Options"
    ],
    "answer_index": 0,
    "explanation": "Content-Security-Policy (CSP) là lớp bảo vệ vững chắc chống XSS và data injection bằng cách thiết lập danh sách trắng các domain được phép nạp script, style, hình ảnh và cấm thực thi inline script độc hại.",
    "difficulty": "medium",
    "language": "Security",
    "course_id": 2
  },
  {
    "id": 125,
    "question": "Thuật toán Rate Limiting nào hoạt động bằng cách cấp phát một số lượng token nhất định theo chu kỳ thời gian và tiêu thụ token cho mỗi request được gọi?",
    "options": [
      "Token Bucket",
      "Binary Search",
      "Depth First Search",
      "Round Robin"
    ],
    "answer_index": 0,
    "explanation": "Thuật toán Token Bucket (hoặc Leaky Bucket) duy trì thùng chứa token được nạp đầy theo tốc độ cố định. Mỗi request lấy đi 1 token; nếu hết token thì request bị từ chối (HTTP 429 Too Many Requests).",
    "difficulty": "medium",
    "language": "Security",
    "course_id": 2
  },
  {
    "id": 126,
    "question": "Header HTTP Strict Transport Security (HSTS) thông báo điều gì cho trình duyệt của người dùng?",
    "options": [
      "Yêu cầu trình duyệt chỉ được phép giao tiếp với trang web qua kết nối bảo mật HTTPS trong suốt khoảng thời gian quy định",
      "Yêu cầu người dùng nhập lại mật khẩu sau mỗi 5 phút",
      "Tự động tắt quảng cáo trên website",
      "Cho phép mở website trong iFrame bất kỳ"
    ],
    "answer_index": 0,
    "explanation": "HSTS (Strict-Transport-Security) ngăn chặn tấn công hạ cấp giao thức SSL Stripping bằng cách buộc trình duyệt luôn chuyển đổi HTTP sang HTTPS trước khi gửi bất kỳ gói tin nào ra mạng.",
    "difficulty": "hard",
    "language": "Security",
    "course_id": 2
  },
  {
    "id": 127,
    "question": "Trong kiến trúc Microservices, Pattern nào thường được sử dụng để duy trì tính nhất quán dữ liệu giữa các dịch vụ phân tán thay cho Distributed 2PC (Two-Phase Commit)?",
    "options": [
      "Saga Pattern (triển khai qua Choreography hoặc Orchestration)",
      "Singleton Pattern",
      "Factory Pattern",
      "Flyweight Pattern"
    ],
    "answer_index": 0,
    "explanation": "Saga Pattern chia một giao dịch phân tán thành chuỗi các local transaction. Nếu một bước thất bại, Saga sẽ kích hoạt các giao dịch bù trừ (compensating transactions) để hoàn tác dữ liệu của các bước trước đó.",
    "difficulty": "hard",
    "language": "Architecture",
    "course_id": 2
  },
  {
    "id": 128,
    "question": "Chiến lược Caching 'Cache-Aside' (Lazy Loading) hoạt động theo trình tự nào khi ứng dụng cần đọc dữ liệu?",
    "options": [
      "Ứng dụng kiểm tra Cache trước; nếu có (Cache Hit) thì trả về ngay; nếu không có (Cache Miss), ứng dụng truy vấn Database rồi ghi dữ liệu vào Cache và trả về cho client",
      "Ứng dụng luôn ghi thẳng vào Database rồi để Database tự bắn dữ liệu sang Cache",
      "Ứng dụng chỉ đọc từ Cache, không bao giờ đọc từ Database",
      "Cache tự động quét Database theo định kỳ 1 giây"
    ],
    "answer_index": 0,
    "explanation": "Trong Cache-Aside, ứng dụng trực tiếp quản lý cache: đọc cache trước -> miss thì đọc DB -> cập nhật cache -> trả kết quả. Đây là chiến lược phổ biến và linh hoạt nhất.",
    "difficulty": "medium",
    "language": "Architecture",
    "course_id": 2
  },
  {
    "id": 129,
    "question": "Cấu trúc dữ liệu nào trong Redis là lựa chọn lý tưởng nhất để xây dựng hệ thống Bảng Xếp Hạng (Leaderboard) theo điểm số thời gian thực?",
    "options": [
      "Sorted Sets (ZSET)",
      "Hashes",
      "Lists",
      "Bitmaps"
    ],
    "answer_index": 0,
    "explanation": "Redis Sorted Sets lưu trữ các phần tử duy nhất kèm theo một trọng số (score). Các thao tác thêm, cập nhật điểm, và lấy top người chơi (ZRANGEBYSCORE, ZREVRANK) đều đạt độ phức tạp O(log(N)).",
    "difficulty": "medium",
    "language": "Architecture",
    "course_id": 2
  },
  {
    "id": 130,
    "question": "Điểm khác biệt mấu chốt giữa Apache Kafka và RabbitMQ trong việc lưu trữ và tiêu thụ thông điệp (Message Streaming vs Queueing) là gì?",
    "options": [
      "Kafka lưu trữ message dưới dạng append-only log bền vững trên ổ đĩa cho phép nhiều consumer đọc lại theo offset; RabbitMQ xóa message khỏi queue sau khi consumer xử lý và ack thành công",
      "RabbitMQ chỉ chạy được trên điện thoại di động",
      "Kafka không cho phép xử lý dữ liệu theo thời gian thực",
      "RabbitMQ có thể lưu hàng petabyte dữ liệu vĩnh viễn"
    ],
    "answer_index": 0,
    "explanation": "Kafka là distributed event streaming platform lưu trữ log theo thời gian (retention period), cho phép replay message. RabbitMQ là message broker truyền thống hướng theo trạng thái message (queue empty khi đã tiêu thụ xong).",
    "difficulty": "hard",
    "language": "Architecture",
    "course_id": 2
  },
  {
    "id": 131,
    "question": "Định lý CAP (CAP Theorem) khẳng định điều gì về một hệ thống cơ sở dữ liệu phân tán khi xảy ra phân mảnh mạng (Network Partition)?",
    "options": [
      "Chỉ có thể lựa chọn thỏa mãn một trong hai: Tính nhất quán (Consistency - CP) hoặc Tính sẵn sàng (Availability - AP)",
      "Hệ thống có thể đạt được trọn vẹn cả 3 tiêu chí cùng lúc",
      "Hệ thống buộc phải dừng hoạt động hoàn toàn",
      "Phân mảnh mạng không bao giờ xảy ra trong thực tế"
    ],
    "answer_index": 0,
    "explanation": "Khi phân mảnh mạng (Partition) xảy ra (điều không thể tránh khỏi trong mạng phân tán), hệ thống buộc phải chọn: hoặc từ chối request để đảm bảo mọi node giữ nguyên dữ liệu đúng (Consistency), hoặc vẫn trả lời bằng dữ liệu có thể cũ (Availability).",
    "difficulty": "medium",
    "language": "Architecture",
    "course_id": 2
  },
  {
    "id": 132,
    "question": "Kỹ thuật 'Database Sharding' (Horizontal Partitioning) giải quyết bài toán gì của hệ thống dữ liệu quy mô lớn?",
    "options": [
      "Chia nhỏ một tập dữ liệu khổng lồ thành nhiều cơ sở dữ liệu độc lập (shards) dựa trên sharding key để phân tán tải I/O và dung lượng lưu trữ",
      "Sao chép toàn bộ bảng sang cùng một ổ cứng nhỏ hơn",
      "Nén dữ liệu dạng zip trước khi lưu",
      "Chuyển toàn bộ database sang dạng tệp văn bản .txt"
    ],
    "answer_index": 0,
    "explanation": "Sharding chia ngang bảng theo hàng dựa trên shard key (như user_id hash), phân bổ các phần dữ liệu lên nhiều server vật lý riêng biệt, cho phép mở rộng quy mô tuyến tính vượt qua giới hạn của một máy chủ đơn.",
    "difficulty": "hard",
    "language": "Architecture",
    "course_id": 2
  },
  {
    "id": 133,
    "question": "Vai trò cốt lõi của một API Gateway trong hệ thống kiến trúc Microservices là gì?",
    "options": [
      "Làm điểm tiếp nhận duy nhất cho client, đảm nhiệm định tuyến request, xác thực phân quyền, rate limiting, SSL termination và ghi log tập trung",
      "Thay thế hoàn toàn database của các microservices",
      "Biên dịch mã backend sang WebAssembly",
      "Làm nhiệm vụ thiết kế giao diện đồ họa cho website"
    ],
    "answer_index": 0,
    "explanation": "API Gateway đóng vai trò làm reverse proxy trung tâm che giấu kiến trúc nội bộ của hệ thống, xử lý các mối quan tâm xuyên suốt (cross-cutting concerns) như auth, telemetry, throttling.",
    "difficulty": "easy",
    "language": "Architecture",
    "course_id": 2
  },
  {
    "id": 134,
    "question": "Pattern 'CQRS' (Command Query Responsibility Segregation) đề xuất kiến trúc như thế nào cho ứng dụng?",
    "options": [
      "Tách biệt mô hình dữ liệu và đường dẫn xử lý của thao tác ghi (Commands: tạo, sửa, xóa) khỏi thao tác đọc (Queries: truy vấn xem)",
      "Bắt buộc mọi bảng phải có đúng 2 cột",
      "Gộp chung toàn bộ code đọc và ghi vào một hàm duy nhất",
      "Chỉ cho phép đọc dữ liệu vào ban ngày và ghi dữ liệu vào ban đêm"
    ],
    "answer_index": 0,
    "explanation": "CQRS phân tách rõ ràng trách nhiệm: Command thực hiện thay đổi trạng thái nghiệp vụ, còn Query tối ưu hóa riêng cho việc đọc (thậm chí có thể dùng cơ sở dữ liệu đọc riêng như Elasticsearch song song với PostgreSQL).",
    "difficulty": "hard",
    "language": "Architecture",
    "course_id": 2
  },
  {
    "id": 135,
    "question": "Thuộc tính 'Idempotency' (Tính lũy đẳng) trong thiết kế RESTful API có ý nghĩa gì đối với thao tác của client?",
    "options": [
      "Thực hiện một yêu cầu nhiều lần liên tiếp cũng mang lại kết quả trạng thái hệ thống giống hệt như khi chỉ thực hiện một lần duy nhất",
      "Mọi request đều phải trả về kết quả ngẫu nhiên",
      "Request chỉ được phép chạy trong vòng 1 nano giây",
      "Chỉ hỗ trợ phương thức GET"
    ],
    "answer_index": 0,
    "explanation": "Tính lũy đẳng đảm bảo việc gửi lặp lại cùng một request (ví dụ do mạng chập chờn timeout) không gây tác dụng phụ ngoài ý muốn (như trừ tiền tài khoản hai lần). GET, PUT, DELETE vốn có tính lũy đẳng; POST có thể dùng Idempotency-Key.",
    "difficulty": "medium",
    "language": "Architecture",
    "course_id": 2
  },
  {
    "id": 136,
    "question": "Phương thức phục hồi (Resilience Pattern) nào tự động ngắt các cuộc gọi tới một dịch vụ đang gặp sự cố để tránh gây tắc nghẽn dây chuyền toàn hệ thống?",
    "options": [
      "Circuit Breaker Pattern",
      "Observer Pattern",
      "Decorator Pattern",
      "Prototype Pattern"
    ],
    "answer_index": 0,
    "explanation": "Circuit Breaker giám sát tỷ lệ lỗi: khi số lần gọi thất bại vượt ngưỡng, mạch sẽ 'Open' (ngắt hoàn toàn), trả về fallback ngay lập tức mà không gửi tiếp request tới service đang chết, giúp service đó có thời gian hồi phục.",
    "difficulty": "medium",
    "language": "Architecture",
    "course_id": 2
  },
  {
    "id": 149,
    "question": "Trong HTML5, thẻ nào được dùng để định nghĩa khu vực điều hướng chính (navigation) của trang web?",
    "options": [
      "<nav>",
      "<menu>",
      "<header>",
      "<aside>"
    ],
    "answer_index": 0,
    "explanation": "<nav> là thẻ semantic HTML5 dành riêng cho khu vực điều hướng. Trình duyệt và screen reader nhận biết vai trò của nó, giúp cải thiện khả năng truy cập (accessibility) và SEO.",
    "difficulty": "easy",
    "language": "Frontend",
    "course_id": null
  },
  {
    "id": 150,
    "question": "Trong CSS, sự khác biệt chính giữa `display: block` và `display: inline` là gì?",
    "options": [
      "Block chiếm toàn bộ chiều rộng dòng và xuống hàng; Inline chỉ chiếm đúng phần nội dung và nằm cùng hàng với các phần tử khác",
      "Block thì ẩn đi; Inline thì hiện ra",
      "Block chỉ dùng cho văn bản; Inline chỉ dùng cho hình ảnh",
      "Block và Inline hoàn toàn giống nhau, chỉ khác tên gọi"
    ],
    "answer_index": 0,
    "explanation": "Phần tử block (div, p, h1...) chiếm toàn bộ chiều ngang của cha và bắt đầu dòng mới. Phần tử inline (span, a, strong...) chỉ rộng bằng nội dung và nằm cùng dòng với các phần tử xung quanh.",
    "difficulty": "easy",
    "language": "Frontend",
    "course_id": null
  },
  {
    "id": 151,
    "question": "Trong mô hình hộp CSS (Box Model), thuộc tính `box-sizing: border-box` ảnh hưởng đến cách tính kích thước phần tử như thế nào?",
    "options": [
      "Width và height bao gồm cả padding và border — dễ kiểm soát layout hơn",
      "Width và height chỉ tính phần content, không gồm padding hay border",
      "Box-sizing không liên quan đến kích thước phần tử",
      "Border-box loại bỏ hoàn toàn margin của phần tử"
    ],
    "answer_index": 0,
    "explanation": "Với border-box, khi bạn set width:200px, phần tử sẽ luôn rộng 200px kể cả padding và border. Ngược lại, content-box (mặc định) làm phần tử rộng hơn khi thêm padding/border.",
    "difficulty": "medium",
    "language": "Frontend",
    "course_id": null
  },
  {
    "id": 152,
    "question": "Trong JavaScript, sự khác biệt giữa `let`, `const` và `var` về phạm vi (scope) là gì?",
    "options": [
      "let và const có block scope ({}); var có function scope và bị hoisting lên đầu hàm",
      "Cả ba từ khóa đều hoàn toàn giống nhau về scope",
      "const không thể dùng trong vòng lặp for",
      "var chỉ được dùng bên trong class"
    ],
    "answer_index": 0,
    "explanation": "var bị hoisting và có function scope, có thể gây bug khó phát hiện. let/const có block scope — chỉ tồn tại trong cặp {} nơi chúng được khai báo. const thêm ràng buộc không thể gán lại giá trị.",
    "difficulty": "easy",
    "language": "Frontend",
    "course_id": null
  },
  {
    "id": 153,
    "question": "Flexbox CSS giải quyết vấn đề gì mà các kỹ thuật layout cũ (float, inline-block) gặp khó khăn?",
    "options": [
      "Căn chỉnh và phân phối khoảng cách giữa các phần tử theo một chiều (ngang hoặc dọc) một cách linh hoạt và dễ dàng",
      "Tạo animation cho phần tử",
      "Đặt màu nền gradient cho container",
      "Tự động thêm border cho phần tử con"
    ],
    "answer_index": 0,
    "explanation": "Flexbox giúp căn giữa phần tử, phân phối space, co giãn (flex-grow/shrink) và sắp xếp thứ tự phần tử con mà không cần hack float hay margin âm như trước đây.",
    "difficulty": "easy",
    "language": "Frontend",
    "course_id": null
  },
  {
    "id": 154,
    "question": "Trong JavaScript, `event.preventDefault()` được dùng để làm gì?",
    "options": [
      "Ngăn chặn hành vi mặc định của trình duyệt (ví dụ: ngăn form submit reload trang, ngăn link chuyển hướng)",
      "Xóa toàn bộ event listener khỏi trang",
      "Dừng vòng lặp for đang chạy",
      "Ngăn JavaScript load thêm tệp"
    ],
    "answer_index": 0,
    "explanation": "preventDefault() hủy hành vi mặc định của browser — ví dụ khi submit form sẽ không reload trang, khi click link sẽ không điều hướng. Thường dùng để xử lý logic bằng JS trước khi thực hiện hành động.",
    "difficulty": "medium",
    "language": "Frontend",
    "course_id": null
  },
  {
    "id": 155,
    "question": "Phương pháp thiết kế web `Responsive Design` sử dụng công cụ CSS nào để áp dụng style khác nhau cho màn hình kích thước khác nhau?",
    "options": [
      "CSS Media Queries (@media screen and (max-width: ...))",
      "Thuộc tính CSS screen-size",
      "JavaScript window.onresize duy nhất",
      "Thẻ HTML <responsive>"
    ],
    "answer_index": 0,
    "explanation": "Media Queries cho phép áp dụng CSS khác nhau tùy theo chiều rộng màn hình, orientation, hoặc loại thiết bị. Đây là nền tảng của Responsive Design giúp web hiển thị tốt trên mobile, tablet và desktop.",
    "difficulty": "easy",
    "language": "Frontend",
    "course_id": null
  },
  {
    "id": 156,
    "question": "Trong HTML5, thuộc tính `defer` trong thẻ `<script>` có tác dụng gì?",
    "options": [
      "Tải script song song với HTML parsing nhưng chỉ thực thi SAU khi HTML được parse xong hoàn toàn",
      "Tải script trước, dừng parse HTML lại để chờ",
      "Không tải script — chỉ đánh dấu để bỏ qua",
      "Buộc script chạy trong Web Worker riêng biệt"
    ],
    "answer_index": 0,
    "explanation": "Script thường dùng async và defer để tối ưu tốc độ tải trang. defer đảm bảo DOM sẵn sàng trước khi script chạy — lý tưởng cho script cần thao tác DOM. async chạy ngay khi tải xong bất kể DOM.",
    "difficulty": "medium",
    "language": "Frontend",
    "course_id": null
  },
  {
    "id": 157,
    "question": "Vòng lặp `for...of` trong JavaScript khác gì so với `for...in`?",
    "options": [
      "for...of duyệt qua các GIÁ TRỊ của iterable (Array, String, Map...); for...in duyệt qua các KHÓA (key/index) của object",
      "for...of chỉ dùng được với object; for...in chỉ dùng với Array",
      "Cả hai hoàn toàn giống nhau, chỉ khác cú pháp",
      "for...in nhanh hơn for...of trong mọi trường hợp"
    ],
    "answer_index": 0,
    "explanation": "for...of lấy từng phần tử trong mảng/chuỗi/Set/Map. for...in lấy key của object (index dạng string với array). Thường dùng for...of cho array, for...in cho object enumeration — tránh dùng for...in với array vì có thể lấy cả inherited properties.",
    "difficulty": "medium",
    "language": "Frontend",
    "course_id": null
  },
  {
    "id": 158,
    "question": "Trong CSS, `position: absolute` định vị phần tử dựa theo phần tử cha nào?",
    "options": [
      "Phần tử tổ tiên gần nhất có `position` khác `static` (relative/absolute/fixed/sticky)",
      "Luôn luôn là thẻ <body>",
      "Luôn luôn là phần tử cha trực tiếp dù position là gì",
      "Phần tử absolute luôn định vị theo viewport (cửa sổ trình duyệt)"
    ],
    "answer_index": 0,
    "explanation": "Absolute element thoát khỏi luồng thông thường và định vị theo containing block — là cha gần nhất có position != static. Nếu không có cha nào, nó định vị theo <html>. Đây là lý do hay dùng position: relative trên cha để kiểm soát.",
    "difficulty": "medium",
    "language": "Frontend",
    "course_id": null
  },
  {
    "id": 159,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 160,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 161,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 162,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 163,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 164,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 165,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 166,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 167,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 168,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 169,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 170,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 171,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 172,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 173,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 174,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 175,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 176,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 177,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 178,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 179,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 180,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 181,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 182,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 183,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 184,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 185,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 186,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 187,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 188,
    "question": "Cơ chế nào trong Python 3.11+ giúp tăng tốc độ thực thi mã nguồn lên tới 10-60% so với Python 3.10?",
    "options": [
      "Loại bỏ hoàn toàn GIL (Global Interpreter Lock)",
      "Dự án Faster CPython (Adaptive specializing interpreter)",
      "Chuyển sang JIT compiler của PyPy",
      "Bắt buộc biên dịch AOT"
    ],
    "answer_index": 1,
    "explanation": "Python 3.11 triển khai dự án Faster CPython với Adaptive Specializing Interpreter giúp tối ưu các bytecode thường xuyên được gọi.",
    "difficulty": "hard",
    "language": "python",
    "course_id": null
  },
  {
    "id": 189,
    "question": "Trong React 19, cú pháp để sử dụng Form Actions và xử lý trạng thái submit bất đồng bộ là gì?",
    "options": [
      "Sử dụng hook useActionState()",
      "Sử dụng hook useEffect() kết hợp useState()",
      "Bắt buộc dùng Redux Thunk",
      "Dùng useCallback() với ref"
    ],
    "answer_index": 0,
    "explanation": "React 19 giới thiệu hook useActionState để tự động quản lý trạng thái loading, lỗi và kết quả trả về của Form Actions.",
    "difficulty": "medium",
    "language": "PHP",
    "course_id": null
  },
  {
    "id": 190,
    "question": "FastAPI sử dụng thư viện nào làm nền tảng kiểm tra kiểu dữ liệu (data validation) và serialization?",
    "options": [
      "Marshmallow",
      "Pydantic",
      "Django REST Serializer",
      "Cerberus"
    ],
    "answer_index": 1,
    "explanation": "FastAPI được xây dựng dựa trên Pydantic để thực hiện validation dữ liệu tự động với hiệu năng cao bằng Rust (Pydantic V2).",
    "difficulty": "medium",
    "language": "PHP",
    "course_id": null
  },
  {
    "id": 191,
    "question": "Mục tiêu cốt lõi của việc thiết lập Connection Pooling trong PostgreSQL / SQLAlchemy 2.0 là gì?",
    "options": [
      "Mã hóa dữ liệu tại chỗ",
      "Tái sử dụng các kết nối cơ sở dữ liệu đã mở, giảm overhead khởi tạo kết nối TCP/TLS",
      "Tự động phân vùng bảng lớn",
      "Tăng kích thước RAM của máy chủ"
    ],
    "answer_index": 1,
    "explanation": "Khởi tạo kết nối PostgreSQL tốn kém tài nguyên. Connection Pooling duy trì một nhóm kết nối sẵn sàng để tái sử dụng ngay lập tức.",
    "difficulty": "medium",
    "language": "PHP",
    "course_id": null
  },
  {
    "id": 192,
    "question": "Trong kiến trúc Microservices, Pattern nào thường được sử dụng để duy trì tính nhất quán dữ liệu giữa các dịch vụ phân tán?",
    "options": [
      "Singleton Pattern",
      "Saga Pattern (Choreography hoặc Orchestration)",
      "Factory Pattern",
      "Decorator Pattern"
    ],
    "answer_index": 1,
    "explanation": "Saga Pattern chia transaction phân tán thành chuỗi các local transaction với các giao dịch bù trừ (compensating transactions) khi có lỗi.",
    "difficulty": "medium",
    "language": "PHP",
    "course_id": null
  },
  {
    "id": 193,
    "question": "Trong quy trình CI/CD với Docker, Multi-stage Build mang lại lợi ích quan trọng nào?",
    "options": [
      "Cho phép chạy nhiều container cùng một port",
      "Giảm đáng kể kích thước image thành phẩm bằng cách loại bỏ compiler và dev dependencies",
      "Tự động backup dữ liệu container",
      "Thay thế hoàn toàn Kubernetes"
    ],
    "answer_index": 1,
    "explanation": "Multi-stage build tách biệt giai đoạn build và runtime, chỉ copy artifact cần thiết vào image cuối, giúp tối ưu dung lượng và bảo mật.",
    "difficulty": "medium",
    "language": "PHP",
    "course_id": null
  },
  {
    "id": 194,
    "question": "FastAPI sử dụng thư viện nào làm nền tảng kiểm tra kiểu dữ liệu (Data Validation) và tự động sinh Swagger OpenAPI documentation?",
    "options": [
      "Cerberus",
      "Marshmallow",
      "Django Forms Serializer",
      "Pydantic (Pydantic V2 được viết lại bằng Rust)"
    ],
    "answer_index": 3,
    "explanation": "FastAPI được xây dựng dựa trên Pydantic để thực hiện validation dữ liệu tự động với hiệu năng cực cao và kiểu dữ liệu Python chuẩn (type hints).",
    "difficulty": "easy",
    "language": "FastAPI",
    "course_id": null
  },
  {
    "id": 195,
    "question": "Trong FastAPI, cơ chế nào cho phép tái sử dụng logic dùng chung như xác thực quyền (authentication), kết nối CSDL và xử lý phân quyền?",
    "options": [
      "Hệ thống Dependency Injection thông qua hàm `Depends()`",
      "Sử dụng biến static trong Class Singleton",
      "Bắt buộc dùng decorators `@property` lồng nhau",
      "Ghi đè thuộc tính toàn cục `__globals__`"
    ],
    "answer_index": 0,
    "explanation": "FastAPI có hệ thống Dependency Injection mạnh mẽ và trực quan thông qua Depends(), giúp inject DB Session, current user rất sạch sẽ và dễ test.",
    "difficulty": "medium",
    "language": "FastAPI",
    "course_id": null
  },
  {
    "id": 196,
    "question": "Mục đích quan trọng nhất của việc sử dụng Connection Pooling (nhóm kết nối) trong PostgreSQL với SQLAlchemy là gì?",
    "options": [
      "Tăng tốc độ mạng internet của máy tính client",
      "Tái sử dụng các kết nối cơ sở dữ liệu đã mở, giảm chi phí overhead khởi tạo kết nối TCP/TLS tốn kém",
      "Xóa bỏ hoàn toàn nhu cầu đánh Index cho bảng dữ liệu",
      "Tự động mã hóa toàn bộ ổ đĩa cứng của server database"
    ],
    "answer_index": 1,
    "explanation": "Khởi tạo kết nối mới tới PostgreSQL tiêu tốn nhiều tài nguyên CPU và RAM. Connection Pool duy trì sẵn các kết nối mở để tái sử dụng ngay lập tức.",
    "difficulty": "medium",
    "language": "PostgreSQL",
    "course_id": null
  },
  {
    "id": 197,
    "question": "Trong kiến trúc Microservices phân tán, Pattern nào thường được sử dụng để quản lý các transaction liên quan đến nhiều service mà không cần dùng Two-Phase Commit (2PC)?",
    "options": [
      "Factory Pattern",
      "Singleton Pattern",
      "Saga Pattern (Choreography hoặc Orchestration)",
      "Observer Pattern"
    ],
    "answer_index": 2,
    "explanation": "Saga Pattern chia transaction phân tán thành chuỗi các local transaction với các giao dịch bù trừ (compensating transactions) khi xảy ra lỗi.",
    "difficulty": "hard",
    "language": "Architecture",
    "course_id": null
  },
  {
    "id": 198,
    "question": "Khái niệm `async / await` trong Python và FastAPI mang lại lợi ích gì cho các tác vụ I/O bound (gọi database, HTTP API ngoài)?",
    "options": [
      "Bỏ qua hoàn toàn việc kiểm tra lỗi runtime",
      "Tự động biên dịch mã nguồn Python sang Java",
      "Cho phép một tiến trình xử lý hàng ngàn request đồng thời (non-blocking concurrency) mà không bị block luồng khi đợi I/O",
      "Tăng xung nhịp phần cứng CPU của máy chủ"
    ],
    "answer_index": 2,
    "explanation": "Asyncio giải phóng Event Loop khi đang chờ phản hồi từ CSDL hay network I/O, giúp server tiếp tục phục vụ các request khác song song.",
    "difficulty": "medium",
    "language": "Python",
    "course_id": null
  }
];

export const POST_QUIZ_MAPPING = {
  1: [85, 136, 73, 74, 75, 76, 77, 78, 79, 80],
  2: [62, 63, 64, 65, 66, 67, 68, 69, 70, 71],
  3: [95, 96, 97, 98, 99, 100, 101, 102, 103, 104],
  7: [149, 150, 151, 152, 153, 154, 155, 156, 157, 158],
  9: [194, 195, 196, 197, 198]
};

export const DEFAULT_POST_QUIZZES = [
  {
    post_id: 1,
    title: "Xây Dựng Hệ Thống Kiến Trúc Microservices Với FastAPI Và PostgreSQL",
    slug: "xay-dung-he-thong-kien-truc-microservices-voi-fastapi-va-postgresql",
    category_name: "Backend",
    cover_image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1000&auto=format&fit=crop&q=80",
    question_count: 10,
    author_name: "Nguyễn Văn Hoàng",
    question_ids: [85, 136, 73, 74, 75, 76, 77, 78, 79, 80]
  },
  {
    post_id: 2,
    title: "Tối Ưu Hóa Giao Diện Người Dùng Với React 19 Và Tailwind CSS v4",
    slug: "toi-uu-hoa-giao-dien-nguoi-dung-voi-react-19-va-tailwind-css-v4",
    category_name: "Frontend",
    cover_image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1000&auto=format&fit=crop&q=80",
    question_count: 10,
    author_name: "Quản Trị Viên IT Blog",
    question_ids: [62, 63, 64, 65, 66, 67, 68, 69, 70, 71]
  },
  {
    post_id: 3,
    title: "Tự Động Hóa Triển Khai Ứng Dụng Bằng Docker Và GitHub Actions",
    slug: "tu-dong-hoa-trien-khai-ung-dung-bang-docker-va-github-actions",
    category_name: "DevOps",
    cover_image: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=1000&auto=format&fit=crop&q=80",
    question_count: 10,
    author_name: "Nguyễn Văn Hoàng",
    question_ids: [95, 96, 97, 98, 99, 100, 101, 102, 103, 104]
  },
  {
    post_id: 7,
    title: "Làm chủ Lập trình website cơ  bản: Hướng dẫn từ Cơ bản đến Thực chiến 2026",
    slug: "lam-chu-lap-trinh-website-co-ban-huong-dan-tu-co-ban-den-thuc-chien-2026",
    category_name: "Backend",
    cover_image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1000&auto=format&fit=crop&q=80",
    question_count: 10,
    author_name: "Quản Trị Viên IT Blog",
    question_ids: [149, 150, 151, 152, 153, 154, 155, 156, 157, 158]
  },
  {
    post_id: 9,
    title: "Hướng dẫn Thực chiến: python 2026",
    slug: "huong-dan-thuc-chien-python-2026",
    category_name: "Frontend",
    cover_image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=1000&auto=format&fit=crop&q=80",
    question_count: 5,
    author_name: "Quản Trị Viên IT Blog",
    question_ids: [194, 195, 196, 197, 198]
  }
];

export const DEFAULT_QUIZ_QUESTIONS = RAW_QUIZ_QUESTIONS.map((q, idx) => {
  const qIdNum = Number(q.id);
  const pids = [];
  for (const [pid, qids] of Object.entries(POST_QUIZ_MAPPING)) {
    if (qids.includes(qIdNum)) {
      pids.push(Number(pid));
    }
  }
  return {
    id: q.id != null ? String(q.id) : `qb-${idx + 1}`,
    ...q,
    post_ids: pids
  };
});

export const TOPIC_ALIASES = {
  all: [],
  React: ["react", "react 19", "frontend", "tailwind css", "tailwind", "nextjs", "next.js", "ui"],
  FastAPI: ["fastapi", "backend", "pydantic", "fastapi & backend", "fastapi / python"],
  PostgreSQL: ["postgresql", "postgres", "database", "sql", "csdl"],
  DevOps: ["devops", "docker", "ci/cd", "kubernetes", "k8s", "docker / devops", "linux"],
  Python: ["python", "asyncio", "python core", "cpython"],
  Security: ["security", "web security", "owasp", "bảo mật", "bảo mật web", "jwt"],
  Architecture: ["architecture", "microservices", "system design", "kiến trúc", "hệ thống", "kiến trúc hệ thống"],
  Fullstack: ["fullstack", "full stack", "html5", "css3", "javascript", "html/web", "web", "clean architecture", "php"]
};

export const DEFAULT_QUIZ_TOPICS = RAW_QUIZ_TOPICS.map((topic) => {
  if (topic.id === "all") {
    return { ...topic, question_count: RAW_QUIZ_QUESTIONS.length };
  }
  const aliases = TOPIC_ALIASES[topic.id] || [topic.id.toLowerCase()];
  const cnt = RAW_QUIZ_QUESTIONS.filter((q) => {
    const lang = (q.language || "").toLowerCase();
    return aliases.some((a) => lang.includes(a));
  }).length;
  return { ...topic, question_count: cnt };
});
