import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";
import { useToast } from "../context/ToastContext";
import ThemeToggle from "./ThemeToggle";
import { api } from "../services/api";

const SEARCH_HISTORY_KEY = "it_blog_recent_searches";
const POPULAR_SEARCH_TAGS = [
  "React 19", "FastAPI", "Docker", "DevOps", "Python", "Microservices", "AI", "PostgreSQL"
];

export default function Navbar({ onNavigate, currentPage = "home" }) {
  const { currentUser, logout, requireAuth } = useAuth();
  const { searchQuery, setSearchQuery, pendingPosts } = useBlog();
  const { addToast } = useToast();

  // Search input ref & shortcuts modal state
  const searchInputRef = useRef(null);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Notification States
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifFilter, setNotifFilter] = useState("all"); // 'all' | 'unread'
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const notifRef = useRef(null);

  // Đóng popover thông báo khi click bên ngoài hoặc nhấn Esc
  useEffect(() => {
    if (!notifsOpen) return;
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setNotifsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notifsOpen]);

  const handleNavAndCloseMobile = (page, params = null) => {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    if (page && onNavigate) onNavigate(page, params);
  };

  // Search History & Hot Tags States
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const saveToSearchHistory = (term) => {
    const trimmed = (term || "").trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const updated = [trimmed, ...prev.filter((i) => i.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const removeSearchHistoryItem = (e, itemToRemove) => {
    e.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((i) => i !== itemToRemove);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const clearAllSearchHistory = (e) => {
    e.stopPropagation();
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // ignore
    }
  };

  const handleSelectSearchTerm = (term) => {
    setSearchQuery(term);
    saveToSearchHistory(term);
    setSearchFocused(false);
    setMobileSearchOpen(false);
    if (currentPage !== "home" && onNavigate) {
      onNavigate("home");
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      if (searchQuery.trim()) {
        saveToSearchHistory(searchQuery.trim());
      }
      setSearchFocused(false);
      setMobileSearchOpen(false);
      if (currentPage !== "home" && onNavigate) {
        onNavigate("home");
      }
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable);

      // Ctrl + K or Cmd + K: Focus search bar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchFocused(true);
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }

      // Escape: Close all modals & dropdowns
      if (e.key === "Escape") {
        setShortcutsModalOpen(false);
        setSearchFocused(false);
        setMobileSearchOpen(false);
        setNotifsOpen(false);
        return;
      }

      // If user is currently typing in an input or textarea, don't trigger hotkeys
      if (isInput) return;

      // ? or Shift + /: Open Shortcuts Cheatsheet
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Alt + Navigation hotkeys
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "h" && onNavigate) {
          e.preventDefault();
          onNavigate("home");
        } else if (key === "n" && onNavigate) {
          e.preventDefault();
          if (requireAuth) {
            requireAuth(() => onNavigate("create_post"), "Vui lòng đăng nhập để viết bài mới!");
          } else {
            onNavigate("create_post");
          }
        } else if (key === "r" && onNavigate) {
          e.preventDefault();
          onNavigate("roadmaps");
        } else if (key === "j" && onNavigate) {
          e.preventDefault();
          onNavigate("jobs");
        } else if (key === "e" && onNavigate) {
          e.preventDefault();
          onNavigate("events");
        } else if (key === "l" && onNavigate) {
          e.preventDefault();
          onNavigate("leaderboard");
        } else if (key === "q" && onNavigate) {
          e.preventDefault();
          onNavigate("quiz");
        } else if (key === "c" && onNavigate) {
          e.preventDefault();
          onNavigate("courses");
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onNavigate, requireAuth]);

  // Load unread notifications count & subscribe to realtime WebSocket
  useEffect(() => {
    if (!currentUser) return;

    const fetchNotifs = () => {
      api.notifications.unreadCount()
        .then((res) => {
          if (res?.unread_count !== undefined) {
            setUnreadCount(res.unread_count);
          }
        })
        .catch(() => {});
    };

    fetchNotifs();
    const timer = setInterval(fetchNotifs, 30000); // 30s poll fallback

    // Realtime WebSocket notification feed
    let ws = null;
    try {
      ws = api.notifications.createWebSocket((msg) => {
        if (msg) {
          setUnreadCount((prev) => prev + 1);
          setNotifications((prev) => [msg, ...prev]);
        }
      });
    } catch (e) {
      console.warn("WebSocket init fallback:", e);
    }

    return () => {
      clearInterval(timer);
      if (ws) {
        try {
          ws.close();
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, [currentUser]);

  const loadNotificationsList = () => {
    if (!currentUser) return;
    setNotifsOpen((prev) => !prev);
    api.notifications.list({ limit: 6 })
      .then((res) => {
        const items = res?.items || (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          setNotifications(items);
        } else {
          // Fallback sample notifications
          setNotifications([
            { id: 1, type: "comment", title: "Bình luận mới", message: "Nguyễn Văn Hoàng đã bình luận bài viết của bạn.", is_read: false, created_at: new Date().toISOString() },
            { id: 2, type: "like", title: "Lượt thích mới", message: "12 lập trình viên đã thích bài viết của bạn.", is_read: false, created_at: new Date().toISOString() },
            { id: 3, type: "system", title: "Duyệt bài viết", message: "Bài viết của bạn đã được duyệt và xuất bản.", is_read: true, created_at: new Date().toISOString() }
          ]);
        }
      })
      .catch(() => {
        setNotifications([
          { id: 1, type: "comment", title: "Bình luận mới", message: "Nguyễn Văn Hoàng đã bình luận bài viết của bạn.", is_read: false, created_at: new Date().toISOString() },
          { id: 2, type: "like", title: "Lượt thích mới", message: "12 lập trình viên đã thích bài viết của bạn.", is_read: false, created_at: new Date().toISOString() }
        ]);
      });
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
    } catch {
      // ignore
    }
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleClearAllNotifications = async () => {
    if (notifications.length === 0) {
      addToast("Danh sách thông báo hiện đang trống. ℹ️", "info");
      return;
    }
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ danh sách thông báo?")) {
      try {
        await api.notifications.clearAll();
      } catch {
        // ignore
      }
      setNotifications([]);
      setUnreadCount(0);
      addToast("Đã dọn dẹp sạch toàn bộ thông báo! 🗑️", "success");
    }
  };

  const handleExportNotificationsMd = () => {
    if (notifications.length === 0) {
      addToast("Chưa có thông báo nào để xuất! ℹ️", "info");
      return;
    }

    const rows = notifications.map((n, idx) => {
      const type = (n.type || "system").toUpperCase();
      const title = (n.title || "Thông báo").replace(/\|/g, "\\|");
      const message = (n.message || n.content || "Nội dung").replace(/\|/g, "\\|");
      const status = n.is_read ? "✓ Đã đọc" : "🔴 Chưa đọc";
      const date = n.created_at ? new Date(n.created_at).toLocaleString("vi-VN") : "Vừa xong";
      return `| ${idx + 1} | ${type} | ${title} | ${message} | ${status} | ${date} |`;
    }).join("\n");

    const content = `# 🔔 NHẬT KÝ THÔNG BÁO - IT BLOG
*Chủ tài khoản:* ${currentUser?.name || "Người dùng"} (${currentUser?.email || ""})
*Thời gian xuất:* ${new Date().toLocaleString("vi-VN")}
*Tổng số thông báo:* ${notifications.length}

| STT | Loại | Tiêu đề | Nội dung chi tiết | Trạng thái | Thời gian |
|---|---|---|---|---|---|
${rows}

---
*Tài liệu nhật ký được trích xuất tự động từ Nền tảng IT Blog.*
`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `it_blog_notifications_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Đã xuất nhật ký thông báo (.md) thành công! 📥", "success");
  };

  const handleCreatePost = () => {
    requireAuth(
      () => onNavigate && onNavigate("create_post"),
      "Vui lòng đăng nhập để đăng bài viết mới!"
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-base-100/90 backdrop-blur-md border-b border-base-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Logo & Navigation */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Mobile Navigation Dropdown (chỉ hiển thị khi màn hình < lg) */}
          <div className="dropdown dropdown-bottom lg:hidden">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-sm btn-circle text-base-content/80 hover:text-base-content"
              aria-label="Menu điều hướng"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu menu-sm bg-base-100 rounded-2xl z-50 w-64 p-2.5 shadow-2xl border border-base-300 mt-2 space-y-1"
            >
              <li className="pb-1">
                <div className="relative p-0 hover:bg-transparent">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm bài viết..."
                    className="input input-xs input-bordered w-full pl-7 pr-6 bg-base-200/60 text-xs rounded-lg"
                  />
                  <svg className="w-3.5 h-3.5 text-base-content/50 absolute left-2 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1.5 text-xs text-base-content/40 hover:text-base-content">✕</button>
                  )}
                </div>
              </li>
              <div className="divider my-0.5"></div>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("home")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "home" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <span>🏠</span>
                  <span>Trang chủ</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("roadmaps")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "roadmaps" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <span>🗺️</span>
                  <span>Lộ trình IT</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("courses")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "courses" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <span>🎓</span>
                  <span>Khóa học</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("quiz")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "quiz" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <span>🧠</span>
                  <span>Trắc nghiệm IT</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("jobs")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "jobs" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <span>💼</span>
                  <span>Việc làm IT</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("events")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "events" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <span>📅</span>
                  <span>Sự kiện & Workshop</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("leaderboard")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "leaderboard" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <span>🏆</span>
                  <span>Bảng xếp hạng</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("moderation")}
                  className={`flex items-center justify-between py-2 font-semibold ${currentPage === "moderation" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span>Duyệt bài</span>
                  </div>
                  {pendingPosts?.length > 0 && (
                    <span className="badge badge-xs bg-amber-400 text-amber-950 font-bold">{pendingPosts.length}</span>
                  )}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    handleNavAndCloseMobile();
                    handleCreatePost();
                  }}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "create_post" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <span>✍️</span>
                  <span>Viết bài mới</span>
                </button>
              </li>
              {!currentUser && (
                <>
                  <div className="divider my-1"></div>
                  <li>
                    <button
                      onClick={() => handleNavAndCloseMobile("login")}
                      className="flex items-center gap-2 py-2 font-semibold text-primary"
                    >
                      <span>🔑</span>
                      <span>Đăng nhập</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavAndCloseMobile("logup")}
                      className="flex items-center gap-2 py-2 font-semibold text-base-content/80 hover:text-primary"
                    >
                      <span>✨</span>
                      <span>Đăng ký tài khoản</span>
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>

          <button
            onClick={() => onNavigate && onNavigate("home")}
            className="btn btn-ghost px-1.5 sm:px-2 normal-case flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl font-black tracking-tight"
          >
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary text-white flex items-center justify-center font-extrabold text-sm sm:text-base shadow-sm">
              IT
            </span>
            <span className="text-base-content">Blog</span>
          </button>

          <div className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => onNavigate && onNavigate("home")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2.5 ${
                currentPage === "home"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Trang chủ
            </button>
            <button
              onClick={() => onNavigate && onNavigate("roadmaps")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2.5 ${
                currentPage === "roadmaps"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Lộ trình
            </button>
            <button
              onClick={() => onNavigate && onNavigate("courses")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2.5 ${
                currentPage === "courses"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Khóa học
            </button>
            <button
              onClick={() => onNavigate && onNavigate("quiz")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2.5 ${
                currentPage === "quiz"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Trắc nghiệm
            </button>
            <button
              onClick={() => onNavigate && onNavigate("jobs")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2.5 ${
                currentPage === "jobs"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Việc làm
            </button>
            <button
              onClick={() => onNavigate && onNavigate("events")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2.5 ${
                currentPage === "events"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Sự kiện
            </button>
            <button
              onClick={() => onNavigate && onNavigate("leaderboard")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2.5 ${
                currentPage === "leaderboard"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Xếp hạng
            </button>
            <button
              onClick={() => onNavigate && onNavigate("moderation")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all gap-1 px-2.5 ${
                currentPage === "moderation"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              <span>Duyệt bài</span>
              {pendingPosts?.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-extrabold text-amber-950 bg-amber-400 rounded-full shadow-xs leading-none shrink-0">
                  {pendingPosts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="flex-1 max-w-lg hidden sm:block relative">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Tìm kiếm bài viết, công nghệ, tác giả..."
              className="input input-sm input-bordered w-full pl-9 pr-14 bg-base-200/50 focus:bg-base-100 transition-all rounded-full"
            />
            <svg
              className="w-4 h-4 text-base-content/50 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-base-content/40 hover:text-base-content"
              >
                ✕
              </button>
            ) : (
              <span className="absolute right-2.5 top-2 pointer-events-none hidden md:inline-flex items-center gap-0.5 opacity-50">
                <kbd className="kbd kbd-xs text-[10px] font-mono py-0 px-1 bg-base-300">Ctrl</kbd>
                <kbd className="kbd kbd-xs text-[10px] font-mono py-0 px-1 bg-base-300">K</kbd>
              </span>
            )}
          </div>

          {/* Gợi ý Tìm kiếm & Lịch sử truy vấn gần đây */}
          {searchFocused && (
            <div
              className="absolute left-0 right-0 top-full mt-2 bg-base-100 rounded-2xl border border-base-300 shadow-2xl p-3.5 z-50 animate-fade-in text-xs space-y-3"
              onMouseDown={(e) => e.preventDefault()}
            >
              {/* Lịch sử tìm kiếm gần đây */}
              {searchHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-base-content/60 mb-2 px-1">
                    <span>🕒 Lịch sử tìm kiếm</span>
                    <button
                      type="button"
                      onClick={clearAllSearchHistory}
                      className="text-error/80 hover:text-error hover:underline cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {searchHistory.map((item, idx) => (
                      <span
                        key={idx}
                        onClick={() => handleSelectSearchTerm(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-base-200 hover:bg-base-300 text-base-content rounded-full cursor-pointer transition-colors"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={(e) => removeSearchHistoryItem(e, item)}
                          className="text-base-content/40 hover:text-error rounded-full ml-0.5 text-sm leading-none"
                          title="Xóa từ khóa này"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gợi ý chủ đề Hot */}
              <div>
                <div className="text-[11px] font-bold text-base-content/60 mb-2 px-1">
                  🔥 Chủ đề & Công nghệ thịnh hành
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SEARCH_TAGS.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSearchTerm(tag)}
                      className="px-2.5 py-1 bg-primary/10 hover:bg-primary hover:text-white text-primary rounded-full font-semibold transition-all cursor-pointer"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Nút tìm kiếm trên Mobile */}
          <button
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            className={`btn btn-ghost btn-circle btn-sm sm:hidden ${mobileSearchOpen ? "text-primary bg-primary/10" : "text-base-content/80 hover:text-base-content"}`}
            aria-label="Tìm kiếm bài viết"
            title="Tìm kiếm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Nút Viết bài mới */}
          <button
            onClick={handleCreatePost}
            className="btn btn-sm btn-primary text-white rounded-lg flex items-center gap-1.5 shadow-sm font-semibold px-2 sm:px-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Viết bài</span>
          </button>

          {/* Nút Phím tắt bàn phím */}
          <button
            type="button"
            onClick={() => setShortcutsModalOpen(true)}
            className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-base-content"
            aria-label="Phím tắt hệ thống"
            title="Phím tắt hệ thống (Nhấn ? hoặc Ctrl+K)"
          >
            <span className="text-sm">⌨️</span>
          </button>

          {/* Theme Toggle Sáng / Tối */}
          <ThemeToggle />

          {/* Phân biệt Guest vs Authenticated User */}
          {currentUser ? (
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Notification Bell Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={loadNotificationsList}
                  className="btn btn-ghost btn-circle btn-sm text-base-content/80 hover:text-base-content relative"
                  aria-label="Thông báo"
                  title="Thông báo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[10px] font-extrabold rounded-full flex items-center justify-center leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-base-100 rounded-2xl shadow-2xl border border-base-300 p-3 z-50 animate-fade-in space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-base-200">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-base-content">🔔 Thông báo của bạn</span>
                        {unreadCount > 0 && (
                          <span className="badge badge-xs badge-error text-white font-bold">{unreadCount} mới</span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-primary hover:underline font-semibold"
                        >
                          Đánh dấu đã đọc
                        </button>
                      )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-base-200/60 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setNotifFilter("all")}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                          notifFilter === "all"
                            ? "bg-base-100 text-primary shadow-2xs"
                            : "text-base-content/60 hover:text-base-content"
                        }`}
                      >
                        Tất cả ({notifications.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifFilter("unread")}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                          notifFilter === "unread"
                            ? "bg-base-100 text-error shadow-2xs"
                            : "text-base-content/60 hover:text-base-content"
                        }`}
                      >
                        Chưa đọc ({notifications.filter((n) => !n.is_read).length})
                      </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-1.5 scrollbar-thin">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-xs text-base-content/50">
                          Bạn chưa có thông báo nào mới
                        </div>
                      ) : notifFilter === "unread" && notifications.filter((n) => !n.is_read).length === 0 ? (
                        <div className="text-center py-6 text-xs text-base-content/50">
                          Không có thông báo chưa đọc nào 🎉
                        </div>
                      ) : (
                        (notifFilter === "unread" ? notifications.filter((n) => !n.is_read) : notifications).map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              setNotifsOpen(false);
                              if (!notif.is_read) {
                                api.notifications.markRead(notif.id).catch(() => {});
                                setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
                                setUnreadCount((prev) => Math.max(0, prev - 1));
                              }
                              if (notif.post_id || notif.reference_id) {
                                if (onNavigate) onNavigate("post_detail", { postId: notif.post_id || notif.reference_id });
                              }
                            }}
                            className={`p-2.5 rounded-xl text-xs cursor-pointer transition-colors border ${
                              notif.is_read
                                ? "bg-base-200/40 border-transparent hover:bg-base-200/70 text-base-content/70"
                                : "bg-primary/5 border-primary/20 hover:bg-primary/10 text-base-content font-medium"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-[11px] text-primary">
                                {notif.title || (notif.type === "comment" ? "Bình luận" : notif.type === "like" ? "Tương tác" : "Thông báo")}
                              </span>
                              <span className="text-[10px] text-base-content/40 shrink-0">
                                {notif.created_at && !isNaN(new Date(notif.created_at).getTime()) ? new Date(notif.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Vừa xong"}
                              </span>
                            </div>
                            <p className="text-xs text-base-content/80 mt-0.5 line-clamp-2">
                              {notif.message || notif.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Notification Popover Footer: Clear All & Export Markdown */}
                    <div className="pt-2 border-t border-base-200 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={handleExportNotificationsMd}
                        disabled={notifications.length === 0}
                        className="btn btn-ghost btn-xs text-primary font-bold hover:underline gap-1 p-1 h-auto min-h-0 disabled:opacity-40"
                        title="Xuất toàn bộ nhật ký thông báo ra định dạng Markdown (.md)"
                      >
                        <span>📥</span>
                        <span>Xuất nhật ký (.md)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAllNotifications}
                        disabled={notifications.length === 0}
                        className="btn btn-ghost btn-xs text-error font-semibold hover:underline gap-1 p-1 h-auto min-h-0 disabled:opacity-40"
                        title="Dọn dẹp sạch toàn bộ danh sách thông báo"
                      >
                        <span>🗑️</span>
                        <span>Xóa hết</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Đã đăng nhập: Avatar & Dropdown menu */}
              <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-circle avatar ring-1 ring-base-300 ring-offset-2 ring-offset-base-100"
              >
                <div className="w-8 sm:w-9 rounded-full">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    onError={(e) => {
                      e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.name || "User")}`;
                    }}
                  />
                </div>
              </div>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-56 p-2 shadow-xl border border-base-300"
              >
                {/* Thông tin user tóm tắt */}
                <li className="menu-title px-3 py-2 border-b border-base-200">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm text-base-content truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[11px] text-base-content/60 truncate font-normal">
                      {currentUser.email}
                    </span>
                  </div>
                </li>

                <li>
                  <button
                    onClick={() => handleNavAndCloseMobile("profile", { tab: "my_posts" })}
                    className="flex items-center gap-2 py-2"
                  >
                    <svg className="w-4 h-4 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Trang cá nhân</span>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => handleNavAndCloseMobile("profile", { tab: "bookmarks" })}
                    className="flex items-center gap-2 py-2"
                  >
                    <svg className="w-4 h-4 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span>Bài viết đã lưu</span>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => handleNavAndCloseMobile("moderation")}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span>Duyệt bài viết</span>
                    </div>
                    {pendingPosts?.length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-extrabold text-amber-950 bg-amber-400 rounded-full shadow-xs leading-none shrink-0">
                        {pendingPosts.length}
                      </span>
                    )}
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => handleNavAndCloseMobile("leaderboard")}
                    className="flex items-center gap-2 py-2"
                  >
                    <span>🏆</span>
                    <span>Bảng xếp hạng & Huy hiệu</span>
                  </button>
                </li>

                <div className="divider my-1"></div>

                <li>
                  <button
                    onClick={() => {
                      if (document.activeElement && typeof document.activeElement.blur === "function") {
                        document.activeElement.blur();
                      }
                      logout();
                    }}
                    className="flex items-center gap-2 py-2 text-error hover:bg-error/10 font-semibold"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Đăng xuất</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
          ) : (
            /* Chưa đăng nhập: Nút Đăng nhập & Đăng ký */
            <div className="flex items-center gap-1">
              <button
                onClick={() => onNavigate && onNavigate("login")}
                className="btn btn-sm btn-ghost font-semibold text-base-content text-xs sm:text-sm px-2 sm:px-3"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => onNavigate && onNavigate("logup")}
                className="btn btn-sm btn-outline btn-primary font-semibold hidden sm:inline-flex text-xs sm:text-sm"
              >
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Bar Expandable */}
      {mobileSearchOpen && (
        <div className="sm:hidden px-4 pb-3 pt-1 border-t border-base-200 bg-base-100 animate-fade-in space-y-2.5">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Tìm bài viết, công nghệ, tác giả..."
              className="input input-sm input-bordered w-full pl-9 pr-8 bg-base-200/50 focus:bg-base-100 rounded-full text-xs"
              autoFocus
            />
            <svg
              className="w-4 h-4 text-base-content/50 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-base-content/40 hover:text-base-content"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick history & tags on mobile */}
          <div className="space-y-2 pt-1 text-xs">
            {searchHistory.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-base-content/60 mb-1 px-0.5">
                  <span>🕒 Lịch sử tìm kiếm</span>
                  <button
                    type="button"
                    onClick={clearAllSearchHistory}
                    className="text-error/80 hover:text-error text-[10px]"
                  >
                    Xóa
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {searchHistory.slice(0, 5).map((item, idx) => (
                    <span
                      key={idx}
                      onClick={() => handleSelectSearchTerm(item)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-base-200 text-base-content text-[11px] rounded-full cursor-pointer"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={(e) => removeSearchHistoryItem(e, item)}
                        className="text-base-content/40 hover:text-error"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-[11px] font-bold text-base-content/60 mb-1 px-0.5">
                🔥 Công nghệ hot
              </div>
              <div className="flex flex-wrap gap-1">
                {POPULAR_SEARCH_TAGS.slice(0, 6).map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchTerm(tag)}
                    className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] rounded-full font-semibold"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bảng Phím Tắt Hệ Thống (Keyboard Shortcuts Cheatsheet) */}
      {shortcutsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShortcutsModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-base-100 rounded-3xl shadow-2xl border border-base-300 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-base-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">⌨️</span>
                <div>
                  <h3 className="text-base font-bold text-base-content !my-0">
                    Phím Tắt Bàn Phím Toàn Hệ Thống
                  </h3>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    Thao tác nhanh trên IT Blog bằng các tổ hợp phím tắt chuẩn Developer.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShortcutsModalOpen(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              {/* Nhóm 1: Thao tác chung */}
              <div>
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-base-content/50 mb-2.5">
                  Thao tác tìm kiếm & Điều khiển
                </h4>
                <div className="space-y-2 bg-base-200/50 p-3 rounded-2xl border border-base-200">
                  <div className="flex items-center justify-between py-1 border-b border-base-200/50">
                    <span className="text-base-content/80">Mở ô tìm kiếm toàn hệ thống</span>
                    <div className="flex items-center gap-1 font-mono">
                      <kbd className="kbd kbd-sm text-xs">Ctrl</kbd>
                      <span>+</span>
                      <kbd className="kbd kbd-sm text-xs">K</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-base-200/50">
                    <span className="text-base-content/80">Mở bảng phím tắt này</span>
                    <kbd className="kbd kbd-sm text-xs font-mono">?</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-base-content/80">Đóng modal / Hủy tìm kiếm</span>
                    <kbd className="kbd kbd-sm text-xs font-mono">Esc</kbd>
                  </div>
                </div>
              </div>

              {/* Nhóm 2: Điều hướng trang */}
              <div>
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-base-content/50 mb-2.5">
                  Điều hướng nhanh các phân hệ
                </h4>
                <div className="space-y-2 bg-base-200/50 p-3 rounded-2xl border border-base-200">
                  <div className="flex items-center justify-between py-1 border-b border-base-200/50">
                    <span className="text-base-content/80">Quay về Trang chủ</span>
                    <div className="flex items-center gap-1 font-mono">
                      <kbd className="kbd kbd-sm text-xs">Alt</kbd>
                      <span>+</span>
                      <kbd className="kbd kbd-sm text-xs">H</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-base-200/50">
                    <span className="text-base-content/80">Viết bài mới</span>
                    <div className="flex items-center gap-1 font-mono">
                      <kbd className="kbd kbd-sm text-xs">Alt</kbd>
                      <span>+</span>
                      <kbd className="kbd kbd-sm text-xs">N</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-base-200/50">
                    <span className="text-base-content/80">Lộ trình IT Roadmaps</span>
                    <div className="flex items-center gap-1 font-mono">
                      <kbd className="kbd kbd-sm text-xs">Alt</kbd>
                      <span>+</span>
                      <kbd className="kbd kbd-sm text-xs">R</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-base-200/50">
                    <span className="text-base-content/80">Khóa học công nghệ</span>
                    <div className="flex items-center gap-1 font-mono">
                      <kbd className="kbd kbd-sm text-xs">Alt</kbd>
                      <span>+</span>
                      <kbd className="kbd kbd-sm text-xs">C</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-base-200/50">
                    <span className="text-base-content/80">Trắc nghiệm IT Quiz</span>
                    <div className="flex items-center gap-1 font-mono">
                      <kbd className="kbd kbd-sm text-xs">Alt</kbd>
                      <span>+</span>
                      <kbd className="kbd kbd-sm text-xs">Q</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-base-200/50">
                    <span className="text-base-content/80">Việc làm IT Jobs</span>
                    <div className="flex items-center gap-1 font-mono">
                      <kbd className="kbd kbd-sm text-xs">Alt</kbd>
                      <span>+</span>
                      <kbd className="kbd kbd-sm text-xs">J</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-base-200/50">
                    <span className="text-base-content/80">Sự kiện & Workshop</span>
                    <div className="flex items-center gap-1 font-mono">
                      <kbd className="kbd kbd-sm text-xs">Alt</kbd>
                      <span>+</span>
                      <kbd className="kbd kbd-sm text-xs">E</kbd>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-base-content/80">Bảng xếp hạng Leaderboard</span>
                    <div className="flex items-center gap-1 font-mono">
                      <kbd className="kbd kbd-sm text-xs">Alt</kbd>
                      <span>+</span>
                      <kbd className="kbd kbd-sm text-xs">L</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-base-200/40 border-t border-base-200 flex items-center justify-between">
              <span className="text-[11px] text-base-content/50">
                Nhấn <kbd className="kbd kbd-xs">Esc</kbd> bất kỳ lúc nào để đóng
              </span>
              <button
                type="button"
                onClick={() => setShortcutsModalOpen(false)}
                className="btn btn-sm btn-primary text-white font-bold rounded-xl"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}