export default function Foot() {
  return (
    <footer className="bg-base-200 border-t border-base-300 text-base-content mt-auto">
      {/* Khung nội dung chính của Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Cột 1: Về IT Blog (Chiếm 2 cột trên màn lớn) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                IT
              </span>
              <span className="text-xl font-black text-base-content tracking-tight">
                IT Blog
              </span>
            </div>
            <p className="text-xs sm:text-sm text-base-content/70 leading-relaxed max-w-sm">
              Nền tảng chia sẻ tri thức công nghệ thông tin, đồ án chuyên đề Công nghệ Phần mềm
              và hướng dẫn thực chiến dành cho sinh viên và kỹ sư phần mềm.
            </p>
            <div className="text-xs text-base-content/60 space-y-1">
              <p>📍 Khoa Công nghệ Thông tin - Trường Đại học</p>
              <p>🎓 Đồ án môn học: Chuyên đề Công nghệ Phần mềm</p>
            </div>
          </div>

          {/* Cột 2: Danh mục bài viết */}
          <div>
            <h4 className="text-xs font-bold text-base-content uppercase tracking-wider mb-3">
              Danh mục bài viết
            </h4>
            <ul className="space-y-2 text-xs text-base-content/70">
              <li>
                <a href="#posts-container" className="hover:text-primary transition-colors">
                  Frontend & UI/UX
                </a>
              </li>
              <li>
                <a href="#posts-container" className="hover:text-primary transition-colors">
                  Backend & API (Go/FastAPI)
                </a>
              </li>
              <li>
                <a href="#posts-container" className="hover:text-primary transition-colors">
                  Trí tuệ nhân tạo (AI & LLMs)
                </a>
              </li>
              <li>
                <a href="#posts-container" className="hover:text-primary transition-colors">
                  DevOps, Docker & CI/CD
                </a>
              </li>
              <li>
                <a href="#posts-container" className="hover:text-primary transition-colors">
                  Cơ sở dữ liệu & System Design
                </a>
              </li>
            </ul>
          </div>

          {/* Cột 3: Liên hệ & Hỗ trợ */}
          <div>
            <h4 className="text-xs font-bold text-base-content uppercase tracking-wider mb-3">
              Liên hệ & Hỗ trợ
            </h4>
            <ul className="space-y-2 text-xs text-base-content/70">
              <li className="flex items-center gap-1.5">
                <span>📧</span>
                <span>support@itblog.local</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span>📞</span>
                <span>(028) 3835 4409</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span>🕒</span>
                <span>T2 - T7: 8:00 - 17:30</span>
              </li>
              <li className="pt-1">
                <a href="#posts-container" className="hover:text-primary transition-colors">
                  Gửi phản hồi / Báo lỗi
                </a>
              </li>
            </ul>
          </div>

          {/* Cột 4: Điều khoản & Chính sách */}
          <div>
            <h4 className="text-xs font-bold text-base-content uppercase tracking-wider mb-3">
              Chính sách & Quy định
            </h4>
            <ul className="space-y-2 text-xs text-base-content/70">
              <li>
                <a href="#posts-container" className="hover:text-primary transition-colors">
                  Điều khoản sử dụng
                </a>
              </li>
              <li>
                <a href="#posts-container" className="hover:text-primary transition-colors">
                  Chính sách bảo mật
                </a>
              </li>
              <li>
                <a href="#posts-container" className="hover:text-primary transition-colors">
                  Quy chuẩn đăng bài
                </a>
              </li>
              <li>
                <a href="#posts-container" className="hover:text-primary transition-colors">
                  Bản quyền & Giấy phép mã nguồn
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Dải bản quyền & Mạng xã hội phía dưới */}
      <div className="border-t border-base-300 bg-base-300/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-base-content/60">
          <p>
            © {new Date().getFullYear()} IT Blog. Bài tập nhóm Chuyên đề Công nghệ Phần mềm. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z" />
              </svg>
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
              </svg>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Twitter"
              className="hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
              </svg>
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}