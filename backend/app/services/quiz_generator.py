import json
import logging
import random
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.post import Post
from app.models.quiz import QuizQuestion, QuizQuestionPost
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)


def _shuffle_question_options(q_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to shuffle options while preserving the correct answer index."""
    options = list(q_dict.get("options", []))
    correct_idx = q_dict.get("answer_index", 0)
    if not options or correct_idx >= len(options):
        return q_dict

    correct_option = options[correct_idx]
    random.shuffle(options)
    new_correct_idx = options.index(correct_option)

    res = q_dict.copy()
    res["options"] = options
    res["answer_index"] = new_correct_idx
    return res


def build_domain_fallback_bank() -> Dict[str, List[Dict[str, Any]]]:
    """Pre-crafted, accurate technical questions categorized by technical domain."""
    return {
        "web_basic": [
            {
                "question": "Trong kiến trúc xây dựng website cơ bản, ngôn ngữ nào đóng vai trò xác định 'bộ khung xương' và cấu trúc ngữ nghĩa của trang web?",
                "options": [
                    "HTML (HyperText Markup Language)",
                    "CSS (Cascading Style Sheets)",
                    "JavaScript (JS Engine)",
                    "SQL (Structured Query Language)"
                ],
                "answer_index": 0,
                "explanation": "HTML cung cấp cấu trúc ngữ nghĩa bằng các phần tử (tags/elements) để trình duyệt hiển thị đúng nội dung văn bản, ảnh, video của website.",
                "difficulty": "easy",
                "language": "HTML/Web"
            },
            {
                "question": "Thẻ `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">` trong phần `<head>` của trang web có vai trò cốt lõi nào?",
                "options": [
                    "Đảm bảo website hiển thị thích ứng chuẩn xác (Responsive) trên màn hình thiết bị di động",
                    "Kích hoạt nạp tệp JavaScript bất đồng bộ",
                    "Mã hóa bảo mật toàn bộ dữ liệu người dùng gửi lên",
                    "Tự động làm mới trang web sau mỗi 10 giây"
                ],
                "answer_index": 0,
                "explanation": "Thẻ meta viewport thiết lập kích thước vùng nhìn bằng với độ rộng thiết bị và tỷ lệ phóng đại ban đầu là 1.0, là chuẩn mực bắt buộc cho thiết kế Web thích ứng.",
                "difficulty": "easy",
                "language": "HTML5"
            },
            {
                "question": "Trong CSS hiện đại, thuộc tính nào được sử dụng để kích hoạt mô hình dàn trang 1 chiều linh hoạt, tự động căn chỉnh và phân bổ không gian giữa các phần tử?",
                "options": [
                    "display: flex",
                    "position: absolute",
                    "float: left",
                    "display: inline"
                ],
                "answer_index": 0,
                "explanation": "Mô hình Flexbox (display: flex) cho phép thiết kế giao diện linh hoạt, dễ dàng căn giữa (justify-content, align-items) và co giãn theo kích thước khung chứa.",
                "difficulty": "medium",
                "language": "CSS3"
            },
            {
                "question": "Vai trò quan trọng nhất của ngôn ngữ JavaScript khi chạy trên trình duyệt web là gì?",
                "options": [
                    "Bắt các sự kiện tương tác của người dùng, thực thi logic nghiệp vụ và cập nhật cây cấu trúc DOM động",
                    "Định dạng màu sắc, font chữ và căn chỉnh lề margin cho trang web",
                    "Quản lý việc lưu trữ bảng dữ liệu quan hệ tại máy chủ database",
                    "Biên dịch mã HTML sang mã nhị phân của hệ điều hành"
                ],
                "answer_index": 0,
                "explanation": "JavaScript mang lại tính tương tác cho trang web, cho phép phản hồi các thao tác như click, gõ phím, kéo thả và gọi API lấy dữ liệu mà không cần tải lại trang.",
                "difficulty": "easy",
                "language": "JavaScript"
            },
            {
                "question": "Giao thức truyền tải web an toàn sử dụng cổng chuẩn 443 kết hợp chứng chỉ số TLS/SSL để mã hóa đường truyền dữ liệu là gì?",
                "options": [
                    "HTTPS (HyperText Transfer Protocol Secure)",
                    "HTTP không mã hóa (cổng 80)",
                    "FTP (File Transfer Protocol - cổng 21)",
                    "Telnet (cổng 23)"
                ],
                "answer_index": 0,
                "explanation": "HTTPS mã hóa toàn bộ dữ liệu trao đổi giữa trình duyệt của người dùng và máy chủ, ngăn chặn nghe lén thông tin và bảo vệ quyền riêng tư.",
                "difficulty": "easy",
                "language": "Web Security"
            },
            {
                "question": "Trong HTML5, các thẻ ngữ nghĩa (Semantic Tags) như `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>` mang lại lợi ích quan trọng nhất nào?",
                "options": [
                    "Giúp cấu trúc trang web rõ ràng, tăng khả năng tiếp cận (Accessibility) và tối ưu hóa công cụ tìm kiếm (SEO)",
                    "Làm cho trang web tự động đổi màu mà không cần CSS",
                    "Tăng tốc độ kết nối Internet của người dùng",
                    "Bắt buộc mã nguồn phải viết bằng TypeScript"
                ],
                "answer_index": 0,
                "explanation": "Thẻ ngữ nghĩa (Semantic Elements) giúp các trình đọc màn hình (Screen Readers) và bot tìm kiếm (Googlebot) hiểu rõ vai trò của từng khối nội dung trên website.",
                "difficulty": "easy",
                "language": "HTML5"
            },
            {
                "question": "Sự khác biệt cơ bản giữa phần tử khối (Block Element như `<div>`, `<p>`) và phần tử nội dòng (Inline Element như `<span>`, `<a>`) trong HTML là gì?",
                "options": [
                    "Phần tử Block luôn bắt đầu trên một dòng mới và chiếm toàn bộ chiều rộng có sẵn, trong khi Inline chỉ chiếm độ rộng vừa đủ nội dung",
                    "Phần tử Inline không thể chứa chữ",
                    "Phần tử Block chỉ dùng được trong phần <head>",
                    "Phần tử Inline tự động tạo cơ sở dữ liệu"
                ],
                "answer_index": 0,
                "explanation": "Phần tử Block (như div, p, h1-h6) bắt đầu trên dòng mới và kéo dài tối đa chiều rộng vùng chứa; phần tử Inline (span, a, strong) nằm cùng hàng với các phần tử khác xung quanh.",
                "difficulty": "easy",
                "language": "HTML/Web"
            },
            {
                "question": "Mô hình hộp (CSS Box Model) trong thiết kế website bao gồm 4 thành phần theo thứ tự từ trong ra ngoài là gì?",
                "options": [
                    "Content (Nội dung) -> Padding (Đệm) -> Border (Viền) -> Margin (Lề)",
                    "Margin -> Border -> Padding -> Content",
                    "Border -> Margin -> Content -> Padding",
                    "Content -> Margin -> Border -> Padding"
                ],
                "answer_index": 0,
                "explanation": "CSS Box Model gồm: Content (nội dung text/ảnh), Padding (khoảng cách từ nội dung tới viền), Border (đường viền bao quanh) và Margin (khoảng cách bên ngoài viền với phần tử khác).",
                "difficulty": "easy",
                "language": "CSS3"
            },
            {
                "question": "Khi cần xây dựng bố cục dàn trang website 2 chiều phức tạp (cả hàng dọc lẫn cột ngang đồng thời), giải pháp CSS hiện đại nào tối ưu nhất?",
                "options": [
                    "CSS Grid Layout (display: grid)",
                    "Dùng thẻ <table> lồng nhau",
                    "Dùng thuộc tính float: left cho mọi thẻ",
                    "Chỉ dùng margin âm"
                ],
                "answer_index": 0,
                "explanation": "CSS Grid là hệ thống dàn trang 2 chiều (2-dimensional) mạnh mẽ nhất của CSS, cho phép chia trang web thành các hàng (rows) và cột (columns) với kích thước linh hoạt.",
                "difficulty": "medium",
                "language": "CSS3"
            },
            {
                "question": "Trong JavaScript, phương thức chuẩn hiện đại nào được sử dụng phổ biến nhất để tìm và chọn phần tử đầu tiên trong DOM khớp với một CSS Selector?",
                "options": [
                    "document.querySelector()",
                    "document.findFirstElement()",
                    "document.searchCSS()",
                    "window.selectNode()"
                ],
                "answer_index": 0,
                "explanation": "document.querySelector('selector') cho phép chọn phần tử theo bất kỳ cú pháp CSS selector hợp lệ nào (như '.my-class', '#my-id', 'div > p') rất linh hoạt.",
                "difficulty": "easy",
                "language": "JavaScript"
            }
        ],
        "react": [
            {
                "question": "Trong React 19, hook nào được chuẩn hóa để xử lý Form Actions và tự động quản lý các trạng thái pending, error và kết quả trả về?",
                "options": [
                    "useActionState()",
                    "useEffect() kết hợp useState()",
                    "useReducer() truyền thống",
                    "useMemo() với dependency array"
                ],
                "answer_index": 0,
                "explanation": "React 19 giới thiệu hook useActionState giúp đơn giản hóa việc submit form và quản lý trạng thái tải/lỗi mà không cần viết boilerplate thủ công.",
                "difficulty": "medium",
                "language": "React 19"
            },
            {
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
                "language": "Tailwind CSS"
            },
            {
                "question": "Khái niệm Virtual DOM (DOM ảo) trong React có mục đích cốt lõi là gì?",
                "options": [
                    "Tối ưu hiệu năng bằng cách tính toán sự khác biệt (diffing) trong bộ nhớ trước khi áp dụng thay đổi tối thiểu lên Real DOM",
                    "Thay thế hoàn toàn bộ nhớ RAM của trình duyệt",
                    "Mã hóa bảo mật mã nguồn JavaScript trên máy khách",
                    "Tự động chuyển đổi code JSX sang ngôn ngữ C++"
                ],
                "answer_index": 0,
                "explanation": "Thao tác trên DOM thật rất chậm; React dùng Virtual DOM để so sánh (Reconciliation) và chỉ cập nhật những node thực sự thay đổi trên DOM thật.",
                "difficulty": "easy",
                "language": "React"
            },
            {
                "question": "Quy tắc quan trọng (Rule of Hooks) nào trong React bắt buộc lập trình viên phải tuân thủ?",
                "options": [
                    "Chỉ gọi Hooks ở cấp cao nhất của Functional Component, không gọi trong vòng lặp (loop), câu lệnh điều kiện (if) hay hàm lồng nhau",
                    "Mọi Hook đều phải được khai báo trong Class Component",
                    "Không được phép truyền tham số vào React Hook",
                    "Bắt buộc đặt tên Hook bắt đầu bằng chữ 'get' thay vì 'use'"
                ],
                "answer_index": 0,
                "explanation": "Quy tắc này đảm bảo các React Hooks luôn được thực thi theo cùng một thứ tự ở mỗi lần component re-render.",
                "difficulty": "easy",
                "language": "React"
            },
            {
                "question": "Trong React 19, thẻ `<form action={...}>` có thể nhận trực tiếp loại giá trị nào để thực thi cả ở máy chủ (Server Action) hoặc máy khách (Client Action)?",
                "options": [
                    "Một hàm bất đồng bộ (Async Function) xử lý dữ liệu Form",
                    "Chỉ nhận một chuỗi URL string trỏ tới endpoint backend",
                    "Chỉ chấp nhận đối tượng JSON tĩnh",
                    "Bắt buộc phải truyền một biến Boolean true/false"
                ],
                "answer_index": 0,
                "explanation": "React 19 nâng cấp thuộc tính action của thẻ form cho phép truyền trực tiếp function xử lý dữ liệu tự động tích hợp với useActionState.",
                "difficulty": "medium",
                "language": "React 19"
            }
        ],
        "fastapi": [
            {
                "question": "FastAPI sử dụng thư viện nào làm nền tảng kiểm tra kiểu dữ liệu (Data Validation) và tự động sinh Swagger OpenAPI documentation?",
                "options": [
                    "Pydantic (Pydantic V2 được viết lại bằng Rust)",
                    "Marshmallow",
                    "Cerberus",
                    "Django Forms Serializer"
                ],
                "answer_index": 0,
                "explanation": "FastAPI được xây dựng dựa trên Pydantic để thực hiện validation dữ liệu tự động với hiệu năng cực cao và kiểu dữ liệu Python chuẩn (type hints).",
                "difficulty": "easy",
                "language": "FastAPI"
            },
            {
                "question": "Trong FastAPI, cơ chế nào cho phép tái sử dụng logic dùng chung như xác thực quyền (authentication), kết nối CSDL và xử lý phân quyền?",
                "options": [
                    "Hệ thống Dependency Injection thông qua hàm `Depends()`",
                    "Ghi đè thuộc tính toàn cục `__globals__`",
                    "Sử dụng biến static trong Class Singleton",
                    "Bắt buộc dùng decorators `@property` lồng nhau"
                ],
                "answer_index": 0,
                "explanation": "FastAPI có hệ thống Dependency Injection mạnh mẽ và trực quan thông qua Depends(), giúp inject DB Session, current user rất sạch sẽ và dễ test.",
                "difficulty": "medium",
                "language": "FastAPI"
            },
            {
                "question": "Mục đích quan trọng nhất của việc sử dụng Connection Pooling (nhóm kết nối) trong PostgreSQL với SQLAlchemy là gì?",
                "options": [
                    "Tái sử dụng các kết nối cơ sở dữ liệu đã mở, giảm chi phí overhead khởi tạo kết nối TCP/TLS tốn kém",
                    "Tự động mã hóa toàn bộ ổ đĩa cứng của server database",
                    "Xóa bỏ hoàn toàn nhu cầu đánh Index cho bảng dữ liệu",
                    "Tăng tốc độ mạng internet của máy tính client"
                ],
                "answer_index": 0,
                "explanation": "Khởi tạo kết nối mới tới PostgreSQL tiêu tốn nhiều tài nguyên CPU và RAM. Connection Pool duy trì sẵn các kết nối mở để tái sử dụng ngay lập tức.",
                "difficulty": "medium",
                "language": "PostgreSQL"
            },
            {
                "question": "Trong kiến trúc Microservices phân tán, Pattern nào thường được sử dụng để quản lý các transaction liên quan đến nhiều service mà không cần dùng Two-Phase Commit (2PC)?",
                "options": [
                    "Saga Pattern (Choreography hoặc Orchestration)",
                    "Singleton Pattern",
                    "Factory Pattern",
                    "Observer Pattern"
                ],
                "answer_index": 0,
                "explanation": "Saga Pattern chia transaction phân tán thành chuỗi các local transaction với các giao dịch bù trừ (compensating transactions) khi xảy ra lỗi.",
                "difficulty": "hard",
                "language": "Architecture"
            },
            {
                "question": "Khái niệm `async / await` trong Python và FastAPI mang lại lợi ích gì cho các tác vụ I/O bound (gọi database, HTTP API ngoài)?",
                "options": [
                    "Cho phép một tiến trình xử lý hàng ngàn request đồng thời (non-blocking concurrency) mà không bị block luồng khi đợi I/O",
                    "Tăng xung nhịp phần cứng CPU của máy chủ",
                    "Tự động biên dịch mã nguồn Python sang Java",
                    "Bỏ qua hoàn toàn việc kiểm tra lỗi runtime"
                ],
                "answer_index": 0,
                "explanation": "Asyncio giải phóng Event Loop khi đang chờ phản hồi từ CSDL hay network I/O, giúp server tiếp tục phục vụ các request khác song song.",
                "difficulty": "medium",
                "language": "Python"
            }
        ],
        "devops": [
            {
                "question": "Trong kỹ thuật viết Dockerfile cho ứng dụng sản phẩm (Production), Multi-stage Build mang lại lợi ích cốt lõi nào?",
                "options": [
                    "Giảm đáng kể dung lượng Docker Image thành phẩm bằng cách tách biệt môi trường build và runtime, loại bỏ công cụ biên dịch thừa",
                    "Cho phép nhiều container cùng chạy trên một cổng mạng duy nhất mà không bị xung đột",
                    "Tự động backup dữ liệu container lên đám mây",
                    "Thay thế hoàn toàn cụm Kubernetes"
                ],
                "answer_index": 0,
                "explanation": "Multi-stage build chỉ copy kết quả build cần thiết sang image runtime siêu nhẹ (như alpine hay distroless), giúp image nhẹ hơn và an toàn hơn.",
                "difficulty": "medium",
                "language": "Docker"
            },
            {
                "question": "Trong tệp cấu hình GitHub Actions Workflow (`.github/workflows/*.yml`), chỉ thị `on:` có nhiệm vụ gì?",
                "options": [
                    "Định nghĩa các sự kiện kích hoạt quy trình CI/CD (ví dụ: push, pull_request, schedule)",
                    "Thiết lập mật khẩu đăng nhập vào máy chủ",
                    "Cài đặt hệ điều hành cho máy tính cá nhân của lập trình viên",
                    "Chỉ định danh sách người nhận email báo cáo kết quả"
                ],
                "answer_index": 0,
                "explanation": "Chỉ thị 'on:' xác định các trigger (sự kiện) cụ thể trên kho mã nguồn GitHub sẽ làm quy trình CI/CD tự động khởi chạy.",
                "difficulty": "easy",
                "language": "CI/CD"
            },
            {
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
                "language": "Docker"
            },
            {
                "question": "Trong Docker Compose (`docker-compose.yml`), thuộc tính `volumes:` thường được khai báo với mục đích gì?",
                "options": [
                    "Duy trì dữ liệu bền vững (persistence) bên ngoài vòng đời của container (như dữ liệu database)",
                    "Điều chỉnh âm lượng âm thanh của hệ thống máy chủ",
                    "Giới hạn tốc độ băng thông internet của ứng dụng",
                    "Tự động tăng RAM ảo cho container khi bị quá tải"
                ],
                "answer_index": 0,
                "explanation": "Dữ liệu bên trong container mặc định là tạm thời (ephemeral). Volumes ánh xạ thư mục ra máy chủ host để dữ liệu không bị mất khi container khởi động lại.",
                "difficulty": "easy",
                "language": "Docker"
            },
            {
                "question": "Lệnh Docker nào được sử dụng để xây dựng một image từ Dockerfile trong thư mục hiện tại và gắn thẻ (tag) định danh tên cho image đó?",
                "options": [
                    "docker build -t my-app:latest .",
                    "docker run -d my-app",
                    "docker pull my-app",
                    "docker commit my-app"
                ],
                "answer_index": 0,
                "explanation": "Lệnh 'docker build -t <tên:tag> <đường_dẫn>' thực hiện đọc Dockerfile, thực thi các bước hướng dẫn và đóng gói thành image hoàn chỉnh.",
                "difficulty": "easy",
                "language": "Docker"
            }
        ]
    }


def _classify_post_domain(post: Post) -> str:
    """Classify the post into technical domain based on weighted title, tags, category and content."""
    # Normalize multiple whitespace in title and content
    title_text = re.sub(r"\s+", " ", (post.title or "").lower().strip())
    tag_text = " ".join([t.name.lower() for t in post.tags]) if post.tags else ""
    cat_text = (post.category.name.lower() if post.category else "").strip()
    content_text = f"{post.excerpt or ''} {post.content or ''}".lower()

    domain_keywords = {
        "web_basic": [
            "lập trình web", "lập trình website", "website cơ bản", "web cơ bản",
            "html", "html5", "css", "css3", "javascript", "flexbox", "responsive web",
            "dom", "frontend cơ bản", "website"
        ],
        "fastapi": ["fastapi", "python", "pydantic", "sqlalchemy", "postgresql", "postgres", "microservices", "uvicorn", "asyncio", "api rest"],
        "devops": ["docker", "container", "devops", "ci/cd", "github actions", "kubernetes", "k8s", "dockerfile", "docker-compose"],
        "react": ["react", "react 19", "tailwind", "next.js", "nextjs", "jsx", "tsx", "virtual dom", "frontend framework", "useactionstate"]
    }

    scores = {d: 0 for d in domain_keywords}
    for dom, kws in domain_keywords.items():
        for kw in kws:
            if kw in title_text:
                scores[dom] += 15
            if kw in tag_text:
                scores[dom] += 8
            if kw in cat_text:
                scores[dom] += 4
            if kw in content_text:
                scores[dom] += 1

    best_domain = max(scores, key=scores.get)
    if scores[best_domain] > 0:
        return best_domain

    return "web_basic"


def generate_heuristic_questions_for_post(post: Post, count: int = 5) -> List[Dict[str, Any]]:
    """Produce domain-matched, randomized technical quiz questions tailored to the post."""
    bank = build_domain_fallback_bank()
    domain = _classify_post_domain(post)
    pool = bank.get(domain, bank["web_basic"])

    # If count requested is larger than pool, cycle or pull from other domains
    selected_raw = pool.copy()
    if len(selected_raw) < count:
        for other_dom, items in bank.items():
            if other_dom != domain:
                selected_raw.extend(items)
            if len(selected_raw) >= count:
                break

    chosen = selected_raw[:count]
    return [_shuffle_question_options(q) for q in chosen]


def generate_questions_with_gemini(post: Post, count: int = 5) -> Optional[List[Dict[str, Any]]]:
    """Attempt to generate questions matching the article via Gemini AI."""
    if not gemini_service.keys_pool:
        return None

    cat_name = post.category.name if post.category else "Công nghệ Thông tin"
    tag_str = ", ".join([t.name for t in post.tags]) if post.tags else ""
    content_snippet = (post.content or "").strip()[:4000]

    prompt = (
        f"Bạn là chuyên gia khảo thí và giáo dục CNTT. Dựa trên thông tin bài viết sau, hãy soạn đúng {count} "
        f"câu hỏi trắc nghiệm tiếng Việt chất lượng cao (4 lựa chọn A, B, C, D) kiểm tra trực tiếp kiến thức "
        f"của người học về nội dung bài viết.\n\n"
        f"THÔNG TIN BÀI VIẾT:\n"
        f"- Tiêu đề: {post.title}\n"
        f"- Chuyên mục: {cat_name}\n"
        f"- Thẻ tags: {tag_str}\n"
        f"- Tóm tắt: {post.excerpt or ''}\n"
        f"- Nội dung chính:\n{content_snippet}\n\n"
        f"YÊU CẦU ĐẦU RA:\n"
        f"Chỉ trả về JSON thuần (mảng gồm {count} đối tượng), không dùng code block markdown, mỗi đối tượng gồm:\n"
        f"[\n"
        f"  {{\n"
        f'    "question": "Nội dung câu hỏi rõ ràng, bám sát kiến thức bài viết",\n'
        f'    "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],\n'
        f'    "answer_index": 0,\n'
        f'    "explanation": "Giải thích chi tiết vì sao đáp án này chính xác dựa trên bài viết",\n'
        f'    "difficulty": "easy" | "medium" | "hard",\n'
        f'    "language": "{cat_name}"\n'
        f"  }}\n"
        f"]"
    )

    try:
        raw_res = gemini_service.call_gemini(
            prompt=prompt,
            system_instruction="Bạn là trợ lý khảo thí chuyên gia IT. Hãy trả về JSON hợp lệ theo đúng cấu trúc yêu cầu.",
            json_mode=True,
            temperature=0.3
        )
        if not raw_res:
            return None

        clean_text = raw_res.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()

        data = json.loads(clean_text)
        if isinstance(data, dict) and "questions" in data:
            data = data["questions"]

        if isinstance(data, list):
            valid_list = []
            for item in data:
                if (
                    isinstance(item, dict)
                    and item.get("question")
                    and isinstance(item.get("options"), list)
                    and len(item["options"]) >= 2
                ):
                    valid_list.append(_shuffle_question_options({
                        "question": str(item["question"]).strip(),
                        "options": [str(opt).strip() for opt in item["options"]],
                        "answer_index": int(item.get("answer_index", 0)),
                        "explanation": str(item.get("explanation", "")).strip(),
                        "difficulty": item.get("difficulty", "medium"),
                        "language": str(item.get("language", cat_name or "IT"))
                    }))
            if len(valid_list) >= 2:
                return valid_list[:count]
    except Exception as e:
        logger.warning(f"AI Quiz Generation for Post #{post.id} encountered error: {e}")

    return None


def ensure_post_quiz_questions(
    db: Session,
    post: Post,
    count: int = 5,
    user_id: Optional[int] = None
) -> List[QuizQuestion]:
    """
    Ensure the given post has relevant quiz questions matching its content.
    If no questions exist for this post in `quiz_question_posts`, generates and persists them.
    """
    # 1. Check existing questions
    existing = (
        db.query(QuizQuestion)
        .join(QuizQuestionPost, QuizQuestionPost.question_id == QuizQuestion.id)
        .filter(QuizQuestionPost.post_id == post.id)
        .all()
    )
    if len(existing) >= 3:
        return existing

    # 2. Generate questions matching post content
    generated_raw = generate_questions_with_gemini(post, count=count)
    source = "ai"
    if not generated_raw:
        generated_raw = generate_heuristic_questions_for_post(post, count=count)
        source = "heuristic"

    cat_name = post.category.name if post.category else "IT"

    # Map category name → canonical quiz language (matches TOPIC_ALIASES in quiz.py)
    CAT_TO_LANG = {
        "Backend": "FastAPI",
        "Frontend": "React",
        "DevOps": "DevOps",
        "Python": "Python",
        "Database": "PostgreSQL",
        "Security": "Security",
        "Architecture": "Architecture",
        "Fullstack": "Fullstack",
        "IT": "IT",
    }

    created_questions: List[QuizQuestion] = []
    for q_data in generated_raw:
        clean_opts = q_data.get("options", [])
        ans_idx = int(q_data.get("answer_index", 0))
        if ans_idx < 0 or ans_idx >= len(clean_opts):
            ans_idx = 0

        # Prefer language from AI response; fallback to mapped category
        raw_lang = q_data.get("language") or ""
        lang_val = raw_lang if raw_lang else CAT_TO_LANG.get(cat_name, cat_name or "IT")

        q_obj = QuizQuestion(
            course_id=None,
            language=lang_val,
            question=str(q_data.get("question", "")).strip(),
            options=clean_opts,
            answer_index=ans_idx,
            explanation=str(q_data.get("explanation", "")).strip(),
            difficulty=q_data.get("difficulty", "medium"),
            source=source,
            created_by=user_id or post.author_id
        )
        db.add(q_obj)
        db.flush()

        # Link with post
        link = QuizQuestionPost(question_id=q_obj.id, post_id=post.id)
        db.add(link)
        created_questions.append(q_obj)

    db.commit()
    for q in created_questions:
        db.refresh(q)

    logger.info(f"Generated and linked {len(created_questions)} quiz questions for post #{post.id} ('{post.title}').")
    return created_questions
