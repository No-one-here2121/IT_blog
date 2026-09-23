import { api } from "../services/api";
import { useState } from "react";
import { useBlog } from "../context/BlogContext";
import { addStoredBugReport } from "../utils/bugReportsStore";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function Foot({ onNavigate }) {
  const { setSelectedCategory } = useBlog();
  const { addToast } = useToast();
  const { currentUser } = useAuth();

  // Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState("bug");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState(currentUser?.email || "");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleCategoryClick = (catName) => (e) => {
    e.preventDefault();
    if (setSelectedCategory) setSelectedCategory(catName);
    if (onNavigate) onNavigate("home");
    setTimeout(() => {
      const el = document.getElementById("posts-container");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  const handleOpenFeedback = (e) => {
    e.preventDefault();
    setShowFeedbackModal(true);
  };

  const handlePolicyNavigate = (sectionKey) => (e) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate("policy", { section: sectionKey });
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackSubject.trim() || !feedbackContent.trim()) {
      addToast("Vui lòng nhập đầy đủ tiêu đề và nội dung phản hồi!", "warning");
      return;
    }
    if (!feedbackEmail.trim()) {
      addToast("Vui lòng cung cấp email liên hệ!", "warning");
      return;
    }

    setIsSubmittingFeedback(true);
    const newBug = {
      category: feedbackType,
      title: feedbackSubject.trim(),
      description: feedbackContent.trim(),
      reporter_name: currentUser?.name || "Khách",
      reporter_email: feedbackEmail.trim(),
      priority: "medium"
    };

    try {
      await api.bugReports.create(newBug);
    } catch {
      // Graceful offline fallback
    }

    addStoredBugReport(newBug);

    setIsSubmittingFeedback(false);
    setShowFeedbackModal(false);
    setFeedbackSubject("");
    setFeedbackContent("");
    addToast("Cảm ơn bạn! Báo lỗi đã được tiếp nhận và đưa vào Hệ thống theo dõi sự cố 🚀", "success");
  };

  return (
    <>
      <footer className="bg-base-200 border-t border-base-300 text-base-content mt-auto">
        {/* Khung nội dung chính của Footer */}
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-12">
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
                  <button
                    type="button"
                    onClick={handleCategoryClick("Frontend")}
                    className="hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    Frontend & UI/UX
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleCategoryClick("Backend")}
                    className="hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    Backend & API (Go/FastAPI)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleCategoryClick("AI & Machine Learning")}
                    className="hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    Trí tuệ nhân tạo (AI & LLMs)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleCategoryClick("DevOps & Cloud")}
                    className="hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    DevOps, Docker & CI/CD
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleCategoryClick("Cơ sở dữ liệu")}
                    className="hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    Cơ sở dữ liệu & System Design
                  </button>
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
                  <a href="mailto:support@itblog.local" className="hover:text-primary transition-colors cursor-pointer">
                    support@itblog.local
                  </a>
                </li>
                <li className="flex items-center gap-1.5">
                  <span>📞</span>
                  <a href="tel:02838354409" className="hover:text-primary transition-colors cursor-pointer">
                    (028) 3835 4409
                  </a>
                </li>
                <li className="flex items-center gap-1.5">
                  <span>🕒</span>
                  <span>T2 - T7: 8:00 - 17:30</span>
                </li>
                <li className="pt-1">
                  <button
                    type="button"
                    onClick={handleOpenFeedback}
                    className="btn btn-xs btn-outline border-base-300 hover:bg-base-300 text-base-content rounded-lg font-semibold gap-1 cursor-pointer"
                  >
                    Gửi phản hồi / Báo lỗi
                  </button>
                </li>
              </ul>
            </div>

            {/* Cột 4: Chính sách & Quy định */}
            <div>
              <h4 className="text-xs font-bold text-base-content uppercase tracking-wider mb-3">
                Chính sách & Quy định
              </h4>
              <ul className="space-y-2 text-xs text-base-content/70">
                <li>
                  <button
                    type="button"
                    onClick={handlePolicyNavigate("terms")}
                    className="hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    Điều khoản sử dụng
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handlePolicyNavigate("privacy")}
                    className="hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    Chính sách bảo mật
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handlePolicyNavigate("guidelines")}
                    className="hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    Quy chuẩn đăng bài
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handlePolicyNavigate("license")}
                    className="hover:text-primary transition-colors text-left cursor-pointer"
                  >
                    Bản quyền & Giấy phép mã nguồn
                  </button>
                </li>
                <li className="pt-2 border-t border-base-300 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePolicyNavigate("rss")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 hover:underline cursor-pointer"
                    title="Nguồn cấp tin tức chuẩn XML RSS 2.0"
                  >
                    <span>📰 RSS Feed</span>
                  </button>
                  <span className="text-base-content/30">•</span>
                  <button
                    type="button"
                    onClick={handlePolicyNavigate("sitemap")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                    title="Sơ đồ định tuyến website toàn diện"
                  >
                    <span>🗺️ Sitemap</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dải bản quyền & Mạng xã hội phía dưới */}
        <div className="border-t border-base-300 bg-base-300/40">
          <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-base-content/60">
            <p className="text-center sm:text-left break-words">
              © {new Date().getFullYear()} IT Blog. Bài tập nhóm Chuyên đề Công nghệ Phần mềm. All rights reserved.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
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

      {/* Modal Form Gửi Phản Hồi / Báo Lỗi Trực Tiếp */}
      {showFeedbackModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowFeedbackModal(false)}
        >
          <div
            className="bg-base-100 rounded-3xl border border-base-300 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-base-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">📨</span>
                <h3 className="font-bold text-base text-base-content">
                  Gửi Phản Hồi / Báo Lỗi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitFeedback} className="space-y-3.5 text-xs">
              <div>
                <label className="label text-xs font-bold text-base-content pb-1">Phân loại:</label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="select select-sm select-bordered w-full rounded-xl text-xs font-semibold"
                >
                  <option value="bug">🐛 Báo lỗi chức năng (Bug Report)</option>
                  <option value="feature">💡 Góp ý tính năng mới (Feature Request)</option>
                  <option value="content">⚠️ Khiếu nại nội dung bài viết vi phạm</option>
                  <option value="other">💬 Ý kiến đóng góp khác</option>
                </select>
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content pb-1">
                  Email liên hệ <span className="text-error">*</span>:
                </label>
                <input
                  type="email"
                  required
                  placeholder="your.email@domain.com"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  className="input input-sm input-bordered w-full rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content pb-1">
                  Tiêu đề phản hồi <span className="text-error">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Mô tả ngắn gọn sự cố hoặc đề xuất..."
                  value={feedbackSubject}
                  onChange={(e) => setFeedbackSubject(e.target.value)}
                  className="input input-sm input-bordered w-full rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="label text-xs font-bold text-base-content pb-1">
                  Chi tiết nội dung <span className="text-error">*</span>:
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Mô tả cụ thể vấn đề bạn gặp phải để đội ngũ hỗ trợ có thể xử lý sớm nhất..."
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  className="textarea textarea-bordered w-full rounded-2xl text-xs leading-relaxed"
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    setShowFeedbackModal(false);
                    handlePolicyNavigate("feedback")(e);
                  }}
                  className="text-xs text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>📋</span> Xem danh sách & tiến độ lỗi đã tiếp nhận ↗
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="btn btn-sm btn-ghost text-xs font-bold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    className="btn btn-sm btn-primary text-white font-bold text-xs gap-1.5 rounded-xl shadow-xs"
                  >
                    {isSubmittingFeedback ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <span>Gửi phản hồi</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
