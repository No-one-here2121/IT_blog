"""
Script: fix_post7_quiz.py
Xóa 10 câu hỏi Fullstack không liên quan được link vào post 7,
rồi thêm 10 câu hỏi về Lập trình web cơ bản (HTML, CSS, JavaScript)
khớp với nội dung bài viết "Làm chủ Lập trình website cơ bản".
"""
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.quiz import QuizQuestion, QuizQuestionPost

POST_ID = 7

# 10 câu hỏi về Lập trình web cơ bản — HTML, CSS, JavaScript cơ bản
NEW_QUESTIONS = [
    {
        "language": "Frontend",
        "question": "Trong HTML5, thẻ nào được dùng để định nghĩa khu vực điều hướng chính (navigation) của trang web?",
        "options": ["<nav>", "<menu>", "<header>", "<aside>"],
        "answer_index": 0,
        "explanation": "<nav> là thẻ semantic HTML5 dành riêng cho khu vực điều hướng. Trình duyệt và screen reader nhận biết vai trò của nó, giúp cải thiện khả năng truy cập (accessibility) và SEO.",
        "difficulty": "easy",
    },
    {
        "language": "Frontend",
        "question": "Trong CSS, sự khác biệt chính giữa `display: block` và `display: inline` là gì?",
        "options": [
            "Block chiếm toàn bộ chiều rộng dòng và xuống hàng; Inline chỉ chiếm đúng phần nội dung và nằm cùng hàng với các phần tử khác",
            "Block thì ẩn đi; Inline thì hiện ra",
            "Block chỉ dùng cho văn bản; Inline chỉ dùng cho hình ảnh",
            "Block và Inline hoàn toàn giống nhau, chỉ khác tên gọi",
        ],
        "answer_index": 0,
        "explanation": "Phần tử block (div, p, h1...) chiếm toàn bộ chiều ngang của cha và bắt đầu dòng mới. Phần tử inline (span, a, strong...) chỉ rộng bằng nội dung và nằm cùng dòng với các phần tử xung quanh.",
        "difficulty": "easy",
    },
    {
        "language": "Frontend",
        "question": "Trong mô hình hộp CSS (Box Model), thuộc tính `box-sizing: border-box` ảnh hưởng đến cách tính kích thước phần tử như thế nào?",
        "options": [
            "Width và height bao gồm cả padding và border — dễ kiểm soát layout hơn",
            "Width và height chỉ tính phần content, không gồm padding hay border",
            "Box-sizing không liên quan đến kích thước phần tử",
            "Border-box loại bỏ hoàn toàn margin của phần tử",
        ],
        "answer_index": 0,
        "explanation": "Với border-box, khi bạn set width:200px, phần tử sẽ luôn rộng 200px kể cả padding và border. Ngược lại, content-box (mặc định) làm phần tử rộng hơn khi thêm padding/border.",
        "difficulty": "medium",
    },
    {
        "language": "Frontend",
        "question": "Trong JavaScript, sự khác biệt giữa `let`, `const` và `var` về phạm vi (scope) là gì?",
        "options": [
            "let và const có block scope ({}); var có function scope và bị hoisting lên đầu hàm",
            "Cả ba từ khóa đều hoàn toàn giống nhau về scope",
            "const không thể dùng trong vòng lặp for",
            "var chỉ được dùng bên trong class",
        ],
        "answer_index": 0,
        "explanation": "var bị hoisting và có function scope, có thể gây bug khó phát hiện. let/const có block scope — chỉ tồn tại trong cặp {} nơi chúng được khai báo. const thêm ràng buộc không thể gán lại giá trị.",
        "difficulty": "easy",
    },
    {
        "language": "Frontend",
        "question": "Flexbox CSS giải quyết vấn đề gì mà các kỹ thuật layout cũ (float, inline-block) gặp khó khăn?",
        "options": [
            "Căn chỉnh và phân phối khoảng cách giữa các phần tử theo một chiều (ngang hoặc dọc) một cách linh hoạt và dễ dàng",
            "Tạo animation cho phần tử",
            "Đặt màu nền gradient cho container",
            "Tự động thêm border cho phần tử con",
        ],
        "answer_index": 0,
        "explanation": "Flexbox giúp căn giữa phần tử, phân phối space, co giãn (flex-grow/shrink) và sắp xếp thứ tự phần tử con mà không cần hack float hay margin âm như trước đây.",
        "difficulty": "easy",
    },
    {
        "language": "Frontend",
        "question": "Trong JavaScript, `event.preventDefault()` được dùng để làm gì?",
        "options": [
            "Ngăn chặn hành vi mặc định của trình duyệt (ví dụ: ngăn form submit reload trang, ngăn link chuyển hướng)",
            "Xóa toàn bộ event listener khỏi trang",
            "Dừng vòng lặp for đang chạy",
            "Ngăn JavaScript load thêm tệp",
        ],
        "answer_index": 0,
        "explanation": "preventDefault() hủy hành vi mặc định của browser — ví dụ khi submit form sẽ không reload trang, khi click link sẽ không điều hướng. Thường dùng để xử lý logic bằng JS trước khi thực hiện hành động.",
        "difficulty": "medium",
    },
    {
        "language": "Frontend",
        "question": "Phương pháp thiết kế web `Responsive Design` sử dụng công cụ CSS nào để áp dụng style khác nhau cho màn hình kích thước khác nhau?",
        "options": [
            "CSS Media Queries (@media screen and (max-width: ...))",
            "Thuộc tính CSS screen-size",
            "JavaScript window.onresize duy nhất",
            "Thẻ HTML <responsive>",
        ],
        "answer_index": 0,
        "explanation": "Media Queries cho phép áp dụng CSS khác nhau tùy theo chiều rộng màn hình, orientation, hoặc loại thiết bị. Đây là nền tảng của Responsive Design giúp web hiển thị tốt trên mobile, tablet và desktop.",
        "difficulty": "easy",
    },
    {
        "language": "Frontend",
        "question": "Trong HTML5, thuộc tính `defer` trong thẻ `<script>` có tác dụng gì?",
        "options": [
            "Tải script song song với HTML parsing nhưng chỉ thực thi SAU khi HTML được parse xong hoàn toàn",
            "Tải script trước, dừng parse HTML lại để chờ",
            "Không tải script — chỉ đánh dấu để bỏ qua",
            "Buộc script chạy trong Web Worker riêng biệt",
        ],
        "answer_index": 0,
        "explanation": "Script thường dùng async và defer để tối ưu tốc độ tải trang. defer đảm bảo DOM sẵn sàng trước khi script chạy — lý tưởng cho script cần thao tác DOM. async chạy ngay khi tải xong bất kể DOM.",
        "difficulty": "medium",
    },
    {
        "language": "Frontend",
        "question": "Vòng lặp `for...of` trong JavaScript khác gì so với `for...in`?",
        "options": [
            "for...of duyệt qua các GIÁ TRỊ của iterable (Array, String, Map...); for...in duyệt qua các KHÓA (key/index) của object",
            "for...of chỉ dùng được với object; for...in chỉ dùng với Array",
            "Cả hai hoàn toàn giống nhau, chỉ khác cú pháp",
            "for...in nhanh hơn for...of trong mọi trường hợp",
        ],
        "answer_index": 0,
        "explanation": "for...of lấy từng phần tử trong mảng/chuỗi/Set/Map. for...in lấy key của object (index dạng string với array). Thường dùng for...of cho array, for...in cho object enumeration — tránh dùng for...in với array vì có thể lấy cả inherited properties.",
        "difficulty": "medium",
    },
    {
        "language": "Frontend",
        "question": "Trong CSS, `position: absolute` định vị phần tử dựa theo phần tử cha nào?",
        "options": [
            "Phần tử tổ tiên gần nhất có `position` khác `static` (relative/absolute/fixed/sticky)",
            "Luôn luôn là thẻ <body>",
            "Luôn luôn là phần tử cha trực tiếp dù position là gì",
            "Phần tử absolute luôn định vị theo viewport (cửa sổ trình duyệt)",
        ],
        "answer_index": 0,
        "explanation": "Absolute element thoát khỏi luồng thông thường và định vị theo containing block — là cha gần nhất có position != static. Nếu không có cha nào, nó định vị theo <html>. Đây là lý do hay dùng position: relative trên cha để kiểm soát.",
        "difficulty": "medium",
    },
]

def main():
    db = SessionLocal()
    try:
        # 1. Xóa links cũ và câu hỏi sai của post 7
        old_links = db.query(QuizQuestionPost).filter(QuizQuestionPost.post_id == POST_ID).all()
        old_qids = [l.question_id for l in old_links]
        print(f"Xóa {len(old_links)} link cũ cho post {POST_ID}: {old_qids}")

        for link in old_links:
            db.delete(link)
        db.flush()

        # Chỉ xóa câu hỏi nếu không được dùng bởi post khác
        for qid in old_qids:
            other = db.query(QuizQuestionPost).filter(QuizQuestionPost.question_id == qid).first()
            if not other:
                q = db.query(QuizQuestion).filter(QuizQuestion.id == qid).first()
                if q:
                    db.delete(q)
                    print(f"  Đã xóa câu hỏi #{qid}")

        db.flush()

        # 2. Thêm câu hỏi mới phù hợp nội dung bài
        print(f"\nThêm {len(NEW_QUESTIONS)} câu hỏi về Lập trình web cơ bản...")
        for qdata in NEW_QUESTIONS:
            q = QuizQuestion(
                course_id=None,
                language=qdata["language"],
                question=qdata["question"],
                options=qdata["options"],
                answer_index=qdata["answer_index"],
                explanation=qdata["explanation"],
                difficulty=qdata["difficulty"],
                source="manual",
                created_by=None,
            )
            db.add(q)
            db.flush()

            link = QuizQuestionPost(question_id=q.id, post_id=POST_ID)
            db.add(link)
            print(f"  + Q#{q.id} [{q.language}] {q.question[:70]}...")

        db.commit()
        print(f"\n✅ Hoàn thành! Post {POST_ID} giờ có {len(NEW_QUESTIONS)} câu hỏi về Lập trình web cơ bản.")

    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi: {e}")
        import traceback; traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
