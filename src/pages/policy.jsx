import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useBlog } from "../context/BlogContext";
import { getStoredBugReports, addStoredBugReport } from "../utils/bugReportsStore";

// const FEEDBACK_STORAGE_KEY = "itblog_user_feedback_history";

export default function PolicyPage({ onNavigate, initialSection = "terms" }) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { setSelectedCategory } = useBlog();

  const [feedbackType, setFeedbackType] = useState("bug");
  const [feedbackPriority, setFeedbackPriority] = useState("medium");
  const [feedbackName, setFeedbackName] = useState(currentUser?.name || "");
  const [feedbackEmail, setFeedbackEmail] = useState(currentUser?.email || "");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubTab, setFeedbackSubTab] = useState("tracker");
  const [bugFilterStatus, setBugFilterStatus] = useState("all");
  const [bugFilterCategory, setBugFilterCategory] = useState("all");
  const [bugSearch, setBugSearch] = useState("");

  const [bugTrackerList, setBugTrackerList] = useState(() => getStoredBugReports());

  useEffect(() => {
    api.bugReports.list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBugTrackerList(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackSubject.trim() || !feedbackContent.trim()) {
      addToast("Vui lòng nhập đầy đủ tiêu đề và nội dung phản hồi!", "warning");
      return;
    }
    if (!feedbackEmail.trim()) {
      addToast("Vui lòng cung cấp email liên hệ để Ban Quản trị phản hồi!", "warning");
      return;
    }

    setFeedbackSubmitting(true);
    const newBug = {
      category: feedbackType,
      priority: feedbackPriority,
      title: feedbackSubject.trim(),
      description: feedbackContent.trim(),
      reporter_name: feedbackName || currentUser?.name || "Thành viên",
      reporter_email: feedbackEmail.trim()
    };

    try {
      await api.bugReports.create(newBug);
    } catch {
      // offline fallback
    }

    const updated = addStoredBugReport(newBug);
    setBugTrackerList(updated);
    setFeedbackSubject("");
    setFeedbackContent("");
    setFeedbackSubmitting(false);
    setFeedbackSubTab("tracker");
    addToast("Báo lỗi của bạn đã được tiếp nhận thành công và đưa vào Bảng theo dõi sự cố! 🚀", "success");
  };

  const copyRssUrl = () => {
    const rssUrl = `${window.location.origin}/api/v1/feeds/rss`;
    navigator.clipboard.writeText(rssUrl).then(() => {
      addToast("Đã sao chép đường dẫn RSS Feed vào Clipboard! 📋", "success");
    }).catch(() => {
      addToast(`Đường dẫn RSS: ${rssUrl}`, "info");
    });
  };

  const navigateToCategory = (catName) => {
    if (setSelectedCategory) setSelectedCategory(catName);
    if (onNavigate) onNavigate("home");
    setTimeout(() => {
      const el = document.getElementById("posts-container");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 animate-fade-in">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-base-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-base-content/60 mb-1.5">
            <button
              onClick={() => onNavigate && onNavigate("home")}
              className="hover:text-primary transition-colors flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>←</span> Về trang chủ
            </button>
            <span>•</span>
            <span className="text-primary font-bold uppercase tracking-wider">
              Trung tâm pháp lý & Hỗ trợ
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-base-content tracking-tight">
            Chính Sách, Quy Định & Hỗ Trợ Kỹ Thuật
          </h1>
          <p className="text-xs sm:text-sm text-base-content/70 mt-1">
            Minh bạch về quyền lợi, nghĩa vụ thành viên, quy chuẩn biên tập và kênh hỗ trợ chính thức của cộng đồng IT Blog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="btn btn-sm btn-outline border-base-300 hover:bg-base-200 text-xs font-bold gap-1.5 shadow-2xs cursor-pointer"
            title="In hoặc lưu trang dưới định dạng PDF"
          >
            <span>🖨️</span> In trang
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("feedback")}
            className="btn btn-sm btn-primary text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
          >
            <span>📨</span> Gửi phản hồi
          </button>
        </div>
      </div>

      {/* Navigation Pills Bar */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-base-200/90 backdrop-blur-xs rounded-2xl mb-8 border border-base-300 shadow-2xs w-full">
        <button
          type="button"
          onClick={() => setActiveSection("terms")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeSection === "terms"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60"
          }`}
        >
          <span>📜</span>
          <span>Điều khoản sử dụng</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("privacy")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeSection === "privacy"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60"
          }`}
        >
          <span>🔒</span>
          <span>Chính sách bảo mật</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("guidelines")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeSection === "guidelines"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60"
          }`}
        >
          <span>✍️</span>
          <span>Quy chuẩn đăng bài</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("license")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeSection === "license"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60"
          }`}
        >
          <span>⚖️</span>
          <span>Bản quyền & Giấy phép</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("feedback")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeSection === "feedback"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60"
          }`}
        >
          <span>📨</span>
          <span>Gửi phản hồi / Báo lỗi</span>
          {bugTrackerList.length > 0 && (
            <span className="badge badge-xs badge-info text-white font-bold ml-0.5">
              {bugTrackerList.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("sitemap")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeSection === "sitemap"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60"
          }`}
        >
          <span>🗺️</span>
          <span>Sơ đồ trang (Sitemap)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("rss")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeSection === "rss"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60"
          }`}
        >
          <span>📰</span>
          <span>RSS Feeds</span>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {/* SECTION 1: ĐIỀU KHOẢN SỬ DỤNG */}
          {activeSection === "terms" && (
            <div className="p-6 sm:p-10 bg-base-100 rounded-3xl border border-base-300 shadow-sm space-y-6 text-sm text-base-content/80 leading-relaxed animate-fade-in">
              <div className="border-b border-base-200 pb-4">
                <span className="badge badge-primary text-white font-bold text-xs mb-2">Quy định cộng đồng</span>
                <h2 className="text-xl sm:text-2xl font-black text-base-content">
                  Điều Khoản Sử Dụng Nền Tảng IT Blog
                </h2>
                <p className="text-xs text-base-content/60 mt-1">
                  Cập nhật: 2026 • Ban Quản trị Cộng đồng IT Blog
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold text-base-content flex items-center gap-2">
                  <span className="text-primary font-mono font-black">1.</span>
                  Mục đích & Phạm vi Hoạt động
                </h3>
                <p>
                  IT Blog là nền tảng chia sẻ tri thức chuyên môn công nghệ thông tin, kiến trúc phần mềm, DevOps, AI, và kỹ thuật lập trình mã nguồn mở. Tất cả thành viên tham gia cộng đồng đều có nghĩa vụ xây dựng một môi trường văn minh, tôn trọng bản quyền và tinh thần chia sẻ học thuật.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold text-base-content flex items-center gap-2">
                  <span className="text-primary font-mono font-black">2.</span>
                  Quyền và Nghĩa vụ của Thành viên
                </h3>
                <ul className="list-disc list-inside space-y-2 pl-2">
                  <li>Thành viên được quyền đọc, tương tác, bình luận, chia sẻ và đánh giá bài viết kỹ thuật.</li>
                  <li>Thành viên có quyền đăng tải bài viết sau khi hoàn thiện hồ sơ và tuân thủ Quy chuẩn đăng bài.</li>
                  <li>Nghiêm cấm chia sẻ thông tin đăng nhập, thực hiện tấn công mạng hoặc khai thác lỗ hổng kỹ thuật.</li>
                  <li>Thành viên tự chịu trách nhiệm về nội dung bài viết và phản hồi do chính mình đăng tải.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold text-base-content flex items-center gap-2">
                  <span className="text-primary font-mono font-black">3.</span>
                  Bảo mật Tài khoản & Quyền Quản trị
                </h3>
                <p>
                  Người dùng có trách nhiệm bảo vệ mật khẩu của mình. Quản trị viên (Admin) và Kiểm duyệt viên (Moderator) có toàn quyền xem xét, chỉnh sửa, ghim, từ chối hoặc xóa các bài viết/bình luận vi phạm tiêu chuẩn cộng đồng.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 2: CHÍNH SÁCH BẢO MẬT */}
          {activeSection === "privacy" && (
            <div className="p-6 sm:p-10 bg-base-100 rounded-3xl border border-base-300 shadow-sm space-y-6 text-sm text-base-content/80 leading-relaxed animate-fade-in">
              <div className="border-b border-base-200 pb-4">
                <span className="badge badge-success text-white font-bold text-xs mb-2">Quyền riêng tư & Bảo vệ Dữ liệu</span>
                <h2 className="text-xl sm:text-2xl font-black text-base-content">
                  Chính Sách Bảo Mật Quyền Riêng Tư
                </h2>
                <p className="text-xs text-base-content/60 mt-1">
                  Tuân thủ các tiêu chuẩn bảo mật dữ liệu hiện đại và quyền riêng tư người dùng
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold text-base-content flex items-center gap-2">
                  <span className="text-success font-mono font-black">1.</span>
                  Dữ liệu Thu thập & Mục đích Sử dụng
                </h3>
                <p>
                  Chúng tôi chỉ thu thập các thông tin tối thiểu cần thiết để vận hành dịch vụ: địa chỉ email, tên hiển thị (username), ảnh đại diện (avatar) và lịch sử tương tác kỹ thuật. Dữ liệu này được dùng độc quyền để cá nhân hóa bảng tin bài viết, gửi thông báo và duy trì cấp bậc danh tiếng.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold text-base-content flex items-center gap-2">
                  <span className="text-success font-mono font-black">2.</span>
                  Lưu trữ Cookies & Phiên làm việc
                </h3>
                <p>
                  IT Blog sử dụng LocalStorage và Cookies an toàn để ghi nhớ phiên đăng nhập và tùy chọn giao diện. Chúng tôi cam kết 100% không bán hoặc chia sẻ thông tin cá nhân của người dùng cho bên thứ ba.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: QUY CHUẨN ĐĂNG BÀI */}
          {activeSection === "guidelines" && (
            <div className="p-6 sm:p-10 bg-base-100 rounded-3xl border border-base-300 shadow-sm space-y-6 text-sm text-base-content/80 leading-relaxed animate-fade-in">
              <div className="border-b border-base-200 pb-4">
                <span className="badge badge-warning text-amber-950 font-black text-xs mb-2">Tiêu chuẩn Biên tập Chuyên gia</span>
                <h2 className="text-xl sm:text-2xl font-black text-base-content">
                  Quy Chuẩn Đăng Bài & Định Dạng Kỹ Thuật
                </h2>
                <p className="text-xs text-base-content/60 mt-1">
                  Đảm bảo chất lượng học thuật và khả năng tiếp thu cao nhất cho độc giả kỹ sư IT
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold text-base-content flex items-center gap-2">
                  <span className="text-warning font-mono font-black">1.</span>
                  Cấu trúc Bài viết Tiêu chuẩn
                </h3>
                <div className="p-4 rounded-2xl bg-base-200/70 border border-base-300 space-y-2">
                  <p className="font-bold text-base-content">Một bài viết đạt chuẩn trên IT Blog cần có:</p>
                  <p>• <strong>Tiêu đề rõ ràng:</strong> Nêu bật vấn đề kỹ thuật (VD: "Tối ưu hóa Truy vấn PostgreSQL").</p>
                  <p>• <strong>Đoạn tóm tắt (Excerpt):</strong> 2-3 câu giới thiệu bối cảnh và kết quả đạt được.</p>
                  <p>• <strong>Nội dung chuyên sâu:</strong> Phân tích nguyên lý, kiến trúc hệ thống và giải pháp chi tiết.</p>
                  <p>• <strong>Code Block chuẩn:</strong> Code mẫu đầy đủ cú pháp, có thể chạy thử nghiệm được.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold text-base-content flex items-center gap-2">
                  <span className="text-warning font-mono font-black">2.</span>
                  Nghiêm cấm Đạo văn & Spam
                </h3>
                <p>
                  Mọi bài viết sao chép nguyên văn không dẫn nguồn, nội dung rác do bot tạo, hoặc bài viết thuần túy quảng cáo sẽ bị từ chối ngay trong khâu kiểm duyệt.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 4: BẢN QUYỀN & GIẤY PHÉP */}
          {activeSection === "license" && (
            <div className="p-6 sm:p-10 bg-base-100 rounded-3xl border border-base-300 shadow-sm space-y-6 text-sm text-base-content/80 leading-relaxed animate-fade-in">
              <div className="border-b border-base-200 pb-4">
                <span className="badge badge-info text-white font-bold text-xs mb-2">Open Source & Creative Commons</span>
                <h2 className="text-xl sm:text-2xl font-black text-base-content">
                  Bản Quyền & Giấy Phép Mã Nguồn
                </h2>
                <p className="text-xs text-base-content/60 mt-1">
                  Quy định sử dụng tài sản trí tuệ và mã nguồn mở trên nền tảng
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-base-200/80 border border-base-300 space-y-2 font-mono text-xs">
                <p className="font-bold text-base-content">MIT License</p>
                <p className="text-base-content/70">Copyright (c) 2026 IT Blog Platform Contributors.</p>
                <p className="text-base-content/70">
                  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files...
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-base-content">Bản quyền Bài viết (CC BY-NC-SA 4.0)</h3>
                <p>
                  Nội dung bài viết được chia sẻ theo giấy phép Creative Commons phi thương mại. Bạn được phép chia sẻ và chỉnh sửa khi có trích dẫn nguồn rõ ràng.
                </p>
              </div>
            </div>
          )}
          {/* SECTION 5: GỬI PHẢN HỒI / BÁO LỖI & THEO DÕI SỰ CỐ */}
          {activeSection === "feedback" && (
            <div className="p-6 sm:p-10 bg-base-100 rounded-3xl border border-base-300 shadow-sm space-y-6 text-sm leading-relaxed animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-200 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-error text-white font-bold text-xs">Tiếp nhận & Xử lý</span>
                    <span className="badge badge-outline text-xs font-semibold">{bugTrackerList.length} sự cố ghi nhận</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-base-content">
                    Trung Tâm Báo Lỗi & Bảng Theo Dõi Sự Cố (Issue Tracker)
                  </h2>
                  <p className="text-xs text-base-content/60 mt-1">
                    Theo dõi danh sách các lỗi kỹ thuật đã được người dùng báo cáo và tiến độ khắc phục của đội ngũ kỹ thuật.
                  </p>
                </div>

                <div className="join self-start sm:self-auto shrink-0 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setFeedbackSubTab("tracker")}
                    className={`btn btn-sm join-item text-xs font-bold gap-1.5 cursor-pointer ${
                      feedbackSubTab === "tracker" ? "btn-primary text-white" : "btn-outline border-base-300"
                    }`}
                  >
                    <span>📋</span> Danh sách lỗi ({bugTrackerList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackSubTab("form")}
                    className={`btn btn-sm join-item text-xs font-bold gap-1.5 cursor-pointer ${
                      feedbackSubTab === "form" ? "btn-primary text-white" : "btn-outline border-base-300"
                    }`}
                  >
                    <span>➕</span> Gửi báo lỗi mới
                  </button>
                </div>
              </div>

              {/* View 1: Tracker (Danh sách các lỗi được báo cáo) */}
              {feedbackSubTab === "tracker" && (
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="p-4 rounded-2xl bg-base-200/60 border border-base-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <input
                        type="text"
                        placeholder="Tìm kiếm lỗi hoặc đề xuất đã báo cáo..."
                        value={bugSearch}
                        onChange={(e) => setBugSearch(e.target.value)}
                        className="input input-sm input-bordered w-full rounded-xl text-xs pl-8 font-medium"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-base-content/50">🔍</span>
                      {bugSearch && (
                        <button
                          type="button"
                          onClick={() => setBugSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-base-content/50 hover:text-base-content"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={bugFilterCategory}
                        onChange={(e) => setBugFilterCategory(e.target.value)}
                        className="select select-sm select-bordered rounded-xl text-xs font-semibold"
                      >
                        <option value="all">Mọi phân loại</option>
                        <option value="bug">🐛 Lỗi tính năng</option>
                        <option value="feature">💡 Góp ý tính năng</option>
                        <option value="content">⚠️ Vi phạm nội dung</option>
                        <option value="other">💬 Ý kiến khác</option>
                      </select>

                      <div className="join">
                        {[
                          { key: "all", label: "Tất cả" },
                          { key: "pending", label: "Chờ xử lý" },
                          { key: "in_progress", label: "Đang sửa" },
                          { key: "resolved", label: "Đã xong" }
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setBugFilterStatus(tab.key)}
                            className={`btn btn-xs join-item ${
                              bugFilterStatus === tab.key ? "btn-primary text-white font-bold" : "btn-ghost"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* List of Reported Bugs */}
                  {(() => {
                    const filtered = bugTrackerList.filter((item) => {
                      const matchStatus =
                        bugFilterStatus === "all" ||
                        item.status === bugFilterStatus ||
                        (bugFilterStatus === "pending" && (item.status === "received" || !item.status));
                      const matchCategory =
                        bugFilterCategory === "all" || (item.category || item.type) === bugFilterCategory;
                      const term = bugSearch.trim().toLowerCase();
                      const matchSearch =
                        !term ||
                        (item.title || item.subject || "").toLowerCase().includes(term) ||
                        (item.description || item.content || "").toLowerCase().includes(term) ||
                        (item.reporter_name || item.name || "").toLowerCase().includes(term);
                      return matchStatus && matchCategory && matchSearch;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-12 bg-base-200/40 rounded-2xl border border-dashed border-base-300 p-6 space-y-2">
                          <span className="text-3xl">🎉</span>
                          <h4 className="font-bold text-sm text-base-content">Không tìm thấy báo cáo nào</h4>
                          <p className="text-xs text-base-content/60">
                            Không có báo cáo lỗi nào phù hợp với bộ lọc hiện tại.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setBugFilterStatus("all");
                              setBugFilterCategory("all");
                              setBugSearch("");
                            }}
                            className="btn btn-xs btn-outline rounded-lg mt-2 font-bold"
                          >
                            Xóa bộ lọc
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {filtered.map((item) => {
                          const isBug = (item.category || item.type) === "bug";
                          const isFeature = (item.category || item.type) === "feature";
                          const isResolved = item.status === "resolved";
                          const isInProgress = item.status === "in_progress";
                          const isPending = !item.status || item.status === "pending" || item.status === "received";

                          return (
                            <div
                              key={item.id}
                              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                                isResolved
                                  ? "bg-base-100 border-success/30 shadow-2xs"
                                  : isInProgress
                                  ? "bg-base-100 border-primary/30 shadow-xs"
                                  : "bg-base-100 border-base-300 shadow-2xs"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-base-200">
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Status Badge */}
                                  <span
                                    className={`badge badge-sm font-black text-xs ${
                                      isResolved
                                        ? "badge-success text-white"
                                        : isInProgress
                                        ? "badge-info text-white"
                                        : isPending
                                        ? "badge-warning text-amber-950"
                                        : "badge-ghost"
                                    }`}
                                  >
                                    {isResolved
                                      ? "🟢 Đã khắc phục"
                                      : isInProgress
                                      ? "🔵 Đang xử lý"
                                      : isPending
                                      ? "🟡 Chờ tiếp nhận"
                                      : "⚪ Đã đóng"}
                                  </span>

                                  {/* Type Badge */}
                                  <span className="badge badge-sm badge-outline font-semibold">
                                    {isBug
                                      ? "🐛 Lỗi chức năng"
                                      : isFeature
                                      ? "💡 Góp ý tính năng"
                                      : (item.category || item.type) === "content"
                                      ? "⚠️ Vi phạm"
                                      : "💬 Ý kiến khác"}
                                  </span>

                                  {/* Priority Badge */}
                                  {item.priority && (
                                    <span
                                      className={`badge badge-xs font-bold uppercase ${
                                        item.priority === "critical"
                                          ? "badge-error text-white"
                                          : item.priority === "high"
                                          ? "badge-warning text-amber-950"
                                          : "badge-ghost"
                                      }`}
                                    >
                                      {item.priority === "critical"
                                        ? "🚨 Khẩn cấp"
                                        : item.priority === "high"
                                        ? "🔴 Cao"
                                        : item.priority === "medium"
                                        ? "🟡 Vừa"
                                        : "🟢 Thấp"}
                                    </span>
                                  )}

                                  <span className="text-[11px] font-mono text-base-content/40">#{item.id}</span>
                                </div>

                                <div className="text-[11px] text-base-content/50">
                                  {item.created_at && !isNaN(new Date(item.created_at).getTime())
                                    ? new Date(item.created_at).toLocaleString("vi-VN")
                                    : "Gần đây"}
                                </div>
                              </div>

                              {/* Title and Description */}
                              <div className="pt-3 space-y-1.5">
                                <h3 className="font-extrabold text-sm sm:text-base text-base-content">
                                  {item.title || item.subject}
                                </h3>
                                <p className="text-xs text-base-content/80 whitespace-pre-wrap leading-relaxed">
                                  {item.description || item.content}
                                </p>
                              </div>

                              {/* Reporter Info */}
                              <div className="pt-2 text-[11px] text-base-content/50 flex items-center gap-3">
                                <span>
                                  Người báo cáo: <strong>{item.reporter_name || item.name || "Khách"}</strong>
                                </span>
                              </div>

                              {/* Admin Response Note */}
                              {item.admin_notes && (
                                <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-base-content/90 space-y-1 animate-fade-in">
                                  <div className="flex items-center gap-1.5 font-bold text-primary text-[11px] uppercase tracking-wider">
                                    <span>🛠️ Phản hồi từ Ban Quản trị / Kỹ thuật:</span>
                                  </div>
                                  <p className="leading-relaxed font-medium">{item.admin_notes}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* View 2: Submission Form */}
              {feedbackSubTab === "form" && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-info/10 border border-info/20 text-xs text-info-content flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <div>
                      <p className="font-bold">Mẹo tránh báo cáo trùng lặp:</p>
                      <p className="text-base-content/70 mt-0.5">
                        Bạn có thể kiểm tra tab <strong>"Danh sách lỗi"</strong> trước để xem sự cố của mình đã được ai báo cáo hay chưa.
                      </p>
                    </div>
                  </div>

                  {/* Feedback Form */}
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label text-xs font-bold text-base-content pb-1">Phân loại phản hồi:</label>
                        <select
                          value={feedbackType}
                          onChange={(e) => setFeedbackType(e.target.value)}
                          className="select select-sm select-bordered w-full rounded-xl text-xs font-semibold"
                        >
                          <option value="bug">🐛 Báo lỗi chức năng (Bug Report)</option>
                          <option value="feature">💡 Góp ý tính năng mới (Feature Request)</option>
                          <option value="content">⚠️ Khiếu nại nội dung bài viết vi phạm</option>
                          <option value="partner">🤝 Đề xuất hợp tác & Tài trợ</option>
                          <option value="other">💬 Ý kiến đóng góp khác</option>
                        </select>
                      </div>

                      <div>
                        <label className="label text-xs font-bold text-base-content pb-1">Mức độ ưu tiên:</label>
                        <select
                          value={feedbackPriority}
                          onChange={(e) => setFeedbackPriority(e.target.value)}
                          className="select select-sm select-bordered w-full rounded-xl text-xs font-semibold"
                        >
                          <option value="low">🟢 Thấp (Ý kiến tham khảo)</option>
                          <option value="medium">🟡 Trung bình (Cải tiến UI/UX)</option>
                          <option value="high">🔴 Cao (Lỗi cản trở trải nghiệm)</option>
                          <option value="critical">🚨 Khẩn cấp (Sự cố bảo mật/Mất dữ liệu)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label text-xs font-bold text-base-content pb-1">Họ tên của bạn:</label>
                        <input
                          type="text"
                          placeholder="Nguyễn Văn A"
                          value={feedbackName}
                          onChange={(e) => setFeedbackName(e.target.value)}
                          className="input input-sm input-bordered w-full rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-base-content pb-1">
                          Email liên hệ nhận phản hồi <span className="text-error">*</span>:
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="you@domain.com"
                          value={feedbackEmail}
                          onChange={(e) => setFeedbackEmail(e.target.value)}
                          className="input input-sm input-bordered w-full rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label text-xs font-bold text-base-content pb-1">
                        Tiêu đề phản hồi <span className="text-error">*</span>:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Lỗi hiển thị code block bị tràn màn hình..."
                        value={feedbackSubject}
                        onChange={(e) => setFeedbackSubject(e.target.value)}
                        className="input input-sm input-bordered w-full rounded-xl text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="label text-xs font-bold text-base-content pb-1">
                        Chi tiết phản hồi / Các bước tái hiện lỗi <span className="text-error">*</span>:
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Mô tả cụ thể sự cố, môi trường trình duyệt/thiết bị, hành động trước khi lỗi xảy ra hoặc giải pháp đề xuất..."
                        value={feedbackContent}
                        onChange={(e) => setFeedbackContent(e.target.value)}
                        className="textarea textarea-bordered w-full rounded-2xl text-xs leading-relaxed"
                      ></textarea>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setFeedbackSubTab("tracker")}
                        className="text-xs text-base-content/60 hover:text-base-content font-bold cursor-pointer"
                      >
                        ← Quay lại danh sách lỗi
                      </button>
                      <button
                        type="submit"
                        disabled={feedbackSubmitting}
                        className="btn btn-sm btn-primary text-white font-bold rounded-xl gap-2 shadow-sm cursor-pointer"
                      >
                        {feedbackSubmitting ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <span>📨 Gửi báo lỗi ngay</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: SƠ ĐỒ TRANG (SITEMAP) */}
          {activeSection === "sitemap" && (
            <div className="p-6 sm:p-10 bg-base-100 rounded-3xl border border-base-300 shadow-sm space-y-8 text-sm leading-relaxed animate-fade-in">
              <div className="border-b border-base-200 pb-4">
                <span className="badge badge-primary text-white font-bold text-xs mb-2">Điều hướng toàn diện</span>
                <h2 className="text-xl sm:text-2xl font-black text-base-content">
                  Sơ Đồ Trang & Danh Mục Nền Tảng (Sitemap)
                </h2>
                <p className="text-xs text-base-content/60 mt-1">
                  Bản đồ liên kết trực tiếp tới toàn bộ các tính năng, chuyên mục và tài nguyên trên IT Blog
                </p>
              </div>

              {/* Sitemap Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-base-200/60 border border-base-300 space-y-3">
                  <h3 className="font-bold text-sm text-base-content flex items-center gap-2">
                    <span>📰</span> Khám Phá & Đọc Bài Viết
                  </h3>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <button
                        onClick={() => onNavigate && onNavigate("home")}
                        className="text-primary font-bold hover:underline cursor-pointer"
                      >
                        → Bảng tin Trang chủ (Newfeed)
                      </button>
                    </li>
                    <li className="font-semibold text-base-content/70 pt-1">Chuyên mục công nghệ:</li>
                    <div className="grid grid-cols-2 gap-1.5 pl-2">
                      {["Frontend", "Backend", "DevOps", "AI & Data", "Database", "System", "Mobile"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => navigateToCategory(cat)}
                          className="text-left text-base-content/80 hover:text-primary transition-colors cursor-pointer"
                        >
                          • {cat}
                        </button>
                      ))}
                    </div>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-base-200/60 border border-base-300 space-y-3">
                  <h3 className="font-bold text-sm text-base-content flex items-center gap-2">
                    <span>🎓</span> Học Tập & Phát Triển Kỹ Năng
                  </h3>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <button
                        onClick={() => onNavigate && onNavigate("roadmaps")}
                        className="text-primary font-bold hover:underline cursor-pointer"
                      >
                        → Lộ trình nghề nghiệp (Roadmaps)
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigate && onNavigate("courses")}
                        className="text-primary font-bold hover:underline cursor-pointer"
                      >
                        → Khóa học & Bài giảng thực chiến (Courses)
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigate && onNavigate("quiz")}
                        className="text-primary font-bold hover:underline cursor-pointer"
                      >
                        → Trắc nghiệm kỹ thuật & Luyện phỏng vấn (Quiz)
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigate && onNavigate("jobs")}
                        className="text-primary font-bold hover:underline cursor-pointer"
                      >
                        → Cơ hội việc làm IT & Tuyển dụng (Jobs)
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigate && onNavigate("events")}
                        className="text-primary font-bold hover:underline cursor-pointer"
                      >
                        → Sự kiện công nghệ & Hackathon (Events)
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigate && onNavigate("leaderboard")}
                        className="text-primary font-bold hover:underline cursor-pointer"
                      >
                        → Bảng xếp hạng tác giả xuất sắc (Leaderboard)
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: RSS FEEDS */}
          {activeSection === "rss" && (
            <div className="p-6 sm:p-10 bg-base-100 rounded-3xl border border-base-300 shadow-sm space-y-6 text-sm leading-relaxed animate-fade-in">
              <div className="border-b border-base-200 pb-4">
                <span className="badge badge-warning text-amber-950 font-black text-xs mb-2">Chuẩn RSS 2.0 XML</span>
                <h2 className="text-xl sm:text-2xl font-black text-base-content">
                  Nguồn Cấp Tin Tức Kỹ Thuật (RSS Feeds)
                </h2>
                <p className="text-xs text-base-content/60 mt-1">
                  Đăng ký nhận bài viết kỹ thuật mới nhất tự động qua các ứng dụng đọc tin RSS Reader
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-base-200/80 border border-base-300 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-base-content flex items-center gap-2">
                      <span>📰</span> Luồng Tin Chính Thức IT Blog (All Posts)
                    </h3>
                    <p className="text-xs text-base-content/60">
                      Cập nhật theo thời gian thực tất cả bài viết đã phê duyệt và xuất bản.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={api.seo.getRssUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-primary text-white font-bold text-xs gap-1.5 cursor-pointer"
                    >
                      <span>Mở XML</span> ↗
                    </a>
                    <button
                      type="button"
                      onClick={copyRssUrl}
                      className="btn btn-sm btn-outline text-xs font-bold cursor-pointer"
                      title="Sao chép link RSS"
                    >
                      Sao chép link
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-base-100 border border-base-300 font-mono text-xs text-primary break-all">
                  {api.seo.getRssUrl()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Quick Contact & Help Sidebar */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-base-content flex items-center gap-2">
              <span>📞</span> Kênh Hỗ Trợ Trực Tiếp
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="text-base">📧</span>
                <div>
                  <p className="font-bold text-base-content">Email Hỗ Trợ:</p>
                  <a href="mailto:support@itblog.local" className="text-primary hover:underline font-semibold">
                    support@itblog.local
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-base">☎️</span>
                <div>
                  <p className="font-bold text-base-content">Hotline Kỹ Thuật:</p>
                  <a href="tel:02838354409" className="text-primary hover:underline font-semibold">
                    (028) 3835 4409
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-base">🕒</span>
                <div>
                  <p className="font-bold text-base-content">Thời Gian Làm Việc:</p>
                  <p className="text-base-content/70">Thứ 2 - Thứ 7: 8:00 - 17:30</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="text-base">📍</span>
                <div>
                  <p className="font-bold text-base-content">Địa Chỉ:</p>
                  <p className="text-base-content/70">Khoa Công nghệ Thông tin - Trường Đại học</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-base-200">
              <button
                type="button"
                onClick={() => setActiveSection("feedback")}
                className="btn btn-sm btn-primary w-full text-white font-bold rounded-xl text-xs gap-1.5 shadow-xs cursor-pointer"
              >
                <span>💬</span> Mở Biểu Mẫu Báo Lỗi
              </button>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Hệ thống Hoạt động 100%
              </span>
              <span className="badge badge-xs badge-success text-white font-bold">Online</span>
            </div>
            <p className="text-base-content/70 leading-relaxed text-[11px]">
              Tất cả các dịch vụ: Web Portal, RESTful API, PostgreSQL Database và Gemini AI Mod Service đang hoạt động bình thường.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
