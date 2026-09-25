import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";
import { useToast } from "../context/ToastContext";
import ThemeToggle from "./ThemeToggle";
import { api } from "../services/api";
import {
  Bell, Heart, MessageSquare, BadgeCheck,
  Clock, Keyboard, Home, UserCheck, Milestone,
  GraduationCap, HelpCircle, Briefcase, Calendar,
  Award, ShieldCheck, PenTool, User, LogOut,
  LogIn, Sparkles, X, Flame, Share2, Trash2
} from "./icons";
import { EmptyNotificationsIllustration } from "./illustrations";

const SEARCH_HISTORY_KEY = "it_blog_recent_searches";
const POPULAR_SEARCH_TAGS = [
  "React 19", "FastAPI", "Docker", "DevOps", "Python", "Microservices", "AI", "PostgreSQL"
];

const getLocalReadIds = () => {
  try {
    const raw = localStorage.getItem("it_blog_read_notifs");
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
};

const markIdLocallyRead = (id) => {
  try {
    const current = getLocalReadIds();
    current.add(String(id));
    localStorage.setItem("it_blog_read_notifs", JSON.stringify(Array.from(current)));
  } catch (e) {
    console.error(e);
  }
};

const getNotificationVisual = (type) => {
  switch (String(type || "").toLowerCase()) {
    case "comment":
    case "reply":
      return {
        bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
        icon: <MessageSquare size={16} className="text-blue-500 shrink-0" />,
        defaultTitle: "Bình luận mới"
      };
    case "like":
      return {
        bg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
        icon: <Heart size={16} className="text-rose-500 fill-rose-500 shrink-0" />,
        defaultTitle: "Lượt thích mới"
      };
    case "follow":
      return {
        bg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30",
        icon: <UserCheck size={16} className="text-purple-500 shrink-0" />,
        defaultTitle: "Người theo dõi mới"
      };
    case "post":
    case "approved":
    case "system":
      return {
        bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
        icon: <BadgeCheck size={16} className="text-emerald-500 shrink-0" />,
        defaultTitle: "Duyệt bài viết"
      };
    default:
      return {
        bg: "bg-primary/15 text-primary border border-primary/30",
        icon: <Bell size={16} className="text-primary shrink-0" />,
        defaultTitle: "Thông báo"
      };
  }
};

export default function Navbar({ onNavigate, currentPage = "home" }) {
  const { currentUser, logout, requireAuth, isAdmin, loginDemo } = useAuth();
  const { searchQuery, setSearchQuery, pendingPosts, posts } = useBlog();

  const canAccessModeration = Boolean(
    currentUser && (
      currentUser.role === "admin" ||
      currentUser.role === "moderator" ||
      currentUser.is_superuser ||
      currentUser.id === "demo_user" ||
      String(currentUser.id) === "1" ||
      currentUser.email === "admin@itblog.dev" ||
      currentUser.username === "admin" ||
      (Array.isArray(currentUser.roles) && (
        currentUser.roles.includes("admin") ||
        currentUser.roles.includes("moderator") ||
        currentUser.roles.some((r) =>
          typeof r === "string" ? r === "admin" || r === "moderator" : r?.name === "admin" || r?.name === "moderator"
        )
      ))
    )
  );
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
          requireAuth(() => onNavigate("create_post"), "Vui lòng đăng nhập để viết bài mới!");
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
    const token = localStorage.getItem("it_blog_token");

    const fetchNotifs = () => {
      const localReadSet = getLocalReadIds();
      if (token) {
        api.notifications.unreadCount()
          .then((res) => {
            if (res?.unread_count !== undefined) {
              setUnreadCount(res.unread_count);
            }
          })
          .catch(() => {
            const unreadSample = [1, 2].filter((id) => !localReadSet.has(String(id))).length;
            setUnreadCount(unreadSample);
          });
      } else {
        const unreadSample = [1, 2].filter((id) => !localReadSet.has(String(id))).length;
        setUnreadCount(unreadSample);
      }
    };

    fetchNotifs();
    const timer = setInterval(fetchNotifs, 20000);

    let ws = null;
    if (token) {
      try {
        ws = api.notifications.createWebSocket((msg) => {
          if (msg) {
            setUnreadCount((prev) => prev + 1);
            setNotifications((prev) => [msg, ...prev]);
            addToast(msg.message || msg.content || "Bạn có thông báo mới!", "info");
          }
        });
      } catch (err) {
        console.warn("WebSocket notification error:", err);
      }
    }

    return () => {
      clearInterval(timer);
      if (ws) {
        try { ws.close(); } catch { /* ignore */ }
      }
    };
  }, [currentUser, addToast]);

  const loadNotificationsList = () => {
    if (!currentUser) return;
    setNotifsOpen((prev) => !prev);
    const localReadSet = getLocalReadIds();
    const token = localStorage.getItem("it_blog_token");

    const buildFallbackSample = () => {
      const fallbackPostId = (posts && posts.length > 0) ? posts[0].id : 2631;
      const fallbackSecondId = (posts && posts.length > 1) ? posts[1].id : fallbackPostId;
      return [
        {
          id: 1,
          type: "comment",
          title: "Bình luận mới",
          message: "Nguyễn Văn Hoàng đã bình luận bài viết của bạn.",
          post_id: fallbackPostId,
          entity_id: fallbackPostId,
          entity_type: "post",
          is_read: localReadSet.has("1"),
          created_at: new Date(Date.now() - 5 * 60000).toISOString()
        },
        {
          id: 2,
          type: "like",
          title: "Lượt thích mới",
          message: "12 lập trình viên đã thích bài viết của bạn.",
          post_id: fallbackSecondId,
          entity_id: fallbackSecondId,
          entity_type: "post",
          is_read: localReadSet.has("2"),
          created_at: new Date(Date.now() - 35 * 60000).toISOString()
        },
        {
          id: 3,
          type: "system",
          title: "Duyệt bài viết",
          message: "Bài viết của bạn đã được duyệt và xuất bản trên hệ thống.",
          post_id: fallbackPostId,
          entity_id: fallbackPostId,
          entity_type: "post",
          is_read: true,
          created_at: new Date(Date.now() - 120 * 60000).toISOString()
        }
      ];
    };

    if (!token) {
      const sample = buildFallbackSample();
      setNotifications(sample);
      setUnreadCount(sample.filter((n) => !n.is_read).length);
      return;
    }

    api.notifications.list({ limit: 10 })
      .then((res) => {
        const items = res?.items || (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          const reconciled = items.map((it) => ({
            ...it,
            is_read: Boolean(it.is_read || localReadSet.has(String(it.id)))
          }));
          setNotifications(reconciled);
          setUnreadCount(reconciled.filter((n) => !n.is_read).length);
        } else {
          const sample = buildFallbackSample();
          setNotifications(sample);
          setUnreadCount(sample.filter((n) => !n.is_read).length);
        }
      })
      .catch(() => {
        const sample = buildFallbackSample();
        setNotifications(sample);
        setUnreadCount(sample.filter((n) => !n.is_read).length);
      });
  };

  const handleNotificationClick = (notif) => {
    // 1. Đánh dấu đã đọc ngay lập tức và đồng bộ bộ nhớ local
    markIdLocallyRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (String(n.id) === String(notif.id) ? { ...n, is_read: true } : n))
    );
    if (!notif.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
      api.notifications.markRead(notif.id).catch(() => {});
    }

    // 2. Đóng popover thông báo
    setNotifsOpen(false);

    // 3. Điều hướng chính xác tới bài viết, bình luận hoặc tác giả
    const targetPostId = notif.post_id || (notif.entity_type === "post" ? notif.entity_id : null) || notif.reference_id || (posts && posts.length > 0 ? posts[0].id : 2631);

    if (notif.type === "follow" || notif.entity_type === "user") {
      const targetUserId = notif.sender?.id || notif.sender_id || notif.entity_id;
      if (onNavigate && targetUserId) {
        onNavigate("profile", { authorId: targetUserId });
      }
    } else {
      if (onNavigate) {
        const isComment = notif.type === "comment" || notif.type === "reply";
        onNavigate("post_detail", {
          postId: targetPostId,
          scroll: isComment ? "comments" : "top"
        });

        // Nếu người dùng đang ở sẵn trang post_detail, thực hiện cuộn trực tiếp
        if (currentPage === "post_detail") {
          setTimeout(() => {
            if (isComment) {
              const el = document.getElementById("comments-section");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                el.classList.add("ring-4", "ring-primary/40");
                setTimeout(() => el.classList.remove("ring-4", "ring-primary/40"), 2500);
              }
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }, 100);
        }
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
    } catch {
      // ignore
    }
    const current = getLocalReadIds();
    notifications.forEach((n) => current.add(String(n.id)));
    try {
      localStorage.setItem("it_blog_read_notifs", JSON.stringify(Array.from(current)));
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
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất dữ liệu Markdown (.md)!", "error");
      return;
    }
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
      "Vui lòng đăng nhập để viết bài mới!"
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-base-100/90 backdrop-blur-md border-b border-base-300">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Logo & Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
              className="dropdown-content menu menu-sm bg-base-100 rounded-2xl z-50 w-64 p-2.5 shadow-2xl border border-base-300 mt-2 space-y-1 max-h-[calc(100vh-5rem)] overflow-y-auto"
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
                    <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1.5 text-xs text-base-content/40 hover:text-base-content" aria-label="Xóa tìm kiếm"><X size={14} /></button>
                  )}
                </div>
              </li>
              <div className="divider my-0.5"></div>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("home")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "home" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <Home size={18} className="text-primary shrink-0" />
                  <span>Trang chủ</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("roadmaps")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "roadmaps" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <Milestone size={18} className="text-indigo-500 shrink-0" />
                  <span>Lộ trình IT</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("courses")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "courses" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <GraduationCap size={18} className="text-emerald-500 shrink-0" />
                  <span>Khóa học</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("quiz")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "quiz" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <HelpCircle size={18} className="text-amber-500 shrink-0" />
                  <span>Trắc nghiệm IT</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("jobs")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "jobs" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <Briefcase size={18} className="text-sky-500 shrink-0" />
                  <span>Việc làm IT</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("events")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "events" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <Calendar size={18} className="text-purple-500 shrink-0" />
                  <span>Sự kiện & Workshop</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavAndCloseMobile("leaderboard")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "leaderboard" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <Award size={18} className="text-amber-500 shrink-0" />
                  <span>Bảng xếp hạng</span>
                </button>
              </li>
              {canAccessModeration && (
                <li>
                  <button
                    onClick={() => handleNavAndCloseMobile("moderation")}
                    className={`flex items-center justify-between py-2 font-semibold ${currentPage === "moderation" ? "active text-white bg-primary font-bold" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-rose-500 shrink-0" />
                      <span>Cài đặt hệ thống</span>
                    </div>
                    {pendingPosts?.length > 0 && (
                      <span className="badge badge-xs bg-amber-400 text-amber-950 font-bold">{pendingPosts.length}</span>
                    )}
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => {
                    handleNavAndCloseMobile();
                    handleCreatePost();
                  }}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "create_post" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <PenTool size={18} className="text-primary shrink-0" />
                  <span>Viết bài mới</span>
                </button>
              </li>
              {currentUser ? (
                <>
                  <div className="divider my-1"></div>
                  <li>
                    <button
                      onClick={() => handleNavAndCloseMobile("profile")}
                      className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "profile" ? "active text-white bg-primary font-bold" : "text-base-content/80"}`}
                    >
                      <User size={18} className="text-cyan-500 shrink-0" />
                      <span className="truncate">Trang cá nhân ({currentUser.name || currentUser.username})</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        handleNavAndCloseMobile();
                        logout();
                      }}
                      className="flex items-center gap-2 py-2 font-semibold text-error hover:bg-error/10"
                    >
                      <LogOut size={18} className="text-error shrink-0" />
                      <span>Đăng xuất</span>
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <div className="divider my-1"></div>
                  <li>
                    <button
                      onClick={() => handleNavAndCloseMobile("login")}
                      className="flex items-center gap-2 py-2 font-semibold text-primary"
                    >
                      <LogIn size={18} className="text-primary shrink-0" />
                      <span>Đăng nhập</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => handleNavAndCloseMobile("logup")}
                      className="flex items-center gap-2 py-2 font-semibold text-base-content/80 hover:text-primary"
                    >
                      <Sparkles size={18} className="text-amber-500 shrink-0" />
                      <span>Đăng ký tài khoản</span>
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>

          <button
            onClick={() => onNavigate && onNavigate("home")}
            className="btn btn-ghost px-1.5 sm:px-2 normal-case flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl font-black tracking-tight shrink-0"
          >
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary text-white flex items-center justify-center font-extrabold text-sm sm:text-base shadow-sm">
              IT
            </span>
            <span className="text-base-content">Blog</span>
          </button>

          <div className="hidden lg:flex items-center gap-0.5 xl:gap-1">
            <button
              onClick={() => onNavigate && onNavigate("home")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all gap-1.5 px-2 sm:px-2.5 ${
                currentPage === "home"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              <Home size={14} className="text-sky-500 shrink-0" />
              <span>Trang chủ</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate("roadmaps")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2 sm:px-2.5 ${
                currentPage === "roadmaps"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Lộ trình
            </button>
            <button
              onClick={() => onNavigate && onNavigate("courses")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2 sm:px-2.5 ${
                currentPage === "courses"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Khóa học
            </button>
            <button
              onClick={() => onNavigate && onNavigate("quiz")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2 sm:px-2.5 ${
                currentPage === "quiz"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Trắc nghiệm
            </button>
            <button
              onClick={() => onNavigate && onNavigate("jobs")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2 sm:px-2.5 hidden xl:inline-flex ${
                currentPage === "jobs"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Việc làm
            </button>
            <button
              onClick={() => onNavigate && onNavigate("events")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2 sm:px-2.5 hidden xl:inline-flex ${
                currentPage === "events"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Sự kiện
            </button>
            <button
              onClick={() => onNavigate && onNavigate("leaderboard")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2 sm:px-2.5 hidden xl:inline-flex ${
                currentPage === "leaderboard"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Xếp hạng
            </button>
            {canAccessModeration && (
              <button
                onClick={() => onNavigate && onNavigate("moderation")}
                className={`btn btn-sm text-xs font-semibold rounded-lg transition-all gap-1.5 px-2 sm:px-2.5 hidden xl:inline-flex ${
                  currentPage === "moderation"
                    ? "bg-primary/10 text-primary font-bold shadow-2xs"
                    : "btn-ghost text-base-content/80 hover:text-base-content"
                }`}
                title="Cài đặt & Quản trị hệ thống"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden 2xl:inline">Cài đặt hệ thống</span>
                {pendingPosts?.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-extrabold text-amber-950 bg-amber-400 rounded-full shadow-xs leading-none shrink-0">
                    {pendingPosts.length}
                  </span>
                )}
              </button>
            )}

            {/* Dropdown menu phụ khi màn hình lg (1024px-1279px) để không bao giờ bị đè nút tìm kiếm */}
            <div className="dropdown dropdown-bottom xl:hidden">
              <div
                tabIndex={0}
                role="button"
                className={`btn btn-sm text-xs font-semibold rounded-lg transition-all px-2 gap-1 ${
                  ["jobs", "events", "leaderboard", "moderation"].includes(currentPage)
                    ? "bg-primary/10 text-primary font-bold shadow-2xs"
                    : "btn-ghost text-base-content/80 hover:text-base-content"
                }`}
              >
                <span>Thêm</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
                {pendingPosts?.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                )}
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu menu-sm bg-base-100 rounded-2xl z-50 w-52 p-2 shadow-2xl border border-base-300 mt-2 space-y-1"
              >
                <li>
                  <button
                    onClick={() => onNavigate && onNavigate("jobs")}
                    className={currentPage === "jobs" ? "active text-white bg-primary font-bold" : ""}
                  >
                    <span className="flex items-center gap-2"><Briefcase size={16} className="text-sky-500 shrink-0" /> Việc làm IT</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate && onNavigate("events")}
                    className={currentPage === "events" ? "active text-white bg-primary font-bold" : ""}
                  >
                    <span className="flex items-center gap-2"><Calendar size={16} className="text-purple-500 shrink-0" /> Sự kiện & Workshop</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate && onNavigate("leaderboard")}
                    className={currentPage === "leaderboard" ? "active text-white bg-primary font-bold" : ""}
                  >
                    <span className="flex items-center gap-2"><Award size={16} className="text-amber-500 shrink-0" /> Bảng xếp hạng</span>
                  </button>
                </li>
                {canAccessModeration && (
                  <li>
                    <button
                      onClick={() => onNavigate && onNavigate("moderation")}
                      className={currentPage === "moderation" ? "active text-white bg-primary font-bold" : ""}
                    >
                      <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-rose-500 shrink-0" /> Cài đặt hệ thống</span>
                      {pendingPosts?.length > 0 && (
                        <span className="badge badge-xs bg-amber-400 text-amber-950 font-bold ml-auto">
                          {pendingPosts.length}
                        </span>
                      )}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="relative flex-1 max-w-xs xl:max-w-sm min-w-[160px] mx-2 transition-all duration-200 hidden sm:block">
          <div className="relative w-full">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Tìm kiếm bài viết, công nghệ..."
              className="input input-sm input-bordered w-full pl-9 pr-14 bg-base-200/60 hover:bg-base-200 focus:bg-base-100 transition-all rounded-full text-xs shadow-2xs"
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

          {/* Gợi ý Tìm kiếm & Lịch sử truy vấn gần đây - Rộng rãi và không bao giờ bị bóp méo */}
          {searchFocused && (
            <div
              className="absolute right-0 sm:left-0 top-full mt-2 w-80 sm:w-96 min-w-[320px] max-w-[95vw] bg-base-100 rounded-2xl border border-base-300 shadow-2xl p-4 z-50 animate-fade-in text-xs space-y-3.5"
              onMouseDown={(e) => e.preventDefault()}
            >
              {/* Lịch sử tìm kiếm gần đây */}
              {searchHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-base-content/60 mb-2 px-1">
                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-base-content/60" /> Lịch sử tìm kiếm</span>
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
                  <span className="flex items-center gap-1.5"><Flame size={14} className="text-rose-500 shrink-0" /> Chủ đề & Công nghệ thịnh hành</span>
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

          {/* Nút Viết bài & Menu Tạo Mới Phân Quyền: Admin có đầy đủ các quyền, người dùng thường chỉ viết bài */}
          {isAdmin ? (
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-sm btn-primary text-white rounded-lg flex items-center gap-1.5 shadow-sm font-semibold px-2 sm:px-3 cursor-pointer"
                title="Khởi tạo nội dung quản trị (Admin): Viết bài, Khóa học, Trắc nghiệm, Việc làm, Lộ trình, Sự kiện"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Tạo mới</span>
                <span className="badge badge-xs bg-amber-400 text-amber-950 font-black">Admin</span>
                <svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu z-50 p-2 shadow-2xl bg-base-100 rounded-2xl w-64 border border-base-300 text-xs font-medium space-y-1 mt-1"
              >
                <li className="menu-title px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-base-content/60">
                  <span>Bài viết cộng đồng</span>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      requireAuth(
                        () => onNavigate && onNavigate("create_post"),
                        "Vui lòng đăng nhập để viết bài mới!"
                      );
                    }}
                    className="flex items-center gap-2.5 py-2 font-semibold text-primary hover:bg-primary/10 rounded-xl cursor-pointer"
                  >
                    <PenTool size={18} className="text-primary shrink-0" />
                    <div>
                      <p className="font-bold">Viết bài mới</p>
                      <p className="text-[10px] text-base-content/60 font-normal">Soạn thảo bài viết & chia sẻ kiến thức IT</p>
                    </div>
                  </button>
                </li>
                <div className="divider my-0.5"></div>
                <li className="menu-title px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center justify-between">
                  <span>Quyền Quản trị viên</span>
                  <span className="badge badge-xs badge-warning text-amber-950 font-bold">Admin Only</span>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate("courses", { action: "create" })}
                    className="flex items-center gap-2.5 py-2 hover:bg-base-200 rounded-xl cursor-pointer"
                  >
                    <GraduationCap size={18} className="text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-bold text-base-content">Tạo khóa học mới</p>
                      <p className="text-[10px] text-base-content/60 font-normal">Biên soạn chuỗi bài giảng công nghệ</p>
                    </div>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate("quiz", { action: "create" })}
                    className="flex items-center gap-2.5 py-2 hover:bg-base-200 rounded-xl cursor-pointer"
                  >
                    <HelpCircle size={18} className="text-amber-500 shrink-0" />
                    <div>
                      <p className="font-bold text-base-content">Thêm bài trắc nghiệm</p>
                      <p className="text-[10px] text-base-content/60 font-normal">Tạo câu hỏi trắc nghiệm hoặc tạo đề AI</p>
                    </div>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate("jobs", { action: "create" })}
                    className="flex items-center gap-2.5 py-2 hover:bg-base-200 rounded-xl cursor-pointer"
                  >
                    <Briefcase size={18} className="text-sky-500 shrink-0" />
                    <div>
                      <p className="font-bold text-base-content">Đăng tin tuyển dụng</p>
                      <p className="text-[10px] text-base-content/60 font-normal">Tìm kiếm ứng viên kỹ sư IT</p>
                    </div>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate("roadmaps", { action: "create" })}
                    className="flex items-center gap-2.5 py-2 hover:bg-base-200 rounded-xl cursor-pointer"
                  >
                    <Milestone size={18} className="text-indigo-500 shrink-0" />
                    <div>
                      <p className="font-bold text-base-content">Tạo lộ trình học tập</p>
                      <p className="text-[10px] text-base-content/60 font-normal">Xây dựng roadmap kỹ năng cho lập trình viên</p>
                    </div>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate("events", { action: "create" })}
                    className="flex items-center gap-2.5 py-2 hover:bg-base-200 rounded-xl cursor-pointer"
                  >
                    <Calendar size={18} className="text-purple-500 shrink-0" />
                    <div>
                      <p className="font-bold text-base-content">Tổ chức sự kiện</p>
                      <p className="text-[10px] text-base-content/60 font-normal">Webinar, workshop & meetup công nghệ</p>
                    </div>
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            /* Người dùng thông thường hoặc chưa đăng nhập: Nút Viết bài trực tiếp */
            <button
              type="button"
              onClick={handleCreatePost}
              className="btn btn-sm btn-primary text-white rounded-lg flex items-center gap-1.5 shadow-sm font-semibold px-2 sm:px-3 cursor-pointer"
              title="Viết bài mới"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Viết bài</span>
            </button>
          )}

          {/* Nút Phím tắt bàn phím */}
          <button
            type="button"
            onClick={() => setShortcutsModalOpen(true)}
            className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-base-content"
            aria-label="Phím tắt hệ thống"
            title="Phím tắt hệ thống (Nhấn ? hoặc Ctrl+K)"
          >
            <Keyboard size={16} className="text-base-content/75 hover:text-primary transition-colors" />
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
                  <Bell size={18} />
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
                        <span className="font-bold text-xs text-base-content flex items-center gap-1.5"><Bell size={14} className="text-primary shrink-0" /> Thông báo của bạn</span>
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
                        <div className="text-center py-6 text-xs text-base-content/60">
                          <EmptyNotificationsIllustration size={80} className="mb-2" />
                          <p className="font-bold text-base-content">Bạn chưa có thông báo nào mới</p>
                          <p className="text-[11px] text-base-content/50 mt-0.5">Tương tác và theo dõi để nhận tin tức mới.</p>
                        </div>
                      ) : notifFilter === "unread" && notifications.filter((n) => !n.is_read).length === 0 ? (
                        <div className="text-center py-6 text-xs text-base-content/60">
                          <EmptyNotificationsIllustration size={80} className="mb-2" />
                          <p className="font-bold text-success">Bạn đã đọc hết mọi thông báo 🎉</p>
                          <p className="text-[11px] text-base-content/50 mt-0.5">Không còn thông báo nào chưa đọc.</p>
                        </div>
                      ) : (
                        (notifFilter === "unread" ? notifications.filter((n) => !n.is_read) : notifications).map((notif) => {
                          const meta = getNotificationVisual(notif.type);
                          const timeStr = notif.created_at && !isNaN(new Date(notif.created_at).getTime())
                            ? new Date(notif.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                            : "Vừa xong";

                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3 rounded-2xl text-xs cursor-pointer transition-all duration-200 border group flex items-start gap-3 ${
                                notif.is_read
                                  ? "bg-base-200/40 border-transparent hover:bg-base-200/80 text-base-content/75"
                                  : "bg-primary/5 border-primary/25 hover:bg-primary/10 text-base-content shadow-xs font-medium"
                              }`}
                            >
                              {/* Icon huy hieu mau sac sinh dong */}
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs mt-0.5 transition-transform group-hover:scale-110 ${meta.bg}`}>
                                {meta.icon}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5 mb-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-bold text-xs truncate text-base-content group-hover:text-primary transition-colors">
                                      {notif.title || meta.defaultTitle}
                                    </span>
                                    {!notif.is_read && (
                                      <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-primary/30 shrink-0 inline-block animate-pulse"></span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-base-content/50 shrink-0 font-medium">
                                    {timeStr}
                                  </span>
                                </div>

                                <p className="text-xs text-base-content/75 line-clamp-2 leading-relaxed">
                                  {notif.message || notif.content}
                                </p>

                                <div className="flex items-center justify-between mt-2 pt-1 border-t border-base-200/60 text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span>Xem chi tiết bài viết →</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Notification Popover Footer: Clear All & Export Markdown */}
                    <div className="pt-2 border-t border-base-200 flex items-center justify-between text-[11px]">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={handleExportNotificationsMd}
                        disabled={notifications.length === 0}
                        className="btn btn-ghost btn-xs text-primary font-bold hover:underline gap-1 p-1 h-auto min-h-0 disabled:opacity-40"
                        title="Xuất toàn bộ nhật ký thông báo ra định dạng Markdown (.md)"
                      >
                        <Share2 size={13} className="shrink-0 text-primary" />
                        <span>Xuất nhật ký (.md)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleClearAllNotifications}
                        disabled={notifications.length === 0}
                        className="btn btn-ghost btn-xs text-error font-semibold hover:underline gap-1 p-1 h-auto min-h-0 disabled:opacity-40"
                        title="Dọn dẹp sạch toàn bộ danh sách thông báo"
                      >
                        <Trash2 size={13} className="shrink-0 text-error" />
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

                {canAccessModeration && (
                  <li>
                    <button
                      onClick={() => handleNavAndCloseMobile("moderation")}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <span>Cài đặt hệ thống</span>
                      </div>
                      {pendingPosts?.length > 0 && (
                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-extrabold text-amber-950 bg-amber-400 rounded-full shadow-xs leading-none shrink-0">
                          {pendingPosts.length}
                        </span>
                      )}
                    </button>
                  </li>
                )}

                <li>
                  <button
                    onClick={() => handleNavAndCloseMobile("leaderboard")}
                    className="flex items-center gap-2 py-2"
                  >
                    <Award size={16} className="text-amber-500 shrink-0" />
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
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="dropdown dropdown-end">
                <button
                  tabIndex={0}
                  type="button"
                  className="btn btn-xs sm:btn-sm btn-outline btn-warning font-bold flex items-center gap-1 rounded-xl"
                  title="Trải nghiệm nhanh các vai trò Demo"
                >
                  <Sparkles size={14} className="text-amber-500 shrink-0" /> <span>Demo</span>
                </button>
                <div tabIndex={0} className="dropdown-content z-50 menu p-2 shadow-2xl bg-base-100 rounded-2xl border border-base-300 w-56 text-xs space-y-1 mt-1">
                  <p className="font-bold text-[11px] text-base-content/60 px-2 py-1">Chọn vai trò trải nghiệm:</p>
                  <button
                    type="button"
                    onClick={() => loginDemo("admin")}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors text-left w-full cursor-pointer"
                  >
                    <div>
                      <span className="font-bold flex items-center gap-1.5 text-primary"><ShieldCheck size={14} className="text-primary shrink-0" /> Quản trị viên (Admin)</span>
                      <span className="text-[10px] text-base-content/60">Toàn quyền, xóa feed, xuất md</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => loginDemo("moderator")}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-secondary/10 hover:text-secondary transition-colors text-left w-full cursor-pointer"
                  >
                    <div>
                      <span className="font-bold flex items-center gap-1.5 text-secondary"><ShieldCheck size={14} className="text-secondary shrink-0" /> Kiểm duyệt viên (Mod)</span>
                      <span className="text-[10px] text-base-content/60">Duyệt bài, xóa feed, không xuất md</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => loginDemo("user")}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-base-200 transition-colors text-left w-full cursor-pointer"
                  >
                    <div>
                      <span className="font-bold flex items-center gap-1.5 text-base-content"><User size={14} className="text-base-content/80 shrink-0" /> Thành viên (User)</span>
                      <span className="text-[10px] text-base-content/60">Đọc, viết bài, like & lưu</span>
                    </div>
                  </button>
                </div>
              </div>
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
                  <span className="flex items-center gap-1.5"><Clock size={12} className="text-base-content/60" /> Lịch sử tìm kiếm</span>
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
                <span className="flex items-center gap-1 text-amber-500 font-bold"><Flame size={12} className="shrink-0" /> Công nghệ hot</span>
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
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="text-xl shrink-0">⌨️</span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-base-content !my-0 break-words">
                    Phím Tắt Bàn Phím Toàn Hệ Thống
                  </h3>
                  <p className="text-xs text-base-content/60 mt-0.5 break-words">
                    Thao tác nhanh trên IT Blog bằng các tổ hợp phím tắt chuẩn Developer.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShortcutsModalOpen(false)}
                className="btn btn-sm btn-circle btn-ghost shrink-0"
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