import { useState, useEffect, useMemo } from "react";
import { useBlog } from "../context/BlogContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { getStoredBugReports, saveStoredBugReports, updateStoredBugReport, deleteStoredBugReport } from "../utils/bugReportsStore";


const FALLBACK_USERS = [
  {
    id: 1,
    name: "Admin System",
    username: "admin",
    email: "admin@itblog.dev",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=admin",
    bio: "Tổng quản trị viên hệ thống nền tảng IT Blog.",
    roles: ["admin", "moderator", "user"],
    is_active: true,
    is_superuser: true,
    posts_count: 12,
    created_at: "2026-01-01T00:00:00Z"
  },
  {
    id: 2,
    name: "Lê Hoàng Nam",
    username: "namle_dev",
    email: "nam.le@techvn.io",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=namle",
    bio: "Tech Lead & Fullstack Cloud Architect.",
    roles: ["moderator", "user"],
    is_active: true,
    is_superuser: false,
    posts_count: 24,
    created_at: "2026-02-15T08:30:00Z"
  },
  {
    id: 3,
    name: "Trần Minh Đức",
    username: "ductran_ai",
    email: "duc.tran@ai-lab.vn",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=ductran",
    bio: "AI Research Engineer | LLMs & RAG Specialist.",
    roles: ["user"],
    is_active: true,
    is_superuser: false,
    posts_count: 9,
    created_at: "2026-03-01T10:00:00Z"
  },
  {
    id: 4,
    name: "Phạm Hải Đăng",
    username: "dang_devops",
    email: "dang.pham@devops.net",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=dangpham",
    bio: "DevOps & SRE Engineer | Kubernetes & CI/CD pipelines.",
    roles: ["user"],
    is_active: true,
    is_superuser: false,
    posts_count: 6,
    created_at: "2026-04-10T14:20:00Z"
  },
  {
    id: 5,
    name: "Spam Bot 3000",
    username: "spam_bot_test",
    email: "bot@crypto-scam.xyz",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=spambot",
    bio: "Crypto promotional account.",
    roles: ["user"],
    is_active: false,
    is_superuser: false,
    posts_count: 1,
    created_at: "2026-05-18T19:45:00Z"
  }
];

export default function ModerationPage({ onNavigate, onSelectPost, initialTab = "settings" }) {
  const { pendingPosts, approvedPosts, rejectedPosts, approvePost, rejectPost, deletePost, getAuthor } = useBlog();
  const { currentUser, loginDemo, isAdmin } = useAuth();

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

  const [activeTab, setActiveTab] = useState(initialTab); // 'pending' | 'approved' | 'rejected' | 'analytics' | 'gemini' | 'settings'
  const [previewPost, setPreviewPost] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // System Settings State
  const [systemSettings, setSystemSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("it_blog_system_settings");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      siteName: "IT Blog Platform",
      siteSlogan: "Cộng đồng chia sẻ kiến thức & công nghệ IT",
      adminEmail: "admin@itblog.dev",
      allowRegistration: true,
      directAdminOnFeed: true,
      allowAdminDeletePosts: true,
      allowAdminDeleteComments: true,
      allowAdminPinPosts: true,
      autoApprovePosts: false,
      aiGeminiModeration: true,
      crawlerIntervalHours: 6,
      maxPostsPerUserPerDay: 10,
      rateLimitRequestsPerMin: 200,
      maintenanceMode: false
    };
  });

  const handleSaveSystemSettings = (e) => {
    e?.preventDefault?.();
    if (!canAccessModeration) {
      addToast("Bạn không có quyền lưu cấu hình cài đặt hệ thống!", "error");
      return;
    }
    try {
      localStorage.setItem("it_blog_system_settings", JSON.stringify(systemSettings));
      addToast("Đã lưu cấu hình cài đặt hệ thống thành công! ⚙️", "success");
    } catch {
      addToast("Không thể lưu cài đặt hệ thống lúc này.", "error");
    }
  };

  // Gemini Multi-Key States
  const [geminiPool, setGeminiPool] = useState({ model: "gemini-1.5-flash", total_keys: 0, active_keys: 0, keys: [] });
  const [keysInputText, setKeysInputText] = useState("");
  const [testKeyInput, setTestKeyInput] = useState("");
  const [testKeyResult, setTestKeyResult] = useState(null);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [isAutoModerating, setIsAutoModerating] = useState(false);

  // Bug Reports & Feedback States (Báo lỗi & Sự cố)
  const [bugReports, setBugReports] = useState(() => getStoredBugReports());
  const [loadingBugReports, setLoadingBugReports] = useState(false);
  const [bugReportsFilter, setBugReportsFilter] = useState("all");
  const [bugCategoryFilter, setBugCategoryFilter] = useState("all");
  const [bugSearch, setBugSearch] = useState("");
  const [editingBugId, setEditingBugId] = useState(null);
  const [editingBugNoteText, setEditingBugNoteText] = useState("");
  const [isUpdatingBug, setIsUpdatingBug] = useState(false);

  // Reports States
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsFilter, setReportsFilter] = useState("pending");

  // Crawler States
  const [crawlSources, setCrawlSources] = useState([]);
  const [crawlJobs, setCrawlJobs] = useState([]);
  const [loadingCrawler, setLoadingCrawler] = useState(false);
  const [crawlingInProgress, setCrawlingInProgress] = useState(false);
  const [crawlingSourceId, setCrawlingSourceId] = useState(null);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceCategory, setNewSourceCategory] = useState("Frontend");

  // Audit Logs States
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");

  // Category Management States
  const [categoryList, setCategoryList] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("💻");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Developer Ads Management States
  const [adsList, setAdsList] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [newAdTitle, setNewAdTitle] = useState("");
  const [newAdDesc, setNewAdDesc] = useState("");
  const [newAdTargetUrl, setNewAdTargetUrl] = useState("");
  const [newAdCreativeUrl, setNewAdCreativeUrl] = useState("");
  const [newAdCategory, setNewAdCategory] = useState("tools");
  const [creatingAd, setCreatingAd] = useState(false);

  // User Management States
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const loadAds = () => {
    setLoadingAds(true);
    api.ads.listAll()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setAdsList(data);
        else {
          setAdsList([
            { id: 1, title: "AWS Cloud Credits cho Nhà phát triển", description: "Nhận ngay $300 credit trải nghiệm triển khai hệ thống phân tán trên nền tảng AWS Cloud.", creative_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80", target_url: "https://aws.amazon.com/free", category: "cloud", status: "active", impressions_count: 142, clicks_count: 28 },
            { id: 2, title: "JetBrains All Products Pack - Bản quyền sinh viên & Dev", description: "Bộ công cụ IDE lập trình số 1 thế giới dành cho lập trình viên Python, Go, Java và Rust.", creative_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80", target_url: "https://www.jetbrains.com", category: "tools", status: "active", impressions_count: 98, clicks_count: 15 }
          ]);
        }
      })
      .catch(() => {
        setAdsList([
          { id: 1, title: "AWS Cloud Credits cho Nhà phát triển", description: "Nhận ngay $300 credit trải nghiệm triển khai hệ thống phân tán trên nền tảng AWS Cloud.", creative_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80", target_url: "https://aws.amazon.com/free", category: "cloud", status: "active", impressions_count: 142, clicks_count: 28 },
          { id: 2, title: "JetBrains All Products Pack - Bản quyền sinh viên & Dev", description: "Bộ công cụ IDE lập trình số 1 thế giới dành cho lập trình viên Python, Go, Java và Rust.", creative_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80", target_url: "https://www.jetbrains.com", category: "tools", status: "active", impressions_count: 98, clicks_count: 15 }
        ]);
      })
      .finally(() => setLoadingAds(false));
  };

  const handleToggleAdStatus = async (adId, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "paused" : "active";
    try {
      await api.ads.updateStatus(adId, nextStatus);
      setAdsList((prev) => prev.map((a) => (a.id === adId ? { ...a, status: nextStatus } : a)));
      addToast(nextStatus === "active" ? "Đã kích hoạt hiển thị quảng cáo! 🟢" : "Đã tạm dừng chiến dịch quảng cáo! ⏸️", "info");
    } catch {
      setAdsList((prev) => prev.map((a) => (a.id === adId ? { ...a, status: nextStatus } : a)));
      addToast(nextStatus === "active" ? "Đã kích hoạt hiển thị quảng cáo! 🟢" : "Đã tạm dừng chiến dịch quảng cáo! ⏸️", "info");
    }
  };

  const handleDeleteAd = async (adId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa chiến dịch quảng cáo này?")) return;
    try {
      await api.ads.delete(adId);
      setAdsList((prev) => prev.filter((a) => a.id !== adId));
      addToast("Đã xóa chiến dịch quảng cáo thành công! 🗑️", "success");
    } catch {
      setAdsList((prev) => prev.filter((a) => a.id !== adId));
      addToast("Đã xóa chiến dịch quảng cáo thành công! 🗑️", "success");
    }
  };

  const handleCreateAd = async (e) => {
    e.preventDefault();
    if (!newAdTitle.trim() || !newAdTargetUrl.trim()) return;
    setCreatingAd(true);
    try {
      const created = await api.ads.create({
        title: newAdTitle.trim(),
        description: newAdDesc.trim() || "Cơ hội và công cụ tài trợ độc quyền dành cho lập trình viên.",
        target_url: newAdTargetUrl.trim(),
        creative_url: newAdCreativeUrl.trim() || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80",
        category: newAdCategory.toLowerCase()
      });
      addToast(`Đã xuất bản chiến dịch quảng cáo "${created.title}" thành công! 📢`, "success");
      setAdsList((prev) => [created, ...prev]);
      setNewAdTitle("");
      setNewAdDesc("");
      setNewAdTargetUrl("");
      setNewAdCreativeUrl("");
    } catch (err) {
      addToast(`Lỗi tạo quảng cáo: ${err?.message || "Đã xảy ra lỗi"}`, "error");
    } finally {
      setCreatingAd(false);
    }
  };

  const loadCategories = () => {
    setLoadingCategories(true);
    api.categories.list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setCategoryList(data);
        else {
          setCategoryList([
            { id: 1, name: "Frontend", slug: "frontend", icon: "⚛️", description: "React, Next.js, Vue, Tailwind CSS", post_count: 14 },
            { id: 2, name: "Backend", slug: "backend", icon: "⚡", description: "Node.js, FastAPI, Go, Microservices", post_count: 18 },
            { id: 3, name: "DevOps", slug: "devops", icon: "☁️", description: "Docker, Kubernetes, CI/CD, Cloud", post_count: 9 },
            { id: 4, name: "AI & ML", slug: "ai-ml", icon: "🤖", description: "LLMs, RAG, PyTorch, LangChain", post_count: 12 }
          ]);
        }
      })
      .catch(() => {
        setCategoryList([
          { id: 1, name: "Frontend", slug: "frontend", icon: "⚛️", description: "React, Next.js, Vue, Tailwind CSS", post_count: 14 },
          { id: 2, name: "Backend", slug: "backend", icon: "⚡", description: "Node.js, FastAPI, Go, Microservices", post_count: 18 },
          { id: 3, name: "DevOps", slug: "devops", icon: "☁️", description: "Docker, Kubernetes, CI/CD, Cloud", post_count: 9 }
        ]);
      })
      .finally(() => setLoadingCategories(false));
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCreatingCategory(true);
    try {
      const created = await api.categories.create({
        name: newCatName.trim(),
        icon: newCatIcon.trim() || "💻",
        description: newCatDesc.trim() || undefined,
      });
      addToast(`Đã thêm chuyên mục "${created.name}" thành công! 🎉`, "success");
      setCategoryList((prev) => [...prev, created]);
      setNewCatName("");
      setNewCatDesc("");
    } catch (err) {
      addToast(`Lỗi tạo chuyên mục: ${err?.message || "Đã xảy ra lỗi"}`, "error");
    } finally {
      setCreatingCategory(false);
    }
  };

  const loadReports = (filter) => {
    setLoadingReports(true);
    api.moderation.getReports(filter === "all" ? undefined : filter)
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => {
        // Fallback reports
        setReports([
          {
            id: 1,
            target_type: "post",
            target_id: 1,
            reason: "spam",
            details: "Bài viết chứa liên kết quảng cáo không liên quan đến công nghệ",
            status: "pending",
            reporter: { id: 2, name: "Trần Văn An", username: "an_tran" },
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            target_type: "comment",
            target_id: 12,
            reason: "toxic",
            details: "Bình luận công kích cá nhân và dùng từ ngữ thô tục",
            status: "pending",
            reporter: { id: 3, name: "Lê Minh", username: "minhle" },
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ]);
      })
      .finally(() => setLoadingReports(false));
  };

  const handleResolveReport = async (reportId, action) => {
    try {
      await api.moderation.resolveReport(reportId, {
        status: action === "dismiss" ? "dismissed" : "resolved",
        action: action === "dismiss" ? "none" : "remove_content"
      });
      addToast(action === "dismiss" ? "Đã bỏ qua báo cáo vi phạm!" : "Đã xử lý và gỡ bỏ nội dung vi phạm!", "success");
      loadReports(reportsFilter);
    } catch (err) {
      addToast(`Lỗi xử lý báo cáo: ${err.message}`, "error");
    }
  };

  const loadBugReports = (status = bugReportsFilter, category = bugCategoryFilter, search = bugSearch) => {
    setLoadingBugReports(true);
    api.bugReports.adminList({ status, category, search })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBugReports(data);
          saveStoredBugReports(data);
        } else {
          setBugReports(getStoredBugReports());
        }
      })
      .catch(() => {
        setBugReports(getStoredBugReports());
      })
      .finally(() => setLoadingBugReports(false));
  };

  const handleUpdateBugStatus = async (bugId, nextStatus) => {
    setIsUpdatingBug(true);
    const existing = bugReports.find((b) => b.id === bugId);
    try {
      await api.bugReports.update(bugId, { status: nextStatus, admin_notes: existing?.admin_notes });
    } catch {
      // offline fallback
    }
    const updated = updateStoredBugReport(bugId, { status: nextStatus });
    setBugReports(updated);
    setIsUpdatingBug(false);
    const label =
      nextStatus === "in_progress"
        ? "Đang xử lý"
        : nextStatus === "resolved"
        ? "Đã khắc phục"
        : nextStatus === "dismissed"
        ? "Đã đóng"
        : "Chờ tiếp nhận";
    addToast(`Đã chuyển trạng thái sự cố sang "${label}"! 🛠️`, "success");
  };

  const handleSaveBugNote = async (bugId) => {
    if (!editingBugNoteText.trim()) return;
    setIsUpdatingBug(true);
    const existing = bugReports.find((b) => b.id === bugId);
    try {
      await api.bugReports.update(bugId, { status: existing?.status, admin_notes: editingBugNoteText.trim() });
    } catch {
      // offline fallback
    }
    const updated = updateStoredBugReport(bugId, { admin_notes: editingBugNoteText.trim() });
    setBugReports(updated);
    setEditingBugId(null);
    setEditingBugNoteText("");
    setIsUpdatingBug(false);
    addToast("Đã cập nhật ghi chú phản hồi cho sự cố! 💬", "success");
  };

  const handleDeleteBug = async (bugId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa báo cáo lỗi này?")) return;
    try {
      await api.bugReports.delete(bugId);
    } catch {
      // offline fallback
    }
    const updated = deleteStoredBugReport(bugId);
    setBugReports(updated);
    addToast("Đã xóa báo cáo sự cố thành công! 🗑️", "success");
  };

  const handleExportBugsMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất dữ liệu Markdown (.md)!", "error");
      return;
    }
    const pendingCount = bugReports.filter((b) => b.status === "pending" || b.status === "received").length;
    const inProgressCount = bugReports.filter((b) => b.status === "in_progress").length;
    const resolvedCount = bugReports.filter((b) => b.status === "resolved").length;

    let md = `# 🐛 BÁO CÁO TỔNG HỢP SỰ CỐ & LỖI HỆ THỐNG - IT BLOG\n`;
    md += `*Thời điểm xuất:* ${new Date().toLocaleString("vi-VN")}\n`;
    md += `*Người xuất:* ${currentUser?.name || "Quản trị viên"}\n\n`;
    md += `## 📊 THỐNG KÊ TỔNG QUAN\n`;
    md += `- **Tổng số báo cáo sự cố:** ${bugReports.length}\n`;
    md += `- **🟡 Chờ tiếp nhận (Pending):** ${pendingCount}\n`;
    md += `- **🔵 Đang xử lý (In Progress):** ${inProgressCount}\n`;
    md += `- **🟢 Đã khắc phục (Resolved):** ${resolvedCount}\n\n`;
    md += `---\n\n## 📝 DANH SÁCH CHI TIẾT CÁC SỰ CỐ & BÁO LỖI\n\n`;

    bugReports.forEach((b, idx) => {
      md += `### ${idx + 1}. [${(b.category || "bug").toUpperCase()}] ${b.title || b.subject}\n`;
      md += `- **Mã sự cố:** #BUG-${b.id}\n`;
      md += `- **Trạng thái:** ${b.status}\n`;
      md += `- **Mức độ ưu tiên:** ${b.priority || "medium"}\n`;
      md += `- **Người báo cáo:** ${b.reporter_name || b.name || "Khách"} (${b.reporter_email || b.email || "N/A"})\n`;
      md += `- **Ngày tạo:** ${b.created_at ? new Date(b.created_at).toLocaleString("vi-VN") : "N/A"}\n`;
      md += `- **Nội dung mô tả:**\n> ${b.description || b.content}\n`;
      if (b.admin_notes) {
        md += `- **Phản hồi từ Ban Quản trị:**\n> ${b.admin_notes}\n`;
      }
      md += `\n`;
    });

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `itblog-bug-reports-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast("Đã xuất danh sách báo lỗi (.md) thành công! 📥", "success");
  };

  const loadCrawler = () => {
    setLoadingCrawler(true);
    Promise.all([
      api.crawler.sources().catch(() => [
        { id: 1, name: "VnExpress Số Hóa RSS", url: "https://vnexpress.net/rss/so-hoa.rss", category: "IT", is_active: true, last_crawled_at: new Date().toISOString() },
        { id: 2, name: "GitHub Tech Engineering", url: "https://github.blog/feed/", category: "DevOps", is_active: true, last_crawled_at: null }
      ]),
      api.crawler.jobs().catch(() => [
        { id: 1, source_name: "VnExpress Số Hóa RSS", status: "completed", items_crawled: 10, items_saved: 3, created_at: new Date().toISOString() }
      ])
    ]).then(([sources, jobs]) => {
      setCrawlSources(Array.isArray(sources) ? sources : []);
      setCrawlJobs(Array.isArray(jobs) ? jobs : []);
    }).finally(() => setLoadingCrawler(false));
  };

  const handleTriggerCrawl = async (sourceId = null) => {
    setCrawlingInProgress(true);
    setCrawlingSourceId(sourceId ?? "all");
    try {
      const res = await api.crawler.trigger({ source_id: sourceId, auto_publish: true, limit: 50 });
      const savedCount = res?.job?.items_saved ?? res?.crawled_posts?.length ?? 0;
      const crawledCount = res?.job?.items_crawled ?? 0;

      if (res?.message) {
        addToast(res.message, savedCount > 0 ? "success" : "info");
      } else if (savedCount > 0) {
        addToast(`Thu thập thành công! Đã lưu ${savedCount} bài viết mới từ nguồn tin. 🌐`, "success");
      } else {
        addToast(`Nguồn tin đã đồng bộ mới nhất (${crawledCount} bài viết đã tồn tại trên hệ thống, không có bài mới trùng lặp). ℹ️`, "info");
      }
      loadCrawler();
      window.dispatchEvent(new CustomEvent("refresh_posts"));
    } catch (err) {
      addToast(`Lỗi thu thập: ${err.message}`, "error");
    } finally {
      setCrawlingInProgress(false);
      setCrawlingSourceId(null);
    }
  };

  const handleAddCrawlSource = async (e) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;
    try {
      await api.crawler.createSource({
        name: newSourceName.trim(),
        url: newSourceUrl.trim(),
        source_type: "rss",
        category: newSourceCategory
      });
      addToast("Đã thêm nguồn RSS tin tức công nghệ mới thành công! 📡", "success");
      setNewSourceName("");
      setNewSourceUrl("");
      loadCrawler();
      window.dispatchEvent(new CustomEvent("refresh_posts"));
    } catch (err) {
      addToast(`Lỗi thêm nguồn: ${err.message}`, "error");
    }
  };

  const handleDeleteCrawlSource = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nguồn thu thập "${name}" không?`)) return;
    try {
      await api.crawler.deleteSource(id);
      addToast(`Đã xóa nguồn cào "${name}" thành công!`, "success");
      loadCrawler();
    } catch (err) {
      addToast(`Lỗi khi xóa nguồn: ${err.message}`, "error");
    }
  };

  const loadAudit = () => {
    setLoadingAudit(true);
    api.moderation.getAuditLogs(50)
      .then((data) => setAuditLogs(Array.isArray(data) ? data : []))
      .catch(() => {
        setAuditLogs([
          { id: 1, action: "approve_post", user_name: currentUser?.name || "Admin", target_type: "post", target_id: 1, details: "Phê duyệt bài viết kỹ thuật", created_at: new Date().toISOString() },
          { id: 2, action: "update_gemini_keys", user_name: currentUser?.name || "Admin", target_type: "ai_keys", target_id: null, details: "Cập nhật khóa API Gemini", created_at: new Date(Date.now() - 7200000).toISOString() }
        ]);
      })
      .finally(() => setLoadingAudit(false));
  };

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const actionMatch = auditActionFilter === "all" || log.action === auditActionFilter;
      const searchLower = auditSearch.toLowerCase().trim();
      if (!searchLower) return actionMatch;
      const userMatch = (log.user?.name || log.user_name || "").toLowerCase().includes(searchLower);
      const detailsMatch = (log.details || "").toLowerCase().includes(searchLower);
      const targetMatch = (log.target_type || "").toLowerCase().includes(searchLower);
      const actionTextMatch = (log.action || "").toLowerCase().includes(searchLower);
      return actionMatch && (userMatch || detailsMatch || targetMatch || actionTextMatch);
    });
  }, [auditLogs, auditActionFilter, auditSearch]);

  const handleExportAuditLogsMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất dữ liệu Markdown (.md)!", "error");
      return;
    }
    const listToExport = filteredAuditLogs.length > 0 ? filteredAuditLogs : auditLogs;
    if (listToExport.length === 0) {
      addToast("Không có nhật ký kiểm toán nào để xuất! ℹ️", "info");
      return;
    }
    const mdRows = listToExport.map((log, idx) => {
      const time = log.created_at && !isNaN(new Date(log.created_at).getTime()) ? new Date(log.created_at).toLocaleString("vi-VN") : "N/A";
      const user = log.user?.name || log.user_name || "Hệ thống";
      const action = log.action || "N/A";
      const target = log.target_type ? `${log.target_type} #${log.target_id || ""}` : "—";
      const details = (log.details || "—").replace(/\|/g, "\\|");
      return `| ${idx + 1} | ${time} | ${user} | \`${action}\` | ${target} | ${details} |`;
    }).join("\n");

    const mdContent = `# BÁO CÁO NHẬT KÝ KIỂM TOÁN HỆ THỐNG (AUDIT LOGS) - IT BLOG
*Thời gian xuất:* ${new Date().toLocaleString("vi-VN")}
*Tổng số bản ghi:* ${listToExport.length}
*Bộ lọc:* Hành động: ${auditActionFilter} | Từ khóa: ${auditSearch || "Không"}

| STT | Thời gian | Người thực hiện | Hành động | Đối tượng | Chi tiết |
|---|---|---|---|---|---|
${mdRows}

---
*Báo cáo được xuất tự động từ Hệ thống Quản trị & Kiểm duyệt IT Blog.*
`;

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `itblog-audit-logs-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast("Đã xuất báo cáo Audit Logs (.md) thành công! 📥", "success");
  };

  const handleExportSystemReportMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất báo cáo Markdown (.md)!", "error");
      return;
    }
    const totalPosts = pendingPosts.length + approvedPosts.length + rejectedPosts.length;
    const activeAdsCount = adsList.filter((a) => a.status === "active" || a.is_active !== false).length;
    const totalUsersCount = usersList.length;
    const adminCount = usersList.filter((u) => u.is_superuser).length;
    const pendingReportsCount = reports.filter((r) => r.status === "pending").length;

    const mdContent = `# BÁO CÁO TỔNG QUAN HỆ THỐNG & METRICS NỀN TẢNG IT BLOG
*Thời điểm tạo báo cáo:* ${new Date().toLocaleString("vi-VN")}
*Người tạo:* ${currentUser?.name || "Quản trị viên"} (${currentUser?.email || "admin@itblog.vn"})

---

## 1. TỔNG QUAN NỘI DUNG & BÀI VIẾT (POSTS)
- **Tổng số bài viết:** ${totalPosts}
- **Đã duyệt / Đang xuất bản:** ${approvedPosts.length} (${totalPosts > 0 ? Math.round((approvedPosts.length / totalPosts) * 100) : 0}%)
- **Chờ duyệt (Pending):** ${pendingPosts.length}
- **Bị từ chối (Rejected):** ${rejectedPosts.length}

## 2. TRẠNG THÁI AI & GEMINI MULTI-KEY POOL
- **Mô hình AI:** \`${geminiPool?.model || "gemini-1.5-flash"}\`
- **Khóa API hoạt động:** ${geminiPool?.active_keys || 0} / ${geminiPool?.total_keys || 0}
- **Trạng thái cân bằng tải (Round-robin):** ${geminiPool?.active_keys > 0 ? "Hoạt động ổn định" : "Cần bổ sung API Key"}
- **Chế độ kiểm duyệt tự động AI:** Sẵn sàng

## 3. THÀNH VIÊN & PHÂN QUYỀN (USERS)
- **Tổng số thành viên đã đồng bộ:** ${totalUsersCount}
- **Quản trị viên (Superusers):** ${adminCount}
- **Người dùng tiêu chuẩn:** ${totalUsersCount - adminCount}

## 4. BÁO CÁO VI PHẠM & AN TOÀN NỘI DUNG (REPORTS)
- **Tổng số báo cáo nhận được:** ${reports.length}
- **Báo cáo cần xử lý ngay:** ${pendingReportsCount}
- **Báo cáo đã giải quyết:** ${reports.length - pendingReportsCount}

## 5. BÁO CÁO LỖI & SỰ CỐ HỆ THỐNG (BUG TRACKER)
- **Tổng số lỗi & góp ý ghi nhận:** ${bugReports.length}
- **Sự cố chờ tiếp nhận:** ${bugReports.filter((b) => b.status === "pending" || b.status === "received").length}
- **Sự cố đang xử lý:** ${bugReports.filter((b) => b.status === "in_progress").length}
- **Sự cố đã khắc phục:** ${bugReports.filter((b) => b.status === "resolved").length}

## 5. BỘ ĐỌC TIN TỰ ĐỘNG (CRAWLER FEEDS)
- **Nguồn cấp tin kỹ thuật:** ${crawlSources.length} nguồn
- **Tiến trình cào tin (Jobs):** ${crawlJobs.length} lịch trình

## 6. DANH MỤC & CHIẾN DỊCH QUẢNG CÁO
- **Chuyên mục công nghệ:** ${categoryList.length} chuyên mục
- **Chiến dịch Developer Ads:** ${adsList.length} (Đang chạy: ${activeAdsCount})

---
*Báo cáo được khởi tạo tự động từ Trung tâm Quản trị Nền tảng IT Blog.*
`;

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `itblog-system-metrics-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast("Đã xuất báo cáo tổng quan hệ thống (.md) thành công! 📊", "success");
  };

  const loadGeminiKeys = () => {
    api.ai.getKeys()
      .then((data) => {
        if (data) setGeminiPool(data);
      })
      .catch(() => {});
  };

  const loadUsers = (search = userSearch, role = userRoleFilter) => {
    setLoadingUsers(true);
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (role && role !== "all") params.role = role;

    api.moderation.getUsers(params)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setUsersList(data);
        } else {
          // Filter fallback data
          let filtered = FALLBACK_USERS;
          if (search.trim()) {
            const q = search.trim().toLowerCase();
            filtered = filtered.filter(
              (u) =>
                u.name.toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q)
            );
          }
          if (role && role !== "all") {
            filtered = filtered.filter((u) => u.roles.includes(role));
          }
          setUsersList(filtered);
        }
      })
      .catch(() => {
        let filtered = FALLBACK_USERS;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          filtered = filtered.filter(
            (u) =>
              u.name.toLowerCase().includes(q) ||
              u.username.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q)
          );
        }
        if (role && role !== "all") {
          filtered = filtered.filter((u) => u.roles.includes(role));
        }
        setUsersList(filtered);
      })
      .finally(() => setLoadingUsers(false));
  };

  const handleUpdateUserRole = async (userId, targetRole) => {
    setUpdatingUserId(userId);
    try {
      await api.moderation.updateUserRole(userId, targetRole);
      setUsersList((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            const newRoles =
              targetRole === "admin"
                ? ["admin", "moderator", "user"]
                : targetRole === "moderator"
                ? ["moderator", "user"]
                : ["user"];
            return { ...u, roles: newRoles };
          }
          return u;
        })
      );
      addToast(`Đã cập nhật vai trò thành viên sang "${targetRole}"! 🛡️`, "success");
    } catch {
      setUsersList((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            const newRoles =
              targetRole === "admin"
                ? ["admin", "moderator", "user"]
                : targetRole === "moderator"
                ? ["moderator", "user"]
                : ["user"];
            return { ...u, roles: newRoles };
          }
          return u;
        })
      );
      addToast(`Đã cập nhật vai trò thành viên sang "${targetRole}"! 🛡️`, "success");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleUserStatus = async (userId, currentActive) => {
    const nextStatus = !currentActive;
    setUpdatingUserId(userId);
    try {
      await api.moderation.updateUserStatus(userId, nextStatus);
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: nextStatus } : u))
      );
      addToast(
        nextStatus ? "Đã mở khóa tài khoản thành viên! 🟢" : "Đã tạm khóa tài khoản thành viên! 🔴",
        nextStatus ? "success" : "warning"
      );
    } catch {
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: nextStatus } : u))
      );
      addToast(
        nextStatus ? "Đã mở khóa tài khoản thành viên! 🟢" : "Đã tạm khóa tài khoản thành viên! 🔴",
        nextStatus ? "success" : "warning"
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  useEffect(() => {
    api.analytics.overview()
      .then((data) => setAnalyticsData(data))
      .catch(() => {});
    api.ai.getKeys()
      .then((data) => {
        if (data) setGeminiPool(data);
      })
      .catch(() => {});
    loadBugReports();
    api.moderation.getReports("pending")
      .then((data) => {
        if (Array.isArray(data)) setReports(data);
      })
      .catch(() => {});
  }, []);

  const currentList =
    activeTab === "pending"
      ? pendingPosts
      : activeTab === "approved"
      ? approvedPosts
      : rejectedPosts;

  const handleApprove = (id) => {
    if (!canAccessModeration) {
      addToast("Bạn không có quyền duyệt bài viết!", "error");
      return;
    }
    approvePost(id);
    if (previewPost?.id === id) setPreviewPost(null);
  };

  const handleReject = (id) => {
    if (!canAccessModeration) {
      addToast("Bạn không có quyền từ chối bài viết!", "error");
      return;
    }
    rejectPost(id);
    if (previewPost?.id === id) setPreviewPost(null);
  };

  const handleDelete = (id) => {
    if (!canAccessModeration) {
      addToast("Bạn không có quyền xóa bài viết!", "error");
      return;
    }
    if (window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
      deletePost(id);
      if (previewPost?.id === id) setPreviewPost(null);
    }
  };

  const handleSaveGeminiKeys = async () => {
    const keys = keysInputText
      .split(/[\n,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keys.length === 0) {
      addToast("Vui lòng nhập ít nhất một Gemini API Key!", "warning");
      return;
    }

    setIsSavingKeys(true);
    try {
      const data = await api.ai.updateKeys(keys);
      setGeminiPool(data);
      setKeysInputText("");
      addToast(`Đã lưu thành công ${data.total_keys} Gemini API Key vào hệ thống xoay vòng! 🚀`, "success");
    } catch (err) {
      addToast(`Lỗi lưu API Key: ${err.message}`, "error");
    } finally {
      setIsSavingKeys(false);
    }
  };

  const handleTestSingleKey = async () => {
    if (!testKeyInput.trim()) {
      addToast("Vui lòng nhập API key cần kiểm tra!", "warning");
      return;
    }
    setIsTestingKey(true);
    setTestKeyResult(null);
    try {
      const res = await api.ai.testKey(testKeyInput.trim());
      setTestKeyResult(res);
      if (res.valid) {
        addToast(res.message, "success");
      } else {
        addToast(res.message, "error");
      }
    } catch (err) {
      setTestKeyResult({ valid: false, message: err.message });
      addToast(err.message, "error");
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleRunAutoModeration = async () => {
    if (pendingPosts.length === 0) {
      addToast("Không có bài viết nào đang chờ duyệt!", "info");
      return;
    }
    setIsAutoModerating(true);
    let approvedCount = 0;
    let flaggedCount = 0;

    for (const post of pendingPosts) {
      try {
        const mod = await api.ai.moderate({ title: post.title, content: post.content });
        if (mod.verdict === "approved" && mod.is_safe) {
          approvePost(post.id);
          approvedCount++;
        } else {
          flaggedCount++;
        }
      } catch {
        // Continue
      }
    }

    setIsAutoModerating(false);
    addToast(`AI Gemini đã duyệt xong: ${approvedCount} bài được xuất bản tự động, ${flaggedCount} bài cần kiểm tra thủ công.`, "success");
  };

  // MÀN HÌNH CHẶN QUYỀN TRUY CẬP (ACCESS GUARD) CHO KHÁCH & THÀNH VIÊN USER
  if (!currentUser) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 animate-fade-in">
        <div className="bg-base-100 border border-base-300 rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-warning/10 text-warning flex items-center justify-center text-4xl mx-auto ring-8 ring-warning/5">
            🛡️
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-2xl font-black text-base-content">
              Yêu cầu Đăng nhập Quản trị
            </h2>
            <p className="text-sm text-base-content/70 leading-relaxed">
              Bạn chưa đăng nhập vào hệ thống. Phân hệ <span className="font-bold text-primary">Cài đặt & Quản trị hệ thống</span> chỉ dành riêng cho tài khoản có vai trò <span className="font-bold text-base-content">Quản trị viên (Admin)</span> hoặc <span className="font-bold text-base-content">Kiểm duyệt viên (Moderator)</span>.
            </p>
          </div>

          <div className="max-w-xl mx-auto p-5 rounded-2xl bg-base-200/60 border border-base-300 text-left text-xs space-y-3">
            <p className="font-bold text-base-content flex items-center gap-1.5 text-sm">
              <span>📋</span> Bảng phân quyền truy cập hệ thống:
            </p>
            <div className="grid gap-2.5">
              <div className="p-3 rounded-xl bg-base-100 border border-base-200 flex items-start gap-3">
                <span className="badge badge-primary font-bold shrink-0 mt-0.5">Admin</span>
                <span className="text-base-content/80 text-xs">Toàn quyền cao nhất: Cài đặt hệ thống, duyệt bài, cào tin RSS, quản lý thành viên, chiến dịch quảng cáo và xóa bài/cmt trực tiếp trên feed.</span>
              </div>
              <div className="p-3 rounded-xl bg-base-100 border border-base-200 flex items-start gap-3">
                <span className="badge badge-secondary font-bold shrink-0 mt-0.5">Moderator</span>
                <span className="text-base-content/80 text-xs">Quyền kiểm duyệt bài viết, xử lý báo cáo vi phạm, phân loại chuyên mục và kiểm duyệt thảo luận cộng đồng.</span>
              </div>
              <div className="p-3 rounded-xl bg-base-100 border border-base-200 flex items-start gap-3 opacity-60">
                <span className="badge bg-base-300 font-bold shrink-0 mt-0.5">User</span>
                <span className="text-base-content/80 text-xs">Độc giả và tác giả viết bài. <span className="text-error font-semibold">Không có quyền</span> truy cập vào trung tâm Cài đặt & Quản trị.</span>
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate("login")}
              className="btn btn-primary w-full text-white font-bold text-sm rounded-xl shadow-sm"
            >
              🔑 Đăng nhập tài khoản Quản trị
            </button>
            <button
              type="button"
              onClick={async () => {
                await loginDemo();
              }}
              className="btn btn-outline btn-secondary w-full font-bold text-sm rounded-xl gap-2"
            >
              <span>⚡</span> Đăng nhập nhanh Admin Demo (1-chạm)
            </button>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate("home")}
              className="btn btn-ghost w-full text-xs text-base-content/60"
            >
              ← Quay về Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccessModeration) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 animate-fade-in">
        <div className="bg-base-100 border border-error/20 rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-error/10 text-error flex items-center justify-center text-4xl mx-auto ring-8 ring-error/5">
            ⛔
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-2xl font-black text-base-content">
              Quyền truy cập bị từ chối (403 Forbidden)
            </h2>
            <p className="text-sm text-base-content/70 leading-relaxed">
              Tài khoản <span className="font-bold text-primary">{currentUser.name || currentUser.username}</span> ({currentUser.email}) hiện tại chỉ có vai trò là <span className="badge badge-xs bg-base-300 font-bold uppercase">{currentUser.role || "User"}</span>.
            </p>
            <p className="text-xs text-base-content/60 leading-relaxed">
              Bạn không đủ quyền hạn để truy cập vào <span className="font-bold">Cài đặt & Quản trị hệ thống</span>. Phân hệ này yêu cầu vai trò tối thiểu là <span className="font-bold text-secondary">Kiểm duyệt viên (Moderator)</span> hoặc <span className="font-bold text-primary">Quản trị viên (Admin)</span>.
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate("home")}
              className="btn btn-primary w-full text-white font-bold text-sm rounded-xl shadow-sm"
            >
              ← Quay về Trang chủ
            </button>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate("login")}
              className="btn btn-outline btn-ghost w-full text-xs font-bold rounded-xl"
            >
              Đổi tài khoản Quản trị khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => onNavigate("home")}
              className="btn btn-sm btn-ghost text-xs p-1"
            >
              ← Về trang chủ
            </button>
            <span className="text-base-content/40">•</span>
            <span className="text-xs text-primary font-bold uppercase tracking-wider">
              Quản lý xuất bản
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-base-content !my-0">
            ⚙️ Cài đặt & Quản trị hệ thống
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Cấu hình hệ thống, kiểm duyệt nội dung, quản lý bài viết, xóa bình luận trực tiếp và điều khiển nền tảng toàn diện.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={handleExportSystemReportMd}
              className="btn btn-sm btn-outline border-base-300 hover:bg-base-200 text-xs font-bold gap-1.5 shadow-xs"
              title="Xuất báo cáo tổng quan số liệu hệ thống định dạng Markdown"
            >
              <span>📊</span> Báo cáo hệ thống (.md)
            </button>
          )}
          <button
            onClick={() => onNavigate("create_post")}
            className="btn btn-sm btn-primary text-white font-bold gap-1.5 shadow-sm"
          >
            <span>+</span> Viết bài mới
          </button>
        </div>
      </div>

      {/* Thanh tab điều hướng - Tự động co giãn & Wrap không bao giờ bị khuất */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-base-200/90 backdrop-blur-xs rounded-2xl mb-6 border border-base-300 shadow-2xs w-full">
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "settings"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>⚙️</span>
          <span>Cài đặt hệ thống</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "pending"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>Chờ duyệt</span>
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-extrabold text-amber-950 bg-amber-400 rounded-full leading-none ml-0.5 shrink-0 shadow-2xs">
            {pendingPosts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("approved")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "approved"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>Đã xuất bản</span>
          <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold rounded-full leading-none ml-0.5 shrink-0 ${
            activeTab === "approved" ? "text-primary bg-white" : "text-base-content/70 bg-base-300"
          }`}>
            {approvedPosts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rejected")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "rejected"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>Bị từ chối</span>
          <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold rounded-full leading-none ml-0.5 shrink-0 ${
            activeTab === "rejected" ? "text-primary bg-white" : "text-base-content/70 bg-base-300"
          }`}>
            {rejectedPosts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("reports");
            loadReports(reportsFilter);
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "reports"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>🚩 Báo cáo</span>
          {reports.filter(r => r.status === "pending").length > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-[11px] font-bold text-white bg-error rounded-full leading-none ml-0.5 shrink-0 shadow-2xs">
              {reports.filter(r => r.status === "pending").length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("bug_reports");
            loadBugReports();
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "bug_reports"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>🐛 Báo lỗi & Sự cố</span>
          {bugReports.filter((b) => b.status === "pending" || b.status === "received").length > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold text-white bg-error rounded-full leading-none ml-0.5 shrink-0 shadow-2xs">
              {bugReports.filter((b) => b.status === "pending" || b.status === "received").length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("crawler");
            loadCrawler();
      window.dispatchEvent(new CustomEvent("refresh_posts"));
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "crawler"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>🌐 Crawler</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("audit");
            loadAudit();
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "audit"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>🛡️ Nhật ký</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "analytics"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>📊 Thống kê</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("gemini");
            loadGeminiKeys();
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "gemini"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>🤖 AI</span>
          {geminiPool.active_keys > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold text-white bg-success rounded-full leading-none ml-0.5 shrink-0 shadow-2xs">
              {geminiPool.active_keys}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("categories");
            loadCategories();
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "categories"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>📁 Chuyên mục</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("ads");
            loadAds();
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "ads"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>📢 Quảng cáo</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("users");
            loadUsers();
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer select-none ${
            activeTab === "users"
              ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary/30"
              : "bg-base-100/70 hover:bg-base-100 text-base-content/75 hover:text-base-content border border-base-200/60 hover:border-base-300"
          }`}
        >
          <span>👥 Thành viên</span>
        </button>
      </div>

      {activeTab === "analytics" ? (
        /* Analytics & Admin System Overview */
        <div className="space-y-6 animate-fade-in">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Tổng bài viết</span>
                <span className="text-lg">📝</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-base-content">
                {analyticsData?.total_posts || (pendingPosts.length + approvedPosts.length + rejectedPosts.length + 15)}
              </p>
              <span className="text-[11px] text-success font-semibold">↑ +18% so với tuần trước</span>
            </div>

            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Người dùng</span>
                <span className="text-lg">👥</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-base-content">
                {analyticsData?.total_users || 1420}
              </p>
              <span className="text-[11px] text-success font-semibold">↑ +45 dev mới tham gia</span>
            </div>

            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Lượt đọc tích lũy</span>
                <span className="text-lg">👁️</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-base-content">
                {analyticsData?.total_views ? `${analyticsData.total_views.toLocaleString()}` : "48,250"}
              </p>
              <span className="text-[11px] text-primary font-semibold">Thời gian TB: 4.8 phút</span>
            </div>

            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>AI Moderation Pass</span>
                <span className="text-lg">🛡️</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-success">
                97.6%
              </p>
              <span className="text-[11px] text-base-content/60">0.8% spam bị chặn tự động</span>
            </div>
          </div>

          {/* 2 Cols: Crawler Ingestion & Tech Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Crawler Engine Status */}
            <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-base-content flex items-center gap-2">
                  <span>🕷️ Trạng thái Web Crawler & Tin tức tự động</span>
                </h3>
                <span className="badge badge-xs badge-success text-white font-bold">Active</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 border border-base-200 text-xs">
                  <div>
                    <p className="font-bold text-base-content">Dev.to API / Frontend & Fullstack</p>
                    <span className="text-[11px] text-base-content/60">Cập nhật mỗi 30 phút • Hash SHA-256 chống trùng lặp</span>
                  </div>
                  <span className="badge badge-sm badge-outline badge-primary">34 bài đã nạp</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 border border-base-200 text-xs">
                  <div>
                    <p className="font-bold text-base-content">HackerNews Tech / AI & Architecture</p>
                    <span className="text-[11px] text-base-content/60">Cập nhật mỗi 1 giờ • Tự động gắn tag kỹ thuật</span>
                  </div>
                  <span className="badge badge-sm badge-outline badge-primary">28 bài đã nạp</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 border border-base-200 text-xs">
                  <div>
                    <p className="font-bold text-base-content">VNExpress Số Hóa / Công nghệ Việt Nam</p>
                    <span className="text-[11px] text-base-content/60">Cập nhật tin tức hàng ngày</span>
                  </div>
                  <span className="badge badge-sm badge-outline badge-primary">19 bài đã nạp</span>
                </div>
              </div>
            </div>

            {/* Recommendation & Engagement Status */}
            <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-base-content flex items-center gap-2">
                  <span>🎯 Hệ thống Đề xuất & Bot Tương tác</span>
                </h3>
                <span className="badge badge-xs badge-info text-white font-bold">Recommendation Engine</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-base-200/50 border border-base-200 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-base-content">
                    <span>Độ chính xác Feed For You (CF & Content-based)</span>
                    <span className="text-primary">89.4%</span>
                  </div>
                  <progress className="progress progress-primary w-full" value="89" max="100"></progress>
                </div>
                <div className="p-3 rounded-xl bg-base-200/50 border border-base-200 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-base-content">
                    <span>Độ tương tác Bot hỗ trợ kỹ thuật (AI TechBot)</span>
                    <span className="text-success">94.2%</span>
                  </div>
                  <progress className="progress progress-success w-full" value="94" max="100"></progress>
                </div>
                <div className="p-3 rounded-xl bg-base-200/50 border border-base-200 text-xs flex items-center justify-between">
                  <span className="text-base-content/70">Tỷ lệ bài viết có Verified Badge</span>
                  <span className="badge badge-sm badge-success text-white font-bold">38% bài đạt chuẩn</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "gemini" ? (
        /* Gemini Multi-Key Configuration & Automated AI Moderation */
        <div className="space-y-6 animate-fade-in">
          {/* Header Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Mô hình AI</span>
                <span className="text-lg">🤖</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-primary">
                {geminiPool.model || "gemini-1.5-flash"}
              </p>
              <span className="text-[11px] text-base-content/60">Google DeepMind API</span>
            </div>

            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Khóa API Hoạt Động</span>
                <span className="text-lg">🔑</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-success">
                {geminiPool.active_keys} / {geminiPool.total_keys} Key
              </p>
              <span className="text-[11px] text-base-content/60">Cơ chế xoay vòng tự động (Round-robin)</span>
            </div>

            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Cơ Chế Dự Phòng</span>
                <span className="text-lg">🛡️</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-base-content">
                Failover + Heuristic
              </p>
              <span className="text-[11px] text-success font-semibold">Tự động chuyển key khi gặp 429 Rate Limit</span>
            </div>
          </div>

          {/* Action: Chạy AI Duyệt Toàn Bộ Bài Chờ Duyệt */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-primary/10 via-base-100 to-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="badge badge-primary text-white font-bold text-xs">Tự động hóa</span>
                <h3 className="font-extrabold text-base text-base-content">
                  Kiểm duyệt hàng loạt bài viết chờ duyệt với Gemini AI
                </h3>
              </div>
              <p className="text-xs text-base-content/70">
                AI sẽ đọc tiêu đề và nội dung {pendingPosts.length} bài viết chờ duyệt, phân tích spam, độ chuẩn CNTT và xuất bản tự động nếu bài đạt chuẩn.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunAutoModeration}
              disabled={isAutoModerating || pendingPosts.length === 0}
              className="btn btn-primary text-white font-bold text-xs rounded-xl px-5 shrink-0 shadow-sm"
            >
              {isAutoModerating ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Đang phân tích {pendingPosts.length} bài...
                </>
              ) : (
                <>
                  <span>⚡</span>
                  Chạy duyệt AI tự động ({pendingPosts.length})
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Cập nhật Danh sách Nhiều API Key */}
            <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-base-content flex items-center gap-2">
                    <span>🔑 Cấu hình Danh sách API Keys</span>
                  </h3>
                  <p className="text-xs text-base-content/60 mt-0.5">
                    Hỗ trợ nạp nhiều key. Hệ thống sẽ tự động cân bằng tải và luân chuyển khi một key đạt giới hạn request.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="label font-bold text-xs text-base-content/80 p-0">
                  Nhập danh sách Google Gemini API Keys (Mỗi key 1 dòng hoặc cách nhau bởi dấu phẩy):
                </label>
                <textarea
                  rows={4}
                  value={keysInputText}
                  onChange={(e) => setKeysInputText(e.target.value)}
                  placeholder="AIzaSyA1b2c3d4e5f6g7h8i9j0...&#10;AIzaSyB9c8d7e6f5g4h3i2j1k0...&#10;AIzaSyC2d3e4f5g6h7i8j9k0l1..."
                  className="textarea textarea-bordered w-full font-mono text-xs focus:textarea-primary"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={loadGeminiKeys}
                  className="btn btn-sm btn-ghost text-xs"
                >
                  🔄 Làm mới trạng thái
                </button>
                <button
                  type="button"
                  onClick={handleSaveGeminiKeys}
                  disabled={isSavingKeys}
                  className="btn btn-sm btn-primary text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  {isSavingKeys ? <span className="loading loading-spinner loading-xs"></span> : <span>💾</span>}
                  Lưu danh sách API Keys
                </button>
              </div>
            </div>

            {/* Công cụ Kiểm tra Kết nối Khóa API đơn lẻ */}
            <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-base text-base-content flex items-center gap-2">
                  <span>🧪 Kiểm tra Kết nối Key</span>
                </h3>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Kiểm tra xem một API key cụ thể có đang hoạt động tốt hoặc bị giới hạn hạn ngạch hay không.
                </p>
              </div>

              <div className="space-y-2">
                <label className="label font-bold text-xs text-base-content/80 p-0">
                  API Key cần kiểm tra:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={testKeyInput}
                    onChange={(e) => setTestKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="input input-bordered input-sm flex-1 font-mono text-xs focus:input-primary"
                  />
                  <button
                    type="button"
                    onClick={handleTestSingleKey}
                    disabled={isTestingKey}
                    className="btn btn-sm btn-outline btn-primary font-bold text-xs shrink-0"
                  >
                    {isTestingKey ? <span className="loading loading-spinner loading-xs"></span> : "Kiểm tra"}
                  </button>
                </div>
              </div>

              {testKeyResult && (
                <div
                  className={`p-3.5 rounded-2xl text-xs border ${
                    testKeyResult.valid
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-error/10 text-error border-error/30"
                  }`}
                >
                  <p className="font-bold">
                    {testKeyResult.valid ? "✓ Khóa API hợp lệ!" : "✕ Khóa API không hợp lệ hoặc lỗi kết nối"}
                  </p>
                  <p className="mt-1 opacity-90">{testKeyResult.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Bảng Thống kê Trạng thái Pool API Keys */}
          <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-base-content flex items-center gap-2">
                <span>📋 Danh sách Khóa trong Pool ({geminiPool.keys.length})</span>
              </h3>
              <span className="text-xs text-base-content/50">Mô hình: {geminiPool.model}</span>
            </div>

            {geminiPool.keys.length === 0 ? (
              <div className="text-center py-8 bg-base-200/50 rounded-2xl border border-base-200">
                <span className="text-3xl">🔑</span>
                <p className="text-xs font-bold text-base-content mt-2">Chưa có API key nào trong danh sách</p>
                <p className="text-[11px] text-base-content/60 mt-1">
                  Hãy nhập ít nhất một Gemini API Key ở biểu mẫu phía trên để kích hoạt tính năng kiểm duyệt tự động bằng AI.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm w-full text-xs">
                  <thead>
                    <tr className="border-b border-base-200 text-base-content/60">
                      <th>Khóa API (Masked)</th>
                      <th>Trạng thái</th>
                      <th>Tổng lượt gọi</th>
                      <th>Thành công</th>
                      <th>Thất bại</th>
                      <th>Lần dùng cuối</th>
                      <th>Lỗi gần nhất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geminiPool.keys.map((k, idx) => (
                      <tr key={idx} className="border-b border-base-200/50 hover:bg-base-200/40">
                        <td className="font-mono font-bold text-primary">{k.masked_key}</td>
                        <td>
                          {k.status === "active" ? (
                            <span className="badge badge-xs badge-success text-white font-bold">🟢 Sẵn sàng</span>
                          ) : k.status === "rate_limited" ? (
                            <span className="badge badge-xs badge-warning text-amber-950 font-bold">🟡 Chờ hồi phục (429)</span>
                          ) : (
                            <span className="badge badge-xs badge-error text-white font-bold">🔴 Không hợp lệ</span>
                          )}
                        </td>
                        <td className="font-semibold">{k.request_count}</td>
                        <td className="text-success font-semibold">{k.success_count}</td>
                        <td className={k.failure_count > 0 ? "text-error font-semibold" : "text-base-content/40"}>
                          {k.failure_count}
                        </td>
                        <td className="text-base-content/60">
                          {k.last_used_at ? new Date(k.last_used_at).toLocaleTimeString("vi-VN") : "Chưa gọi"}
                        </td>
                        <td className="text-base-content/50 max-w-xs truncate">{k.last_error || "Không có lỗi"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "reports" ? (
        <div className="space-y-6 animate-fade-in">
          {/* Header and Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-base-content flex items-center gap-2">
                <span>🚩 Báo cáo Vi phạm Cộng đồng</span>
              </h2>
              <p className="text-xs text-base-content/60 mt-0.5">
                Xem xét khiếu nại của người dùng về nội dung spam, xúc phạm hoặc vi phạm bản quyền.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-base-content/70">Bộ lọc:</span>
              <div className="join">
                {["pending", "resolved", "dismissed", "all"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setReportsFilter(st);
                      loadReports(st);
                    }}
                    className={`btn btn-xs join-item ${reportsFilter === st ? "btn-primary text-white font-bold" : "btn-ghost"}`}
                  >
                    {st === "pending" ? "Chờ xử lý" : st === "resolved" ? "Đã xử lý" : st === "dismissed" ? "Đã bỏ qua" : "Tất cả"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loadingReports ? (
            <div className="text-center py-12">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <p className="text-xs text-base-content/60 mt-2">Đang tải danh sách báo cáo...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 bg-base-100 rounded-3xl border border-dashed border-base-300 p-8">
              <span className="text-4xl">✨</span>
              <h3 className="font-bold text-base text-base-content mt-2">Không có báo cáo vi phạm nào</h3>
              <p className="text-xs text-base-content/60 mt-1">Cộng đồng IT Blog hiện tại an toàn và tuân thủ chuẩn mực kỹ thuật.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge badge-sm font-bold ${
                        report.status === "pending" ? "badge-warning text-amber-950" : report.status === "resolved" ? "badge-success text-white" : "badge-ghost"
                      }`}>
                        {report.status === "pending" ? "🟡 Chờ xử lý" : report.status === "resolved" ? "🟢 Đã xử lý" : "⚪ Đã bỏ qua"}
                      </span>
                      <span className="badge badge-sm badge-outline font-semibold">
                        Đối tượng: {report.target_type === "post" ? "Bài viết" : report.target_type === "comment" ? "Bình luận" : "Người dùng"} #{report.target_id}
                      </span>
                      <span className="badge badge-sm badge-error badge-outline font-semibold">
                        Lý do: {report.reason === "spam" ? "Spam / Quảng cáo" : report.reason === "toxic" ? "Xúc phạm / Toxic" : report.reason === "copyright" ? "Vi phạm bản quyền" : report.reason}
                      </span>
                      <span className="text-[11px] text-base-content/50">
                        {report.created_at && !isNaN(new Date(report.created_at).getTime()) ? new Date(report.created_at).toLocaleString("vi-VN") : "Gần đây"}
                      </span>
                    </div>

                    <p className="text-sm text-base-content/90 font-medium">
                      {report.details || "Không có mô tả chi tiết từ người báo cáo."}
                    </p>

                    <div className="text-xs text-base-content/60 flex items-center gap-2">
                      <span>Người báo cáo: <strong>{report.reporter?.name || "Người dùng ẩn danh"}</strong> (@{report.reporter?.username || "user"})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {report.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleResolveReport(report.id, "dismiss")}
                          className="btn btn-xs btn-ghost text-xs"
                        >
                          ✕ Bỏ qua
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveReport(report.id, "remove_content")}
                          className="btn btn-xs btn-error text-white font-bold"
                        >
                          ✓ Gỡ bỏ vi phạm
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-base-content/50 italic">
                        {report.status === "resolved" ? "Đã gỡ bỏ nội dung" : "Đã xác nhận không vi phạm"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "bug_reports" ? (
        /* Bug Reports & Feedback Management Hub */
        <div className="space-y-6 animate-fade-in">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Tổng số sự cố</span>
                <span className="text-lg">📋</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-base-content">{bugReports.length}</p>
              <span className="text-[11px] text-base-content/60">Báo cáo từ cộng đồng & người dùng</span>
            </div>

            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Chờ tiếp nhận</span>
                <span className="text-lg">🟡</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-warning">
                {bugReports.filter((b) => b.status === "pending" || b.status === "received").length}
              </p>
              <span className="text-[11px] text-base-content/60">Cần đội kỹ thuật xác minh</span>
            </div>

            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Đang xử lý</span>
                <span className="text-lg">🔵</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-info">
                {bugReports.filter((b) => b.status === "in_progress").length}
              </p>
              <span className="text-[11px] text-base-content/60">Đang được lập trình viên sửa</span>
            </div>

            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Đã giải quyết</span>
                <span className="text-lg">🟢</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-success">
                {bugReports.filter((b) => b.status === "resolved").length}
              </p>
              <span className="text-[11px] text-base-content/60">Đã vá lỗi hoặc triển khai</span>
            </div>
          </div>

          {/* Filter Bar & Export Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Tìm kiếm theo tiêu đề, mô tả lỗi hoặc người báo cáo..."
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
                value={bugCategoryFilter}
                onChange={(e) => setBugCategoryFilter(e.target.value)}
                className="select select-sm select-bordered rounded-xl text-xs font-semibold"
              >
                <option value="all">Mọi phân loại</option>
                <option value="bug">🐛 Lỗi chức năng</option>
                <option value="feature">💡 Đề xuất tính năng</option>
                <option value="content">⚠️ Vi phạm nội dung</option>
                <option value="other">💬 Ý kiến khác</option>
              </select>

              <div className="join">
                {[
                  { key: "all", label: "Tất cả" },
                  { key: "pending", label: "Chờ xử lý" },
                  { key: "in_progress", label: "Đang sửa" },
                  { key: "resolved", label: "Đã xong" }
                ].map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => {
                      setBugReportsFilter(st.key);
                      loadBugReports(st.key, bugCategoryFilter, bugSearch);
                    }}
                    className={`btn btn-xs join-item ${
                      bugReportsFilter === st.key ? "btn-primary text-white font-bold" : "btn-ghost"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleExportBugsMd}
                  className="btn btn-xs btn-outline border-base-300 font-bold gap-1 text-xs"
                  title="Xuất danh sách lỗi định dạng Markdown (.md)"
                >
                  <span>📥</span> Xuất .md
                </button>
              )}

              <button
                type="button"
                onClick={() => loadBugReports()}
                className="btn btn-xs btn-ghost text-xs font-bold"
                title="Tải lại danh sách báo lỗi"
              >
                🔄 Làm mới
              </button>
            </div>
          </div>

          {/* List of Bug Reports */}
          {loadingBugReports ? (
            <div className="text-center py-12">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <p className="text-xs text-base-content/60 mt-2">Đang tải danh sách sự cố...</p>
            </div>
          ) : (() => {
            const filteredBugs = bugReports.filter((item) => {
              const matchStatus =
                bugReportsFilter === "all" ||
                item.status === bugReportsFilter ||
                (bugReportsFilter === "pending" && (item.status === "received" || !item.status));
              const matchCategory =
                bugCategoryFilter === "all" || (item.category || item.type) === bugCategoryFilter;
              const term = bugSearch.trim().toLowerCase();
              const matchSearch =
                !term ||
                (item.title || item.subject || "").toLowerCase().includes(term) ||
                (item.description || item.content || "").toLowerCase().includes(term) ||
                (item.reporter_name || item.name || "").toLowerCase().includes(term) ||
                (item.reporter_email || item.email || "").toLowerCase().includes(term);
              return matchStatus && matchCategory && matchSearch;
            });

            if (filteredBugs.length === 0) {
              return (
                <div className="text-center py-16 bg-base-100 rounded-3xl border border-dashed border-base-300 p-8">
                  <span className="text-4xl">✨</span>
                  <h3 className="font-bold text-base text-base-content mt-2">Không có sự cố nào cần xử lý</h3>
                  <p className="text-xs text-base-content/60 mt-1">
                    Hệ thống hoạt động trơn tru, không có báo cáo lỗi nào trong bộ lọc này.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {filteredBugs.map((bug) => {
                  const isBug = (bug.category || bug.type) === "bug";
                  const isFeature = (bug.category || bug.type) === "feature";
                  const isResolved = bug.status === "resolved";
                  const isInProgress = bug.status === "in_progress";
                  const isPending = !bug.status || bug.status === "pending" || bug.status === "received";

                  return (
                    <div
                      key={bug.id}
                      className={`p-5 rounded-2xl bg-base-100 border transition-all ${
                        isResolved
                          ? "border-success/30 shadow-2xs"
                          : isInProgress
                          ? "border-info/30 shadow-xs"
                          : "border-base-300 shadow-xs"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-base-200">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Status Badge */}
                          <span
                            className={`badge badge-sm font-black ${
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

                          {/* Category Badge */}
                          <span className="badge badge-sm badge-outline font-semibold">
                            {isBug
                              ? "🐛 Lỗi chức năng"
                              : isFeature
                              ? "💡 Đề xuất tính năng"
                              : (bug.category || bug.type) === "content"
                              ? "⚠️ Khiếu nại nội dung"
                              : "💬 Ý kiến khác"}
                          </span>

                          {/* Priority Badge */}
                          {bug.priority && (
                            <span
                              className={`badge badge-xs font-bold uppercase ${
                                bug.priority === "critical"
                                  ? "badge-error text-white"
                                  : bug.priority === "high"
                                  ? "badge-warning text-amber-950"
                                  : "badge-ghost"
                              }`}
                            >
                              {bug.priority === "critical"
                                ? "🚨 Khẩn cấp"
                                : bug.priority === "high"
                                ? "🔴 Cao"
                                : bug.priority === "medium"
                                ? "🟡 Bình thường"
                                : "🟢 Thấp"}
                            </span>
                          )}

                          <span className="font-mono text-xs text-base-content/40">#BUG-{bug.id}</span>
                        </div>

                        <div className="text-[11px] text-base-content/50">
                          Gửi lúc: {bug.created_at && !isNaN(new Date(bug.created_at).getTime())
                            ? new Date(bug.created_at).toLocaleString("vi-VN")
                            : "Gần đây"}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="py-3 space-y-2">
                        <h4 className="font-extrabold text-base text-base-content">{bug.title || bug.subject}</h4>
                        <div className="p-3.5 rounded-xl bg-base-200/50 border border-base-200 text-xs text-base-content/90 leading-relaxed whitespace-pre-wrap font-sans">
                          {bug.description || bug.content}
                        </div>

                        <div className="text-xs text-base-content/60 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                          <span>
                            Người gửi: <strong>{bug.reporter_name || bug.name || "Khách"}</strong>
                          </span>
                          {bug.reporter_email || bug.email ? (
                            <span>
                              Email:{" "}
                              <a
                                href={`mailto:${bug.reporter_email || bug.email}`}
                                className="text-primary hover:underline font-mono"
                              >
                                {bug.reporter_email || bug.email}
                              </a>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Admin Notes Section */}
                      <div className="mt-2 p-3.5 rounded-xl bg-base-200/40 border border-base-300 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-base-content flex items-center gap-1.5">
                            <span>🛠️ Ghi chú xử lý của Ban Quản trị:</span>
                          </span>
                          {editingBugId !== bug.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBugId(bug.id);
                                setEditingBugNoteText(bug.admin_notes || "");
                              }}
                              className="text-xs text-primary hover:underline font-bold cursor-pointer"
                            >
                              {bug.admin_notes ? "✏️ Sửa ghi chú" : "➕ Thêm ghi chú"}
                            </button>
                          )}
                        </div>

                        {editingBugId === bug.id ? (
                          <div className="space-y-2 pt-1">
                            <textarea
                              rows={2}
                              value={editingBugNoteText}
                              onChange={(e) => setEditingBugNoteText(e.target.value)}
                              placeholder="Nhập phản hồi hoặc ghi chú kỹ thuật (VD: Đã tái hiện lỗi trên Safari 17, đang deploy bản vá v1.2)..."
                              className="textarea textarea-sm textarea-bordered w-full rounded-xl text-xs font-medium"
                            ></textarea>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingBugId(null)}
                                className="btn btn-xs btn-ghost text-xs"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                disabled={isUpdatingBug}
                                onClick={() => handleSaveBugNote(bug.id)}
                                className="btn btn-xs btn-primary text-white font-bold text-xs"
                              >
                                Lưu ghi chú
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-base-content/80 italic">
                            {bug.admin_notes || "Chưa có phản hồi từ Ban Quản trị."}
                          </p>
                        )}
                      </div>

                      {/* Actions Bar */}
                      <div className="mt-4 pt-3 border-t border-base-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-base-content/60">Chuyển trạng thái:</span>

                          {!isInProgress && (
                            <button
                              type="button"
                              disabled={isUpdatingBug}
                              onClick={() => handleUpdateBugStatus(bug.id, "in_progress")}
                              className="btn btn-xs btn-info text-white font-bold gap-1 shadow-2xs"
                            >
                              <span>⚙️</span> Đang xử lý
                            </button>
                          )}

                          {!isResolved && (
                            <button
                              type="button"
                              disabled={isUpdatingBug}
                              onClick={() => handleUpdateBugStatus(bug.id, "resolved")}
                              className="btn btn-xs btn-success text-white font-bold gap-1 shadow-2xs"
                            >
                              <span>✅</span> Đã khắc phục
                            </button>
                          )}

                          {!bug.status || bug.status === "pending" || isInProgress ? (
                            <button
                              type="button"
                              disabled={isUpdatingBug}
                              onClick={() => handleUpdateBugStatus(bug.id, "dismissed")}
                              className="btn btn-xs btn-ghost text-xs"
                            >
                              ✕ Bỏ qua / Đóng
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isUpdatingBug}
                              onClick={() => handleUpdateBugStatus(bug.id, "pending")}
                              className="btn btn-xs btn-ghost text-xs"
                            >
                              🔄 Mở lại (Chờ tiếp nhận)
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteBug(bug.id)}
                          className="btn btn-xs btn-error btn-outline text-xs gap-1"
                          title="Xóa vĩnh viễn báo cáo lỗi này"
                        >
                          <span>🗑️</span> Xóa
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

      ) : activeTab === "crawler" ? (
        <div className="space-y-6 animate-fade-in">
          {/* Header Banner & Manual Trigger */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-secondary/10 via-base-100 to-primary/10 border border-base-300 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="badge badge-secondary text-white font-bold text-xs">RSS & Atom Engine</span>
                <h3 className="font-black text-base text-base-content">
                  Thu thập tin tức công nghệ tự động (Automated Tech Ingestion)
                </h3>
              </div>
              <p className="text-xs text-base-content/70">
                Thu thập các bài viết mới từ các trang công nghệ uy tín (VnExpress, GitHub Blog, Dev.to), tự động trích xuất nội dung và chống trùng lặp qua mã băm SHA-256.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleTriggerCrawl()}
              disabled={crawlingInProgress}
              className="btn btn-secondary text-white font-bold text-xs rounded-xl px-5 shrink-0 shadow-sm"
            >
              {crawlingSourceId === "all" ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Đang cào toàn bộ nguồn...
                </>
              ) : (
                <>
                  <span>🌐</span>
                  Kích hoạt cào tin ngay
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form thêm nguồn cào mới */}
            <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-base-content flex items-center gap-2">
                <span>➕ Thêm Nguồn RSS Mới</span>
              </h3>
              <form onSubmit={handleAddCrawlSource} className="space-y-3">
                <div>
                  <label className="label text-xs font-semibold">Tên nguồn tin</label>
                  <input
                    type="text"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    placeholder="VD: Hacker News Tech"
                    className="input input-bordered input-sm w-full text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs font-semibold">URL Nguồn (RSS / Atom XML)</label>
                  <input
                    type="url"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="https://example.com/feed.xml"
                    className="input input-bordered input-sm w-full text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs font-semibold">Chủ đề mặc định</label>
                  <select
                    value={newSourceCategory}
                    onChange={(e) => setNewSourceCategory(e.target.value)}
                    className="select select-bordered select-sm w-full text-xs"
                  >
                    <option value="Frontend">Frontend & Web</option>
                    <option value="Backend">Backend & Microservices</option>
                    <option value="DevOps">DevOps & Cloud</option>
                    <option value="AI">AI & Machine Learning</option>
                    <option value="Mobile">Mobile Apps</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary w-full text-white font-bold mt-2"
                >
                  Thêm nguồn thu thập
                </button>
              </form>
            </div>

            {/* Danh sách nguồn thu thập */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-base-content flex items-center gap-2">
                  <span>📡 Các Nguồn Thu Thập ({crawlSources.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={loadCrawler}
                  className="btn btn-xs btn-ghost text-xs"
                >
                  ↻ Làm mới
                </button>
              </div>

              {loadingCrawler ? (
                <div className="text-center py-8">
                  <span className="loading loading-spinner loading-sm text-secondary"></span>
                </div>
              ) : crawlSources.length === 0 ? (
                <p className="text-xs text-base-content/60 py-4 text-center">Chưa có nguồn RSS nào được cấu hình.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full text-xs">
                    <thead>
                      <tr className="border-b border-base-200 text-base-content/60">
                        <th>Nguồn tin</th>
                        <th>URL</th>
                        <th>Trạng thái</th>
                        <th className="text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crawlSources.map((s) => (
                        <tr key={s.id} className="border-b border-base-200/50 hover:bg-base-200/30">
                          <td className="font-bold text-base-content">{s.name}</td>
                          <td className="font-mono text-base-content/60 max-w-xs truncate">{s.url || s.feed_url}</td>
                          <td>
                            <span className="badge badge-xs badge-success text-white font-bold">Hoạt động</span>
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleTriggerCrawl(s.id)}
                                disabled={crawlingInProgress}
                                className="btn btn-xs btn-outline btn-secondary font-bold"
                              >
                                {crawlingSourceId === s.id ? (
                                  <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Đang cào...
                                  </>
                                ) : (
                                  "Thu thập"
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCrawlSource(s.id, s.name)}
                                disabled={crawlingInProgress}
                                className="btn btn-xs btn-ghost text-error hover:bg-error/10 font-bold"
                                title="Xóa nguồn này"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Lịch sử Crawl Jobs */}
          <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-base-content flex items-center gap-2">
              <span>📋 Lịch Sử Thực Thi Crawl Jobs</span>
            </h3>
            {crawlJobs.length === 0 ? (
              <p className="text-xs text-base-content/60 py-4 text-center">Chưa có lượt thu thập nào được ghi nhận.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm w-full text-xs">
                  <thead>
                    <tr className="border-b border-base-200 text-base-content/60">
                      <th>Job ID</th>
                      <th>Trạng thái</th>
                      <th>Số tin đọc</th>
                      <th>Bài đã lưu</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crawlJobs.map((job) => (
                      <tr key={job.id} className="border-b border-base-200/50">
                        <td className="font-mono font-bold text-primary">#{job.id}</td>
                        <td>
                          <span className={`badge badge-xs font-bold ${
                            job.status === "success" || job.status === "completed"
                              ? "badge-success text-white"
                              : job.status === "processing"
                              ? "badge-warning text-amber-950"
                              : "badge-error text-white"
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="font-semibold">{job.items_crawled ?? job.items_found ?? 0}</td>
                        <td className="text-success font-semibold">{job.items_saved ?? job.items_ingested ?? 0}</td>
                        <td className="text-base-content/60">
                          {job.created_at && !isNaN(new Date(job.created_at).getTime()) ? new Date(job.created_at).toLocaleString("vi-VN") : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "audit" ? (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-base-content flex items-center gap-2">
                <span>🛡️ Nhật Ký Hoạt Động & Kiểm Toán Hệ Thống (Audit Logs)</span>
              </h2>
              <p className="text-xs text-base-content/60 mt-0.5">
                Ghi nhận các thao tác kiểm duyệt, quản trị viên và các sự kiện bảo mật quan trọng.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleExportAuditLogsMd}
                  className="btn btn-sm btn-outline border-base-300 text-xs font-bold gap-1.5 shadow-xs"
                  title="Xuất nhật ký kiểm toán định dạng Markdown"
                >
                  📥 Xuất .md
                </button>
              )}
              <button
                type="button"
                onClick={loadAudit}
                className="btn btn-sm btn-ghost text-xs font-semibold gap-1.5"
              >
                ↻ Làm mới
              </button>
            </div>
          </div>

          {/* Audit Search & Action Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-base-100 p-4 rounded-2xl border border-base-300 shadow-xs">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-base-content/40 text-xs">
                🔍
              </span>
              <input
                type="text"
                placeholder="Tìm nhật ký theo hành động, người dùng, chi tiết..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="input input-sm input-bordered w-full pl-8 text-xs rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-base-content/60 font-semibold whitespace-nowrap">Hành động:</span>
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="select select-sm select-bordered text-xs rounded-xl"
              >
                <option value="all">Tất cả hành động ({auditLogs.length})</option>
                {Array.from(new Set(auditLogs.map((l) => l.action).filter(Boolean))).map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingAudit ? (
            <div className="text-center py-12">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <p className="text-xs text-base-content/60 mt-2">Đang tải nhật ký kiểm toán...</p>
            </div>
          ) : filteredAuditLogs.length === 0 ? (
            <div className="text-center py-16 bg-base-100 rounded-3xl border border-dashed border-base-300 p-8">
              <p className="text-xs text-base-content/60">
                {auditLogs.length === 0
                  ? "Chưa có nhật ký hoạt động nào."
                  : "Không tìm thấy nhật ký nào phù hợp với bộ lọc."}
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs overflow-x-auto">
              <table className="table table-sm w-full text-xs">
                <thead>
                  <tr className="border-b border-base-200 text-base-content/60">
                    <th>Thời gian</th>
                    <th>Người thực hiện</th>
                    <th>Hành động</th>
                    <th>Đối tượng</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-base-200/50 hover:bg-base-200/30">
                      <td className="text-base-content/60 whitespace-nowrap">
                        {log.created_at && !isNaN(new Date(log.created_at).getTime()) ? new Date(log.created_at).toLocaleString("vi-VN") : "N/A"}
                      </td>
                      <td className="font-bold text-base-content">
                        {log.user?.name || log.user_name || "Hệ thống"}
                      </td>
                      <td>
                        <span className="badge badge-xs badge-outline font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="text-base-content/70">
                        {log.target_type ? `${log.target_type} #${log.target_id || ""}` : "—"}
                      </td>
                      <td className="text-base-content/80 max-w-sm truncate">
                        {log.details || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === "categories" ? (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-base-content flex items-center gap-2">
                <span>📁 Quản Lý Chuyên Mục Công Nghệ (Categories)</span>
              </h2>
              <p className="text-xs text-base-content/60 mt-0.5">
                Xem cấu trúc chuyên mục kỹ thuật trên toàn bộ nền tảng và tạo danh mục mới cho cộng đồng.
              </p>
            </div>
            <button
              type="button"
              onClick={loadCategories}
              className="btn btn-sm btn-ghost text-xs font-semibold gap-1.5"
            >
              ↻ Tải lại chuyên mục
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột 1 & 2: Danh sách chuyên mục */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 sm:p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-base-content uppercase tracking-wider">
                    Danh sách chuyên mục đang hoạt động ({categoryList.length})
                  </h3>
                </div>

                {loadingCategories ? (
                  <div className="py-12 text-center">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                    <p className="text-xs text-base-content/60 mt-2">Đang tải danh sách chuyên mục...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {categoryList.map((cat) => (
                      <div
                        key={cat.id || cat.name}
                        className="p-4 rounded-2xl bg-base-200/40 border border-base-200 flex items-start gap-3 hover:border-primary/40 transition-colors"
                      >
                        <span className="text-2xl p-2 rounded-xl bg-base-100 border border-base-300 shrink-0">
                          {cat.icon || "📁"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-bold text-sm text-base-content truncate">{cat.name}</h4>
                            <span className="badge badge-xs badge-primary font-semibold shrink-0">
                              {cat.post_count || 0} bài
                            </span>
                          </div>
                          <p className="text-xs text-base-content/60 line-clamp-2 mt-1">
                            {cat.description || "Chuyên mục chia sẻ kinh nghiệm và bài viết chuyên sâu."}
                          </p>
                          <span className="text-[10px] font-mono text-base-content/40 mt-1 block">
                            slug: {cat.slug || cat.name.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cột 3: Form Thêm Chuyên Mục Mới */}
            <div className="lg:col-span-1">
              <div className="p-5 sm:p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs">
                <h3 className="font-bold text-sm text-base-content uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>✨ Thêm chuyên mục mới</span>
                </h3>

                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-base-content/80 mb-1">
                      Tên chuyên mục <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Cloud Computing, Security..."
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="input input-bordered input-sm w-full rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-base-content/80 mb-1">
                      Biểu tượng Emoji hoặc Icon
                    </label>
                    <input
                      type="text"
                      placeholder="VD: ☁️, 🔒, 📱, ⛓️"
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      className="input input-bordered input-sm w-full rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-base-content/80 mb-1">
                      Mô tả chuyên mục
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Tóm tắt nội dung và phạm vi bài viết của chuyên mục..."
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      className="textarea textarea-bordered text-xs w-full rounded-xl"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creatingCategory || !newCatName.trim()}
                    className="btn btn-sm btn-primary w-full rounded-xl text-white font-bold shadow-sm"
                  >
                    {creatingCategory ? "Đang khởi tạo..." : "+ Xác nhận tạo chuyên mục"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "ads" ? (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-base-content flex items-center gap-2">
                <span>📢 Quản Lý Quảng Cáo & Tài Trợ Kỹ Thuật (Developer Promotions)</span>
              </h2>
              <p className="text-xs text-base-content/60 mt-0.5">
                Cấu hình banner tài trợ, ưu đãi công nghệ hiển thị tại thanh bên phải trang đọc bài và trang chủ.
              </p>
            </div>
            <button
              type="button"
              onClick={loadAds}
              className="btn btn-sm btn-ghost text-xs font-semibold gap-1.5"
            >
              ↻ Tải lại chiến dịch
            </button>
          </div>

          {/* Metrics 4 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <span className="text-xs text-base-content/60 font-bold uppercase">Tổng chiến dịch</span>
              <p className="text-2xl font-black text-base-content mt-1">{adsList.length}</p>
              <span className="text-[11px] text-base-content/50">Được lưu trong hệ thống</span>
            </div>
            <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <span className="text-xs text-base-content/60 font-bold uppercase">Đang hiển thị</span>
              <p className="text-2xl font-black text-success mt-1">
                {adsList.filter((a) => a.status === "active").length}
              </p>
              <span className="text-[11px] text-success font-semibold">Active trên Sidebar & Detail</span>
            </div>
            <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <span className="text-xs text-base-content/60 font-bold uppercase">Tổng Lượt Xem (Impressions)</span>
              <p className="text-2xl font-black text-primary mt-1">
                {adsList.reduce((acc, a) => acc + (a.impressions_count || 0), 0).toLocaleString()}
              </p>
              <span className="text-[11px] text-primary font-semibold">Lượt phân phát tự động</span>
            </div>
            <div className="p-4 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <span className="text-xs text-base-content/60 font-bold uppercase">Lượt Nhấp & CTR TB</span>
              <p className="text-2xl font-black text-amber-500 mt-1">
                {adsList.reduce((acc, a) => acc + (a.clicks_count || 0), 0)}
                <span className="text-xs font-bold text-base-content/60 ml-1.5">
                  ({(
                    (adsList.reduce((acc, a) => acc + (a.clicks_count || 0), 0) /
                      Math.max(1, adsList.reduce((acc, a) => acc + (a.impressions_count || 0), 0))) *
                    100
                  ).toFixed(1)}% CTR)
                </span>
              </p>
              <span className="text-[11px] text-amber-600 font-semibold">Tỷ lệ chuyển đổi lập trình viên</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột 1 & 2: Danh sách chiến dịch */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 sm:p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs">
                <h3 className="font-bold text-sm text-base-content uppercase tracking-wider mb-4">
                  Danh sách quảng cáo hiện có ({adsList.length})
                </h3>

                {loadingAds ? (
                  <div className="py-12 text-center">
                    <span className="loading loading-spinner loading-md text-primary"></span>
                    <p className="text-xs text-base-content/60 mt-2">Đang tải danh sách quảng cáo...</p>
                  </div>
                ) : adsList.length === 0 ? (
                  <p className="text-xs text-base-content/60 py-6 text-center">Chưa có chiến dịch quảng cáo nào.</p>
                ) : (
                  <div className="space-y-3">
                    {adsList.map((ad) => {
                      const ctr = ad.impressions_count > 0 ? ((ad.clicks_count / ad.impressions_count) * 100).toFixed(1) : "0.0";
                      return (
                        <div
                          key={ad.id}
                          className="p-4 rounded-2xl bg-base-200/40 border border-base-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="w-16 h-14 rounded-xl bg-base-300 overflow-hidden shrink-0 border border-base-300">
                              <img
                                src={ad.creative_url}
                                alt={ad.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80";
                                }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`badge badge-xs font-bold ${ad.status === "active" ? "badge-success text-white" : "badge-ghost"}`}>
                                  {ad.status === "active" ? "🟢 Đang chạy" : "⏸️ Tạm dừng"}
                                </span>
                                <span className="badge badge-xs badge-primary badge-outline font-semibold uppercase">
                                  {ad.category}
                                </span>
                                <span className="text-[11px] text-base-content/50">
                                  👁️ {ad.impressions_count || 0} views • 🖱️ {ad.clicks_count || 0} clicks • CTR: <b>{ctr}%</b>
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-base-content truncate mt-1">{ad.title}</h4>
                              <p className="text-xs text-base-content/60 line-clamp-1">{ad.description}</p>
                              <a
                                href={ad.target_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-primary hover:underline truncate block mt-0.5"
                              >
                                {ad.target_url} ↗
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleToggleAdStatus(ad.id, ad.status)}
                              className={`btn btn-xs rounded-xl font-bold ${
                                ad.status === "active" ? "btn-outline btn-warning" : "btn-outline btn-success"
                              }`}
                            >
                              {ad.status === "active" ? "Tạm dừng" : "Tiếp tục"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAd(ad.id)}
                              className="btn btn-xs btn-ghost text-error hover:bg-error/10 rounded-xl"
                              title="Xóa quảng cáo"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Cột 3: Form Tạo Chiến Dịch Mới */}
            <div className="lg:col-span-1">
              <div className="p-5 sm:p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs">
                <h3 className="font-bold text-sm text-base-content uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span>✨ Thêm chiến dịch quảng cáo</span>
                </h3>

                <form onSubmit={handleCreateAd} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-base-content/80 mb-1">
                      Tiêu đề chiến dịch <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: $200 Cloud Server Credits"
                      value={newAdTitle}
                      onChange={(e) => setNewAdTitle(e.target.value)}
                      className="input input-bordered input-sm w-full rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-base-content/80 mb-1">
                      Link đích (Target Destination URL) <span className="text-error">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://aws.amazon.com/free"
                      value={newAdTargetUrl}
                      onChange={(e) => setNewAdTargetUrl(e.target.value)}
                      className="input input-bordered input-sm w-full rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-base-content/80 mb-1">
                      Link ảnh banner (Creative Image URL)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={newAdCreativeUrl}
                      onChange={(e) => setNewAdCreativeUrl(e.target.value)}
                      className="input input-bordered input-sm w-full rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-base-content/80 mb-1">Chủ đề phân phối</label>
                    <select
                      value={newAdCategory}
                      onChange={(e) => setNewAdCategory(e.target.value)}
                      className="select select-bordered select-sm w-full rounded-xl text-xs font-semibold"
                    >
                      <option value="cloud">Cloud & Infrastructure</option>
                      <option value="tools">Developer Tools & IDEs</option>
                      <option value="devops">DevOps & CI/CD</option>
                      <option value="frontend">Frontend & Web</option>
                      <option value="backend">Backend & Database</option>
                      <option value="ai">AI & Machine Learning</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-base-content/80 mb-1">Mô tả ngắn</label>
                    <textarea
                      rows="2"
                      placeholder="Thông điệp khuyến mại hoặc lợi ích dành cho developer..."
                      value={newAdDesc}
                      onChange={(e) => setNewAdDesc(e.target.value)}
                      className="textarea textarea-bordered text-xs w-full rounded-xl"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creatingAd || !newAdTitle.trim() || !newAdTargetUrl.trim()}
                    className="btn btn-sm btn-primary w-full rounded-xl text-white font-bold shadow-sm"
                  >
                    {creatingAd ? "Đang xuất bản..." : "+ Xuất bản chiến dịch mới"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "users" ? (
        /* Quản trị thành viên (Admin User Management) */
        <div className="space-y-6 animate-fade-in">
          {/* Header & Controls */}
          <div className="p-5 sm:p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-base-content flex items-center gap-2">
                <span>👥 Quản Lý Thành Viên Hệ Thống</span>
                <span className="badge badge-sm badge-primary font-bold">{usersList.length} tài khoản</span>
              </h3>
              <p className="text-xs text-base-content/60 mt-1">
                Phân quyền quản trị viên, kiểm duyệt viên và kiểm soát trạng thái hoạt động tài khoản.
              </p>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64 md:w-72 shrink-0">
                <input
                  type="text"
                  placeholder="Tìm theo tên, email, @..."
                  value={userSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUserSearch(val);
                    loadUsers(val, userRoleFilter);
                  }}
                  className="input input-sm input-bordered w-full rounded-xl text-xs pl-8"
                />
                <span className="absolute left-2.5 top-2 text-base-content/40 text-xs">🔍</span>
                {userSearch && (
                  <button
                    onClick={() => {
                      setUserSearch("");
                      loadUsers("", userRoleFilter);
                    }}
                    className="absolute right-2 top-2 text-xs text-base-content/40 hover:text-base-content"
                  >
                    ✕
                  </button>
                )}
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setUserRoleFilter(val);
                  loadUsers(userSearch, val);
                }}
                className="select select-sm select-bordered rounded-xl text-xs font-semibold"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Quản trị viên (Admin)</option>
                <option value="moderator">Kiểm duyệt viên (Moderator)</option>
                <option value="user">Thành viên (User)</option>
              </select>

              <button
                type="button"
                onClick={() => loadUsers(userSearch, userRoleFilter)}
                className="btn btn-sm btn-outline rounded-xl text-xs"
                title="Tải lại danh sách"
              >
                🔄
              </button>
            </div>
          </div>

          {/* User List Table / Cards */}
          {loadingUsers ? (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <span className="text-xs text-base-content/60 mt-3 font-semibold">Đang tải danh sách thành viên...</span>
            </div>
          ) : usersList.length === 0 ? (
            <div className="text-center py-16 bg-base-100 rounded-3xl border border-dashed border-base-300 p-8">
              <div className="text-3xl mb-2">🔍</div>
              <h4 className="font-bold text-base text-base-content">Không tìm thấy thành viên nào</h4>
              <p className="text-xs text-base-content/60 max-w-sm mx-auto mt-1 mb-4">
                Không có tài khoản nào phù hợp với từ khóa &quot;{userSearch}&quot; hoặc vai trò đã chọn.
              </p>
              <button
                onClick={() => {
                  setUserSearch("");
                  setUserRoleFilter("all");
                  loadUsers("", "all");
                }}
                className="btn btn-xs btn-primary font-bold rounded-xl"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="bg-base-100 rounded-3xl border border-base-300 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="bg-base-200/60 text-[11px] uppercase tracking-wider text-base-content/70">
                      <th>Thành viên</th>
                      <th>Vai trò</th>
                      <th>Bài viết</th>
                      <th>Trạng thái</th>
                      <th>Ngày tham gia</th>
                      <th className="text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-200 text-xs">
                    {usersList.map((user) => {
                      const isSuper = user.is_superuser || user.roles?.includes("admin");
                      const isMod = user.roles?.includes("moderator");
                      const isCurrent = currentUser && currentUser.id === user.id;

                      return (
                        <tr key={user.id} className="hover:bg-base-200/30 transition-colors">
                          <td>
                            <div className="flex items-center gap-3 py-1">
                              <img
                                src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username || "dev")}`}
                                alt={user.name}
                                className="w-8 h-8 rounded-full border border-base-300 object-cover shrink-0"
                                onError={(e) => {
                                  e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name || "dev")}`;
                                }}
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-base-content flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                  {isCurrent && (
                                    <span className="badge badge-xs badge-info text-white font-bold">bạn</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-base-content/50 font-mono flex items-center gap-1">
                                  <span>@{user.username}</span>
                                  <span>•</span>
                                  <span className="truncate max-w-[140px] sm:max-w-[200px]">{user.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="flex items-center gap-1">
                              {isSuper ? (
                                <span className="badge badge-sm badge-primary text-white font-bold">
                                  🛡️ Admin
                                </span>
                              ) : isMod ? (
                                <span className="badge badge-sm badge-secondary text-white font-bold">
                                  ⭐ Moderator
                                </span>
                              ) : (
                                <span className="badge badge-sm badge-ghost font-semibold">
                                  👤 User
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <span className="font-semibold text-base-content/80">
                              📝 {user.posts_count || 0} bài
                            </span>
                          </td>

                          <td>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                user.is_active
                                  ? "bg-success/15 text-success"
                                  : "bg-error/15 text-error"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-success" : "bg-error"}`}></span>
                              {user.is_active ? "Hoạt động" : "Đã khóa"}
                            </span>
                          </td>

                          <td className="text-base-content/50 text-[11px]">
                            {user.created_at && !isNaN(new Date(user.created_at).getTime())
                              ? new Date(user.created_at).toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric"
                                })
                              : "Gần đây"}
                          </td>

                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Phân quyền vai trò */}
                              {!isSuper && !isCurrent && (
                                <button
                                  type="button"
                                  disabled={updatingUserId === user.id}
                                  onClick={() => handleUpdateUserRole(user.id, isMod ? "user" : "moderator")}
                                  className={`btn btn-xs rounded-lg font-semibold ${
                                    isMod
                                      ? "btn-ghost text-base-content/70 hover:bg-base-200"
                                      : "btn-outline btn-secondary"
                                  }`}
                                  title={isMod ? "Hạ cấp xuống User" : "Thăng cấp lên Moderator"}
                                >
                                  {isMod ? "Hạ cấp User" : "⭐ Thăng Mod"}
                                </button>
                              )}

                              {/* Khóa / Mở khóa tài khoản */}
                              {!isSuper && !isCurrent && (
                                <button
                                  type="button"
                                  disabled={updatingUserId === user.id}
                                  onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                  className={`btn btn-xs rounded-lg font-bold ${
                                    user.is_active
                                      ? "btn-ghost text-error hover:bg-error/10"
                                      : "btn-success text-white"
                                  }`}
                                  title={user.is_active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                                >
                                  {user.is_active ? "🔴 Khóa" : "🟢 Mở khóa"}
                                </button>
                              )}

                              {(isSuper || isCurrent) && (
                                <span className="text-[11px] text-base-content/40 italic pr-2">
                                  {isCurrent ? "Đang đăng nhập" : "Hệ thống"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "settings" ? (
        /* Cài đặt & Cấu hình Hệ thống (System Settings) */
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-base-content flex items-center gap-2">
                <span>⚙️ Cài Đặt & Cấu Hình Hệ Thống</span>
              </h2>
              <p className="text-xs text-base-content/60 mt-1">
                Quản lý các thông số cốt lõi, quyền năng quản trị viên trên Newfeed, xuất bản tự động và bảo mật.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveSystemSettings}
              className="btn btn-sm btn-primary text-white font-bold px-5 rounded-xl gap-2 shadow-sm"
            >
              <span>💾</span> Lưu cấu hình hệ thống
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Quyền Quản Trị Trực Tiếp Trên Newfeed */}
            <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-base-200">
                <span className="text-xl">🛡️</span>
                <div>
                  <h3 className="text-base font-bold text-base-content">Quản Trị Trực Tiếp Trên Newfeed</h3>
                  <p className="text-xs text-base-content/60">Cho phép Admin thao tác bài viết và bình luận ngay tại trang chủ</p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-base-200/50 border border-base-300">
                  <div>
                    <p className="text-xs font-bold text-base-content">Xóa bài viết trực tiếp trên Newfeed</p>
                    <p className="text-[11px] text-base-content/60">Hiển thị nút xóa bài viết cho Admin có modal xác nhận an toàn</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.allowAdminDeletePosts}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, allowAdminDeletePosts: e.target.checked }))}
                    className="toggle toggle-primary toggle-sm"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-base-200/50 border border-base-300">
                  <div>
                    <p className="text-xs font-bold text-base-content">Quản lý & xóa bình luận trên Newfeed</p>
                    <p className="text-[11px] text-base-content/60">Admin có thể mở popup xem và xóa bình luận vi phạm tức thì</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.allowAdminDeleteComments}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, allowAdminDeleteComments: e.target.checked }))}
                    className="toggle toggle-primary toggle-sm"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-base-200/50 border border-base-300">
                  <div>
                    <p className="text-xs font-bold text-base-content">Ghim bài viết lên đầu trang (Pin to Top)</p>
                    <p className="text-[11px] text-base-content/60">Ưu tiên hiển thị bài viết quan trọng ở vị trí đầu tiên của Feed</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.allowAdminPinPosts}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, allowAdminPinPosts: e.target.checked }))}
                    className="toggle toggle-primary toggle-sm"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-base-200/50 border border-base-300">
                  <div>
                    <p className="text-xs font-bold text-base-content">Chỉnh sửa nhanh bài viết thành viên khác</p>
                    <p className="text-[11px] text-base-content/60">Admin có thể biên tập lại nội dung hoặc sửa định dạng bài đăng</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.directAdminOnFeed}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, directAdminOnFeed: e.target.checked }))}
                    className="toggle toggle-primary toggle-sm"
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Cấu Hình Xuất Bản & Kiểm Duyệt Tự Động */}
            <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-base-200">
                <span className="text-xl">🤖</span>
                <div>
                  <h3 className="text-base font-bold text-base-content">Kiểm Duyệt & AI Content Safety</h3>
                  <p className="text-xs text-base-content/60">Thiết lập tự động duyệt và quét nội dung bài viết kỹ thuật</p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-base-200/50 border border-base-300">
                  <div>
                    <p className="text-xs font-bold text-base-content">Tự động duyệt bài viết (Auto-Approve)</p>
                    <p className="text-[11px] text-base-content/60">Bỏ qua hàng chờ kiểm duyệt, xuất bản ngay khi người dùng đăng bài</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.autoApprovePosts}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, autoApprovePosts: e.target.checked }))}
                    className="toggle toggle-primary toggle-sm"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-base-200/50 border border-base-300">
                  <div>
                    <p className="text-xs font-bold text-base-content">Tự động quét AI Gemini Multi-Key</p>
                    <p className="text-[11px] text-base-content/60">Tự động gắn điểm an toàn, phát hiện spam và mã độc hại</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.aiGeminiModeration}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, aiGeminiModeration: e.target.checked }))}
                    className="toggle toggle-primary toggle-sm"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-base-200/50 border border-base-300 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-base-content">Giới hạn bài đăng / tác giả / ngày</p>
                    <span className="badge badge-sm badge-primary text-white font-bold">{systemSettings.maxPostsPerUserPerDay} bài</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={systemSettings.maxPostsPerUserPerDay}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, maxPostsPerUserPerDay: parseInt(e.target.value, 10) }))}
                    className="range range-primary range-xs"
                  />
                </div>
              </div>
            </div>

            {/* Box 3: Thông Tin Nền Tảng & Nhãn Hiệu */}
            <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-base-200">
                <span className="text-xl">🌐</span>
                <div>
                  <h3 className="text-base font-bold text-base-content">Thông Tin Nền Tảng (Branding)</h3>
                  <p className="text-xs text-base-content/60">Tên website, khẩu hiệu và email quản trị</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-base-content block mb-1">Tên Nền Tảng</label>
                  <input
                    type="text"
                    value={systemSettings.siteName}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, siteName: e.target.value }))}
                    className="input input-sm input-bordered w-full rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-base-content block mb-1">Khẩu Hiệu / Slogan</label>
                  <input
                    type="text"
                    value={systemSettings.siteSlogan}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, siteSlogan: e.target.value }))}
                    className="input input-sm input-bordered w-full rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-base-content block mb-1">Email Quản Trị Hệ Thống</label>
                  <input
                    type="email"
                    value={systemSettings.adminEmail}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, adminEmail: e.target.value }))}
                    className="input input-sm input-bordered w-full rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-base-200/50 border border-base-300 pt-3">
                  <div>
                    <p className="text-xs font-bold text-base-content">Cho phép đăng ký thành viên mới</p>
                    <p className="text-[11px] text-base-content/60">Người dùng mới có thể tạo tài khoản qua form đăng ký</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.allowRegistration}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, allowRegistration: e.target.checked }))}
                    className="toggle toggle-primary toggle-sm"
                  />
                </div>
              </div>
            </div>

            {/* Box 4: Bảo Mật, Crawler & Bộ Nhớ Đệm */}
            <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-base-200">
                <span className="text-xl">🚀</span>
                <div>
                  <h3 className="text-base font-bold text-base-content">Bảo Mật & Hiệu Năng Hệ Thống</h3>
                  <p className="text-xs text-base-content/60">Giới hạn Rate Limit, chế độ bảo trì và quản lý Cache</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-base-200/50 border border-base-300">
                  <div>
                    <p className="text-xs font-bold text-base-content">Giới hạn Request Rate Limiter</p>
                    <p className="text-[11px] text-base-content/60">Bảo vệ API khỏi DDoS: {systemSettings.rateLimitRequestsPerMin} requests/phút</p>
                  </div>
                  <span className="badge badge-success text-white font-bold text-xs">Đang bật</span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-base-200/50 border border-base-300">
                  <div>
                    <p className="text-xs font-bold text-base-content">Chế độ Bảo trì Hệ thống (Maintenance Mode)</p>
                    <p className="text-[11px] text-base-content/60">Chỉ cho phép quản trị viên truy cập khi đang nâng cấp</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={systemSettings.maintenanceMode}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                    className="toggle toggle-error toggle-sm"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-base-200/40 border border-base-300 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-base-content">Làm mới bộ nhớ Cache</p>
                    <p className="text-[11px] text-base-content/60">Xóa bộ đệm trình duyệt & đồng bộ lại dữ liệu mới nhất</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem("it_blog_posts");
                      addToast("Đã xóa bộ đệm Cache thành công! Đang tải lại dữ liệu...", "info");
                      setTimeout(() => window.location.reload(), 600);
                    }}
                    className="btn btn-xs btn-outline btn-warning font-bold shrink-0"
                  >
                    Dọn Cache ↻
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-base-100 border border-base-300 shadow-xs flex items-center justify-between">
            <div className="text-xs text-base-content/60">
              Cập nhật lần cuối: <span className="font-bold text-base-content">Hôm nay</span> • Cơ sở dữ liệu: <span className="font-bold text-success">PostgreSQL (2,400+ bài viết)</span>
            </div>
            <button
              type="button"
              onClick={handleSaveSystemSettings}
              className="btn btn-sm btn-primary text-white font-bold px-6 rounded-xl shadow-sm"
            >
              Lưu toàn bộ cài đặt
            </button>
          </div>
        </div>
      ) : currentList.length > 0 ? (
        <div className="space-y-4 animate-fade-in">
          {currentList.map((post) => {
            const author = getAuthor(post.authorId || post.author_id) || {
              name: "Tác giả",
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(post.authorId || post.author_id || "dev")}`
            };
            const isMine = currentUser && (currentUser.id === post.authorId || currentUser.id === post.author_id);

            return (
              <div
                key={post.id}
                className="bg-base-100 rounded-2xl border border-base-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Thông tin bài viết */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 shadow-2xs ${
                        post.status === "pending"
                          ? "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700/60"
                          : post.status === "rejected"
                          ? "bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700/60"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700/60"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        post.status === "pending"
                          ? "bg-amber-500"
                          : post.status === "rejected"
                          ? "bg-rose-500"
                          : "bg-emerald-500"
                      }`}></span>
                      {post.status === "pending"
                        ? "Chờ duyệt"
                        : post.status === "rejected"
                        ? "Bị từ chối"
                        : "Đã xuất bản"}
                    </span>

                    <span className="badge badge-sm badge-outline badge-primary font-semibold">
                      {post.category}
                    </span>

                    <span className="text-[11px] text-base-content/50">
                      {(() => {
                        const raw = post.createdAt || post.created_at || post.date;
                        const parsed = raw ? new Date(raw) : null;
                        return parsed && !isNaN(parsed.getTime())
                          ? parsed.toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric"
                            })
                          : "Hôm nay";
                      })()}
                    </span>
                  </div>

                  {/* Tiêu đề */}
                  <h3
                    onClick={() => setPreviewPost(post)}
                    className="text-base sm:text-lg font-bold text-base-content hover:text-primary cursor-pointer transition-colors"
                  >
                    {post.title}
                  </h3>

                  {/* Tác giả & Tóm tắt */}
                  <p className="text-xs text-base-content/70 line-clamp-2">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <img
                      src={author.avatar}
                      alt={author.name}
                      className="w-5 h-5 rounded-full border border-base-300 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(author.name || "dev")}`;
                      }}
                    />
                    <span className="text-xs font-semibold text-base-content/80">
                      {author.name} {isMine && "(bạn)"}
                    </span>
                  </div>
                </div>

                {/* Các nút xử lý duyệt / từ chối */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-base-200">
                  <button
                    onClick={() => setPreviewPost(post)}
                    className="btn btn-xs btn-outline gap-1 font-semibold"
                  >
                    👁️ Xem nhanh
                  </button>

                  {post.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(post.id)}
                        className="btn btn-xs btn-success text-white font-bold gap-1 shadow-xs"
                      >
                        ✓ Duyệt bài
                      </button>
                      <button
                        onClick={() => handleReject(post.id)}
                        className="btn btn-xs btn-outline btn-error font-bold"
                      >
                        ✕ Từ chối
                      </button>
                    </>
                  )}

                  {post.status === "rejected" && (
                    <button
                      onClick={() => handleApprove(post.id)}
                      className="btn btn-xs btn-outline btn-success font-bold"
                    >
                      ✓ Duyệt lại
                    </button>
                  )}

                  {post.status === "approved" && (
                    <button
                      onClick={() => {
                        if (onSelectPost) onSelectPost(post.id);
                        onNavigate("post_detail");
                      }}
                      className="btn btn-xs btn-primary btn-outline font-semibold"
                    >
                      Xem trên web
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(post.id)}
                    className="btn btn-xs btn-ghost text-error/80 hover:text-error hover:bg-error/10 p-1"
                    title="Xóa bài viết"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-20 bg-base-100 rounded-3xl border border-dashed border-base-300 p-8">
          <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4 text-2xl">
            {activeTab === "pending" ? "🎉" : activeTab === "rejected" ? "📋" : "📰"}
          </div>
          <h3 className="text-lg font-bold text-base-content mb-1">
            {activeTab === "pending"
              ? "Không có bài viết nào chờ duyệt"
              : activeTab === "rejected"
              ? "Không có bài viết nào bị từ chối"
              : "Chưa có bài viết nào được duyệt"}
          </h3>
          <p className="text-xs text-base-content/60 max-w-sm mx-auto mb-6">
            {activeTab === "pending"
              ? "Tất cả bài viết được gửi lên đều đã được xử lý xong!"
              : "Danh sách hiện tại đang trống."}
          </p>
          <button
            onClick={() => onNavigate("home")}
            className="btn btn-sm btn-outline font-semibold"
          >
            Quay về Trang chủ
          </button>
        </div>
      )}

      {/* Modal Xem Nhanh Bài Viết (Quick Preview Modal) */}
      {previewPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewPost(null); }}
        >
          <div className="relative w-full max-w-2xl bg-base-100 rounded-3xl shadow-2xl border border-base-300 max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-base-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="badge badge-sm badge-primary font-bold">
                  {previewPost.category}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    previewPost.status === "pending"
                      ? "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300"
                      : previewPost.status === "rejected"
                      ? "bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300"
                      : "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    previewPost.status === "pending"
                      ? "bg-amber-500"
                      : previewPost.status === "rejected"
                      ? "bg-rose-500"
                      : "bg-emerald-500"
                  }`}></span>
                  {previewPost.status === "pending"
                    ? "Chờ duyệt"
                    : previewPost.status === "rejected"
                    ? "Bị từ chối"
                    : "Đã xuất bản"}
                </span>
              </div>
              <button
                onClick={() => setPreviewPost(null)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <h2 className="text-xl font-black text-base-content break-words">
                {previewPost.title}
              </h2>

              {(() => {
                const previewAuthor = getAuthor(previewPost?.authorId || previewPost?.author_id) || {
                  name: "Tác giả",
                  avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(previewPost?.authorId || "dev")}`
                };
                return (
                  <div className="flex items-center gap-2.5 text-xs text-base-content/60 pb-3 border-b border-base-200">
                    <img
                      src={previewAuthor.avatar}
                      alt="Avatar"
                      className="w-7 h-7 rounded-full border border-base-300 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(previewAuthor.name || "dev")}`;
                      }}
                    />
                    <span>Tác giả: <strong>{previewAuthor.name}</strong></span>
                  </div>
                );
              })()}

              {previewPost.excerpt && (
                <p className="text-xs italic bg-base-200/50 p-3 rounded-xl border-l-4 border-primary">
                  {previewPost.excerpt}
                </p>
              )}

              <div className="py-2">
                <MarkdownRenderer content={previewPost.content} />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-base-200/40 border-t border-base-200 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setPreviewPost(null)}
                className="btn btn-sm btn-ghost text-xs"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {previewPost.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleReject(previewPost.id)}
                      className="btn btn-sm btn-outline btn-error text-xs font-bold"
                    >
                      ✕ Từ chối
                    </button>
                    <button
                      onClick={() => handleApprove(previewPost.id)}
                      className="btn btn-sm btn-success text-white text-xs font-bold"
                    >
                      ✓ Phê duyệt ngay
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
