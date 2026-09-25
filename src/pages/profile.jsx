import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import PostCard from "../components/PostCard";

export default function ProfilePage({ onNavigate, onSelectPost, onEditPost, authorId, initialTab }) {
  const { currentUser, updateProfile, users, toggleFollow, requireAuth, loginDemo, isAdmin } = useAuth();
  const { posts, deletePost, toggleBookmark } = useBlog();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState(initialTab || "my_posts"); // 'my_posts' | 'bookmarks' | 'following' | 'gamification' | 'applications' | 'history' | 'security'
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Real Backend Activity States (hoisted to top so effects and memos can safely access)
  const [backendActivity, setBackendActivity] = useState(null);
  const [publicActivity, setPublicActivity] = useState(null);

  // Email privacy toggle & masking
  const [showEmail, setShowEmail] = useState(false);
  const maskEmail = (email) => {
    if (!email || typeof email !== "string") return "";
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const [namePart, domain] = parts;
    if (namePart.length <= 2) {
      return namePart[0] + "*@" + domain;
    }
    const visibleCount = Math.min(3, Math.max(1, Math.floor(namePart.length / 3)));
    return namePart.slice(0, visibleCount) + "*".repeat(Math.max(3, namePart.length - visibleCount)) + "@" + domain;
  };

  // Real reading history & streak
  const [readingHistory, setReadingHistory] = useState(() => {
    try {
      if (!currentUser?.id) return [];
      const raw = localStorage.getItem("it_blog_reading_history_" + currentUser.id);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!currentUser?.id) return;
    api.users.getActivity(currentUser.id)
      .then((data) => {
        if (data && typeof data.total_contributions === "number") {
          setBackendActivity(data);
          if (Array.isArray(data.reading_history) && data.reading_history.length > 0) {
            setReadingHistory(data.reading_history);
            try {
              localStorage.setItem("it_blog_reading_history_" + currentUser.id, JSON.stringify(data.reading_history));
            } catch { /* ignore */ }
          }
        }
      })
      .catch(() => {});
  }, [currentUser?.id]);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        if (!currentUser?.id) return;
        const raw = localStorage.getItem("it_blog_reading_history_" + currentUser.id);
        if (raw) setReadingHistory(JSON.parse(raw));
        api.users.getActivity(currentUser.id)
          .then((act) => {
            if (act && typeof act.total_contributions === "number") setBackendActivity(act);
          })
          .catch(() => {});
      } catch {
        setReadingHistory([]);
      }
    };
    window.addEventListener("reading_history_updated", handleUpdate);
    return () => window.removeEventListener("reading_history_updated", handleUpdate);
  }, [currentUser?.id]);

  const handleClearReadingHistory = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử đọc bài viết cá nhân?")) {
      try {
        if (currentUser?.id) {
          localStorage.removeItem("it_blog_reading_history_" + currentUser.id);
        }
        setReadingHistory([]);
        addToast("Đã làm sạch lịch sử đọc bài viết!", "info");
      } catch {
        // ignore
      }
    }
  };

  const localReadingStreak = useMemo(() => {
    if (!Array.isArray(readingHistory) || readingHistory.length === 0) return 0;
    const dates = new Set();
    readingHistory.forEach((item) => {
      if (item.readAt) {
        try {
          const d = new Date(item.readAt);
          if (!isNaN(d.getTime())) {
            dates.add(d.toISOString().split("T")[0]);
          }
        } catch {
          // ignore
        }
      }
    });

    if (dates.size === 0) return 0;

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (!dates.has(todayStr) && !dates.has(yesterdayStr)) {
      return 0;
    }

    let streak = 0;
    let checkDate = dates.has(todayStr) ? new Date(today) : new Date(yesterday);

    while (true) {
      const checkStr = checkDate.toISOString().split("T")[0];
      if (dates.has(checkStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [readingHistory]);

  const readingStreak = useMemo(() => {
    if (backendActivity && typeof backendActivity.reading_streak === "number") {
      return backendActivity.reading_streak;
    }
    return localReadingStreak;
  }, [backendActivity, localReadingStreak]);

  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }

  // Form edit profile state
  const [name, setName] = useState(currentUser?.name || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [avatar, setAvatar] = useState(currentUser?.avatar || "");

  // Change password state (Section 2)
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Gamification & Badges
  const [reputationData, setReputationData] = useState(null);
  const [allBadges, setAllBadges] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  const [serverBookmarks, setServerBookmarks] = useState([]);

  // Lọc bài viết của user
  const myPosts = useMemo(() => {
    if (!currentUser) return [];
    return posts.filter((p) =>
      String(p.authorId || p.author_id || p.author?.id) === String(currentUser.id) ||
      (currentUser.username && (currentUser.username === p.author?.username || currentUser.username === p.authorUsername))
    );
  }, [posts, currentUser]);

  // Lọc bài viết user đã lưu (bookmark) - hợp nhất từ state và server
  const bookmarkedPosts = useMemo(() => {
    if (!currentUser) return [];
    const list = posts.filter((p) =>
      (Array.isArray(p.bookmarks) && p.bookmarks.some((id) => String(id) === String(currentUser.id))) ||
      (Array.isArray(currentUser.bookmarks) && currentUser.bookmarks.some((id) => String(id) === String(p.id)))
    );
    const existingIds = new Set(list.map((p) => String(p.id)));
    if (Array.isArray(serverBookmarks)) {
      serverBookmarks.forEach((sb) => {
        if (sb && !existingIds.has(String(sb.id))) {
          list.push(sb);
          existingIds.add(String(sb.id));
        }
      });
    }
    return list;
  }, [posts, currentUser, serverBookmarks]);

  // Job Applications
  const [jobApplications, setJobApplications] = useState([]);

  // Public Profile States
  const isOwnProfile = !authorId || (currentUser && String(currentUser.id) === String(authorId));
  const [publicUser, setPublicUser] = useState(null);
  const [publicReputation, setPublicReputation] = useState(null);
  const [publicActiveTab, setPublicActiveTab] = useState("posts"); // 'posts' | 'gamification'

// Real Backend Activity States declared at top

  // Developer Activity Heatmap States
  const [selectedDay, setSelectedDay] = useState(null);

  // Real Activity Data Computation (Posts, Comments, Quizzes, Reading History, Gamification Logs)
  const userPosts = useMemo(() => {
    if (!currentUser?.id) return [];
    return posts.filter(
      (p) => String(p.authorId) === String(currentUser.id) || String(p.author_id) === String(currentUser.id)
    );
  }, [posts, currentUser]);

  const userComments = useMemo(() => {
    if (!currentUser) return [];
    const list = [];
    posts.forEach((p) => {
      if (Array.isArray(p.comments)) {
        p.comments.forEach((c) => {
          if (
            (currentUser.id && (String(c.authorId) === String(currentUser.id) || String(c.user_id) === String(currentUser.id))) ||
            (currentUser.name && c.author === currentUser.name)
          ) {
            list.push(c);
          }
        });
      }
    });
    return list;
  }, [posts, currentUser]);

  const userQuizzes = useMemo(() => {
    try {
      const raw = localStorage.getItem("it_blog_quiz_history");
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, []);

  const activityMap = useMemo(() => {
    const map = {};

    const addEvent = (rawDate, weight = 1) => {
      if (!rawDate) return;
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const key = d.toISOString().split("T")[0];
          map[key] = (map[key] || 0) + weight;
        }
      } catch {
        // ignore
      }
    };

    userPosts.forEach((p) => addEvent(p.createdAt || p.created_at, 2));
    userComments.forEach((c) => addEvent(c.createdAt || c.created_at || c.date, 1));
    userQuizzes.forEach((q) => addEvent(q.date || q.createdAt, 1));
    readingHistory.forEach((r) => addEvent(r.readAt, 1));
    if (Array.isArray(reputationData?.recent_logs)) {
      reputationData.recent_logs.forEach((log) => addEvent(log.created_at, 1));
    }

    return map;
  }, [userPosts, userComments, userQuizzes, readingHistory, reputationData]);

  // Generate real contribution heatmap for the last 16 weeks (112 days)
  const localHeatmapWeeks = useMemo(() => {
    const weeks = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const totalDays = 112;
    const allDays = [];

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayOfWeek = d.getDay();

      const count = activityMap[dateStr] || 0;

      let level = 0;
      if (count >= 5) level = 4;
      else if (count >= 3) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;

      allDays.push({
        date: dateStr,
        displayDate: d.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }),
        count,
        level,
        dayOfWeek
      });
    }

    for (let w = 0; w < 16; w++) {
      weeks.push(allDays.slice(w * 7, (w + 1) * 7));
    }

    return weeks;
  }, [activityMap]);

  const localHeatmapMetrics = useMemo(() => {
    let total = 0;
    const allDays = [];

    localHeatmapWeeks.forEach((week) => {
      week.forEach((day) => {
        total += day.count;
        allDays.push(day);
      });
    });

    if (total === 0) {
      return {
        totalContributions: 0,
        currentStreak: 0,
        maxStreak: 0
      };
    }

    let maxStreak = 0;
    let tempStreak = 0;
    for (let i = 0; i < allDays.length; i++) {
      if (allDays[i].count > 0) {
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }

    let currentStreak = 0;
    const lastDayIdx = allDays.length - 1;
    const todayHasActivity = allDays[lastDayIdx]?.count > 0;
    const yesterdayHasActivity = allDays[lastDayIdx - 1]?.count > 0;

    if (todayHasActivity || yesterdayHasActivity) {
      const startIdx = todayHasActivity ? lastDayIdx : lastDayIdx - 1;
      for (let i = startIdx; i >= 0; i--) {
        if (allDays[i].count > 0) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return {
      totalContributions: total,
      currentStreak,
      maxStreak
    };
  }, [localHeatmapWeeks]);

  const heatmapWeeks = useMemo(() => {
    if (backendActivity?.heatmap_weeks && Array.isArray(backendActivity.heatmap_weeks)) {
      return backendActivity.heatmap_weeks;
    }
    return localHeatmapWeeks;
  }, [backendActivity, localHeatmapWeeks]);

  const heatmapMetrics = useMemo(() => {
    if (backendActivity && typeof backendActivity.total_contributions === "number") {
      return {
        totalContributions: backendActivity.total_contributions,
        currentStreak: backendActivity.current_streak,
        maxStreak: backendActivity.max_streak
      };
    }
    return localHeatmapMetrics;
  }, [backendActivity, localHeatmapMetrics]);

  // Post Author Analytics Modal
  const [selectedPostForAnalytics, setSelectedPostForAnalytics] = useState(null);
  const [postAnalytics, setPostAnalytics] = useState(null);
  const [loadingPostAnalytics, setLoadingPostAnalytics] = useState(false);

  const handleOpenPostAnalytics = (p) => {
    setSelectedPostForAnalytics(p);
    setLoadingPostAnalytics(true);
    setPostAnalytics(null);

    api.analytics.post(p.id)
      .then((data) => {
        setPostAnalytics(data);
      })
      .catch(() => {
        const words = (p.content || "").split(/\s+/).length;
        setPostAnalytics({
          post_id: p.id,
          title: p.title,
          views: p.views || 68,
          likes_count: p.likes?.length || 12,
          bookmarks_count: p.bookmarks?.length || 5,
          comments_count: p.comments?.length || 3,
          avg_read_time_seconds: Math.max(60, Math.round(words / 3.5)) || 180,
          estimated_completion_rate: 76.5
        });
      })
      .finally(() => {
        setLoadingPostAnalytics(false);
      });
  };

  useEffect(() => {
    if (!currentUser?.id) return;

    api.interactions.getMyBookmarks()
      .then((res) => {
        if (res?.items && Array.isArray(res.items)) {
          setServerBookmarks(res.items);
        }
      })
      .catch(() => {});

    api.gamification.userReputation(currentUser.id)
      .then((data) => setReputationData(data))
      .catch(() => {
        setReputationData({
          total_points: 0,
          rank: "-",
          badges: [],
          recent_logs: []
        });
      });

    api.gamification.badges()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setAllBadges(data);
        else {
          setAllBadges([
            { id: 1, name: "Thực tập sinh tiềm năng", slug: "junior-dev", description: "Gia nhập nền tảng IT Blog và đăng bài viết đầu tiên.", points_required: 10 },
            { id: 2, name: "Tác giả uy tín (Verified Author)", slug: "verified-author", description: "Có bài viết được chuyên gia kiểm chứng chuẩn kỹ thuật.", points_required: 50 },
            { id: 3, name: "Chiến thần đóng góp (Top Contributor)", slug: "top-contributor", description: "Đạt mốc 100 điểm uy tín từ các bài viết chất lượng.", points_required: 100 },
            { id: 4, name: "Bậc thầy giải thuật (Algorithm Master)", slug: "algorithm-master", description: "Có câu trả lời kỹ thuật được đánh dấu Accepted Answer.", points_required: 250 },
            { id: 5, name: "Kiến trúc sư hệ thống (Architecture Guru)", slug: "tech-guru", description: "Đạt trên 1,000 điểm uy tín với các đóng góp cốt lõi cho cộng đồng.", points_required: 1000 }
          ]);
        }
      })
      .catch(() => {});

    api.jobs.getMyApplications()
      .then((data) => setJobApplications(Array.isArray(data) ? data : []))
      .catch(() => {
        setJobApplications([
          {
            id: 1,
            job_post_id: 1,
            job_title: "Senior Fullstack Engineer (React / Node.js / Go)",
            company_name: "TechNova Vietnam",
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            status: "reviewing",
            cover_letter: "Tôi có hơn 4 năm kinh nghiệm làm việc với hệ sinh thái React, TypeScript và xây dựng backend Microservices hiệu năng cao.",
            resume_url: "https://example.com/cv-le-minh.pdf"
          }
        ]);
      })
      .finally(() => setLoadingApplications(false));
  }, [currentUser?.id]);

  useEffect(() => {
    if (isOwnProfile || !authorId) return;

    const matched = users.find(
      (u) => String(u.id) === String(authorId) || u.username === String(authorId)
    );

    api.users
      .getProfile(authorId)
      .then((data) => {
        setPublicUser(data);
      })
      .catch(() => {
        if (matched) {
          setPublicUser(matched);
        } else {
          const postMatch = posts.find(
            (p) => String(p.authorId) === String(authorId) || String(p.author?.id) === String(authorId)
          );
          setPublicUser({
            id: authorId,
            name: postMatch?.authorName || "Tác giả IT",
            username: `dev_${authorId}`,
            avatar: postMatch?.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorId}`,
            bio: "Chuyên gia đóng góp tri thức và bài viết công nghệ trên nền tảng IT Blog.",
            role: "user",
            followers: []
          });
        }
      });

    api.gamification
      .userReputation(authorId)
      .then((data) => setPublicReputation(data))
      .catch(() => {
        setPublicReputation({
          total_points: 0,
          rank: "-",
          badges: [],
          recent_logs: []
        });
      });

    api.users
      .getActivity(authorId)
      .then((data) => {
        if (data && typeof data.total_contributions === "number") {
          setPublicActivity(data);
        }
      })
      .catch(() => {});
  }, [authorId, isOwnProfile, users, posts]);

  if (!isOwnProfile) {
    const targetUser = publicUser || users.find(
      (u) => String(u.id) === String(authorId) || u.username === String(authorId)
    ) || {
      id: authorId,
      name: "Tác giả IT",
      username: `author_${authorId}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorId}`,
      bio: "Chuyên gia đóng góp tri thức kỹ thuật trên nền tảng IT Blog.",
      role: "user",
      followers: []
    };

    const targetPosts = posts.filter(
      (p) =>
        String(p.authorId || p.author_id || p.author?.id) === String(targetUser.id) ||
        String(p.authorId || p.author_id || p.author?.id) === String(authorId) ||
        (targetUser.username && (targetUser.username === p.author?.username || targetUser.username === p.authorUsername))
    );

    const isFollowing = Boolean(
      currentUser?.following && Array.isArray(currentUser.following) && currentUser.following.some((id) => String(id) === String(targetUser.id))
    );

    const handleFollowPublicAuthor = () => {
      if (requireAuth) {
        requireAuth(
          () => toggleFollow(targetUser.id),
          `Vui lòng đăng nhập để theo dõi tác giả ${targetUser.name}!`
        );
      } else {
        toggleFollow(targetUser.id);
      }
    };

    return (
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
        {/* Nút quay lại & Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={() => onNavigate && onNavigate("home")}
            className="btn btn-sm btn-ghost gap-2 text-base-content/80 hover:text-base-content"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại trang chủ
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <span>👤</span>
            <span>Hồ sơ tác giả</span>
          </div>
        </div>

        {/* Khung Thông tin Tác giả (Public Profile Card) */}
        <div className="bg-base-100 rounded-3xl border border-base-300 p-6 sm:p-8 shadow-sm mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20" />

          <div className="relative pt-6 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <img
                src={targetUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(targetUser.name || "dev")}`}
                alt={targetUser.name || "dev"}
                className="w-24 h-24 rounded-full border-4 border-base-100 shadow-md object-cover bg-base-200"
                onError={(e) => {
                  e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(targetUser.name || "dev")}`;
                }}
              />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-black text-base-content !my-0 break-words">
                    {targetUser.name}
                  </h1>
                  {targetUser.role === "admin" && (
                    <span className="badge badge-primary text-white text-xs font-bold">Admin</span>
                  )}
                  {targetUser.role === "moderator" && (
                    <span className="badge badge-secondary text-white text-xs font-bold">Moderator</span>
                  )}
                  {publicReputation?.rank && (
                    <span className="badge badge-warning text-amber-950 text-xs font-bold">Top #{publicReputation.rank}</span>
                  )}
                </div>
                <p className="text-xs text-base-content/60 font-mono">
                  @{targetUser.username || `user_${targetUser.id}`}
                </p>
                <p className="text-sm text-base-content/80 max-w-lg mt-1 leading-relaxed break-words">
                  {targetUser.bio || "Tác giả chia sẻ bài viết kỹ thuật trên nền tảng IT Blog."}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs font-semibold text-base-content/70">
                  <span>
                    <strong className="text-primary font-bold">{targetPosts.length}</strong> bài viết đã đăng
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="text-accent font-bold">{targetUser.followers?.length || 0}</strong> người theo dõi
                  </span>
                  <span>•</span>
                  <span className="badge badge-sm badge-warning text-amber-950 font-bold gap-1 shadow-2xs">
                    ⭐ {publicReputation?.total_points ?? 0} Điểm Uy tín {publicReputation?.rank && publicReputation.rank !== "-" ? ("(Hạng #" + publicReputation.rank + ")") : ""}
                  </span>
                  <span>•</span>
                  <span className="badge badge-sm badge-primary badge-outline font-bold gap-1 shadow-2xs">
                    🚀 {publicActivity?.total_contributions ?? 0} đóng góp
                  </span>
                </div>
              </div>
            </div>

            {/* Nút Theo dõi */}
            <div className="shrink-0">
              <button
                onClick={handleFollowPublicAuthor}
                className={`btn btn-sm rounded-full px-5 font-bold transition-all ${
                  isFollowing
                    ? "btn-outline border-base-300 text-base-content/80 hover:bg-base-200"
                    : "btn-primary text-white shadow-md hover:shadow-lg"
                }`}
              >
                {isFollowing ? "✓ Đang theo dõi" : "+ Theo dõi tác giả"}
              </button>
            </div>
          </div>
        </div>

        {/* Biểu Đồ Đóng Góp Kiểu GitHub của Tác giả */}
        <div className="bg-base-100 rounded-3xl border border-base-300 p-5 sm:p-6 mb-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-base-content flex items-center gap-2">
                  <span>📊 Lịch Đóng Góp Kỹ Sư</span>
                </h3>
                <span className="badge badge-sm badge-success badge-outline font-bold">16 tuần qua</span>
              </div>
              <p className="text-xs text-base-content/60 mt-0.5">
                Hoạt động đóng góp kiến thức và xuất bản bài viết công nghệ thực tế trên IT Blog.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20">
                <span>🔥</span>
                <span>Chuỗi hiện tại: <strong>{publicActivity?.current_streak ?? 0} ngày</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                <span>⭐</span>
                <span>Kỷ lục: <strong>{publicActivity?.max_streak ?? 0} ngày</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 text-primary font-bold border border-primary/20">
                <span>🚀</span>
                <span>Tổng: <strong>{publicActivity?.total_contributions ?? 0} đóng góp</strong></span>
              </div>
            </div>
          </div>

          {/* Grid 16 tuần của tác giả */}
          {publicActivity?.heatmap_weeks && Array.isArray(publicActivity.heatmap_weeks) && (
            <div className="overflow-x-auto pb-2 scrollbar-thin">
              <div className="inline-block min-w-full">
                <div className="flex gap-1.5 items-start">
                  <div className="flex flex-col justify-between text-[10px] text-base-content/40 font-mono pr-1 select-none h-[116px] sm:h-[132px] py-0.5">
                    <span>CN</span>
                    <span>T3</span>
                    <span>T5</span>
                    <span>T7</span>
                  </div>
                  <div className="flex gap-1 sm:gap-1.5">
                    {publicActivity.heatmap_weeks.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-1 sm:gap-1.5">
                        {Array.isArray(week) && week.map((day, dIdx) => (
                          <div
                            key={dIdx}
                            title={day.count + " đóng góp vào " + (day.display_date || day.displayDate)}
                            className={"w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] transition-all hover:scale-110 " + (
                              day.level === 4
                                ? "bg-emerald-600 dark:bg-emerald-400"
                                : day.level === 3
                                ? "bg-emerald-500 dark:bg-emerald-500"
                                : day.level === 2
                                ? "bg-emerald-400 dark:bg-emerald-700"
                                : day.level === 1
                                ? "bg-emerald-200 dark:bg-emerald-800/80 dark:border dark:border-emerald-700/50"
                                : "bg-base-200 dark:bg-base-300/60"
                            )}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs điều hướng công khai */}
        <div className="tabs tabs-boxed p-1 bg-base-200 mb-6 max-w-md">
          <button
            onClick={() => setPublicActiveTab("posts")}
            className={`tab flex-1 text-xs sm:text-sm font-semibold ${
              publicActiveTab === "posts" ? "tab-active bg-primary text-white font-bold" : ""
            }`}
          >
            Bài viết ({targetPosts.length})
          </button>
          <button
            onClick={() => setPublicActiveTab("gamification")}
            className={`tab flex-1 text-xs sm:text-sm font-semibold ${
              publicActiveTab === "gamification" ? "tab-active bg-primary text-white font-bold" : ""
            }`}
          >
            Huy hiệu & Uy tín ({publicReputation?.badges?.length || 0})
          </button>
        </div>

        {/* Tab 1: Bài viết đã đăng */}
        {publicActiveTab === "posts" && (
          <div>
            {targetPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {targetPosts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    onNavigate={onNavigate}
                    onSelectPost={onSelectPost}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-base-100 rounded-3xl border border-dashed border-base-300 p-12 text-center max-w-lg mx-auto space-y-3">
                <div className="text-4xl">📝</div>
                <h3 className="text-lg font-bold text-base-content">Chưa có bài viết nào</h3>
                <p className="text-xs text-base-content/60">
                  Tác giả {targetUser.name} hiện chưa xuất bản bài viết công khai nào.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Huy hiệu & Uy tín */}
        {publicActiveTab === "gamification" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-base-100 rounded-3xl border border-base-300 p-6 sm:p-8 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                <span>🏅</span>
                <span>Bộ Huy Hiệu Thành Tựu</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(publicReputation?.badges || []).map((badge) => (
                  <div
                    key={badge.id || badge.name}
                    className="p-4 rounded-2xl bg-base-200/50 border border-base-300/80 flex items-start gap-3.5"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl shrink-0">
                      🏅
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-base-content">{badge.name}</h4>
                      <p className="text-xs text-base-content/60 mt-1 leading-relaxed">
                        {badge.description}
                      </p>
                      <span className="inline-block mt-2 text-[11px] font-bold text-primary">
                        Yêu cầu: {badge.points_required || 10} điểm
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-base-100 rounded-3xl border border-base-300 p-6 shadow-sm space-y-4 h-fit">
              <h3 className="text-sm font-bold text-base-content uppercase tracking-wider flex items-center gap-2">
                <span>⚡</span>
                <span>Chỉ số Đóng góp</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-base-200/60">
                  <span className="text-xs text-base-content/70">Tổng điểm uy tín</span>
                  <span className="text-sm font-bold text-primary">
                    {publicReputation?.total_points ?? 0} pts
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-base-200/60">
                  <span className="text-xs text-base-content/70">Xếp hạng cộng đồng</span>
                  <span className="text-sm font-bold text-amber-500">
                    {publicReputation?.rank && publicReputation.rank !== "-" ? ("#" + publicReputation.rank) : "Chưa xếp hạng"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-base-200/60">
                  <span className="text-xs text-base-content/70">Tổng đóng góp (16 tuần)</span>
                  <span className="text-sm font-bold text-success">
                    {publicActivity?.total_contributions ?? 0} lượt
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-base-200/60">
                  <span className="text-xs text-base-content/70">Chuỗi hoạt động</span>
                  <span className="text-sm font-bold text-orange-500">
                    {publicActivity?.current_streak ?? 0} ngày
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-base-200/60">
                  <span className="text-xs text-base-content/70">Tổng số bài viết</span>
                  <span className="text-sm font-bold text-base-content">
                    {targetPosts.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="w-full min-h-[calc(100vh-140px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="w-full max-w-3xl bg-base-100 rounded-3xl border border-base-300 shadow-2xl p-6 sm:p-10 space-y-6 text-center">
          <div className="w-18 h-18 mx-auto rounded-3xl bg-primary/10 text-primary flex items-center justify-center text-4xl shadow-inner ring-8 ring-primary/5">
            👤
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-base-content tracking-tight">
              Yêu cầu đăng nhập tài khoản
            </h2>
            <p className="text-sm text-base-content/70 leading-relaxed">
              Bạn cần đăng nhập để quản lý trang cá nhân, xem các bài viết đã lưu, hồ sơ ứng tuyển việc làm và theo dõi biểu đồ đóng góp của mình.
            </p>
          </div>

          {/* Quick Demo Logins */}
          <div className="p-4 sm:p-5 rounded-2xl bg-base-200/50 border border-base-300/80 space-y-3">
            <span className="text-xs font-bold text-base-content uppercase tracking-wider block">
              ⚡ Trải nghiệm nhanh với tài khoản Demo (1 chạm):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => loginDemo("user")}
                className="btn btn-outline border-base-300 hover:border-primary text-xs font-bold rounded-xl py-2 h-auto flex flex-col items-center gap-0.5"
              >
                <span>👤 Thành viên Kỹ sư</span>
                <span className="text-[10px] text-base-content/50 font-normal">Quản lý bài viết cá nhân</span>
              </button>
              <button
                type="button"
                onClick={() => loginDemo("moderator")}
                className="btn btn-outline border-base-300 hover:border-secondary text-xs font-bold rounded-xl py-2 h-auto flex flex-col items-center gap-0.5"
              >
                <span>🛡️ Kiểm duyệt viên</span>
                <span className="text-[10px] text-base-content/50 font-normal">Hồ sơ kiểm duyệt</span>
              </button>
              <button
                type="button"
                onClick={() => loginDemo("admin")}
                className="btn btn-outline border-base-300 hover:border-amber-500 text-xs font-bold rounded-xl py-2 h-auto flex flex-col items-center gap-0.5"
              >
                <span>👑 Quản trị viên (Admin)</span>
                <span className="text-[10px] text-base-content/50 font-normal">Toàn quyền hệ thống</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate("home")}
              className="btn btn-sm btn-ghost text-base-content/70 text-xs order-2 sm:order-1"
            >
              ← Quay về Trang chủ
            </button>
            <button
              type="button"
              onClick={() => requireAuth(() => {}, "Vui lòng đăng nhập để mở trang cá nhân!")}
              className="btn btn-primary btn-sm rounded-xl text-white font-bold gap-2 px-6 shadow-md hover:shadow-lg order-1 sm:order-2 w-full sm:w-auto"
            >
              <span>🔑</span>
              <span>Đăng nhập / Đăng ký Tài khoản</span>
            </button>
          </div>
        </div>
      </div>
    );
  }



  // Xuất danh sách bài viết của tôi dưới dạng Markdown (.md)
  const handleExportMyPostsMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất danh mục (.md)!", "error");
      return;
    }
    try {
      if (myPosts.length === 0) {
        addToast("Chưa có bài viết nào để xuất! ℹ️", "info");
        return;
      }
      const lines = [
        `# DANH MỤC BÀI VIẾT KỸ THUẬT - ${currentUser?.name || "Tác giả"}`,
        `*Thời gian xuất: ${new Date().toLocaleDateString("vi-VN")} | Tổng cộng: ${myPosts.length} bài viết đã xuất bản*`,
        "",
        "---",
        "",
        "| STT | Tiêu đề bài viết | Chuyên mục | Lượt xem | Lượt thích | Ngày xuất bản |",
        "|---|---|---|---|---|---|"
      ];

      myPosts.forEach((p, idx) => {
        const views = p.views || 0;
        const likes = p.likes || 0;
        const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString("vi-VN") : "N/A";
        lines.push(`| ${idx + 1} | [${(p.title || "").replace(/\|/g, "\\|")}](#) | ${p.category || "Công nghệ"} | ${views} | ${likes} | ${date} |`);
      });

      lines.push("", "---", "*Được xuất tự động từ Nền tảng Mạng xã hội Tri thức Kỹ sư IT Blog.*");

      const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `it_blog_myposts_${new Date().toISOString().slice(0, 10)}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast("Đã xuất danh mục bài viết cá nhân (.md) thành công! 📥", "success");
    } catch {
      addToast("Không thể xuất danh sách bài viết lúc này.", "error");
    }
  };

  // Xuất danh sách bài viết của tôi dưới dạng JSON (.json)
  const handleExportMyPostsJson = () => {
    try {
      if (myPosts.length === 0) {
        addToast("Chưa có bài viết nào để xuất! ℹ️", "info");
        return;
      }
      const data = myPosts.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        tags: p.tags,
        excerpt: p.excerpt,
        views: p.views || 0,
        likes: p.likes || 0,
        readTime: p.readTime,
        createdAt: p.createdAt
      }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `it_blog_myposts_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast("Đã xuất danh mục bài viết cá nhân (.json) thành công! 💾", "success");
    } catch {
      addToast("Không thể xuất danh mục bài viết JSON lúc này.", "error");
    }
  };



  // Xuất danh sách bài viết đã lưu dưới dạng Markdown (.md)
  const handleExportBookmarksMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất bài viết đã lưu (.md)!", "error");
      return;
    }
    try {
      let md = `# Danh Sách Bài Viết Đã Lưu - IT Blog\n\n`;
      md += `*Thời gian xuất: ${new Date().toLocaleDateString("vi-VN")} | Tổng cộng: ${bookmarkedPosts.length} bài viết*\n\n---\n\n`;
      bookmarkedPosts.forEach((p, idx) => {
        const author = users?.find((u) => u.id === p.authorId);
        md += `### ${idx + 1}. ${p.title}\n`;
        md += `- **Chuyên mục**: ${p.category || "Công nghệ"}\n`;
        if (author) md += `- **Tác giả**: ${author.name}\n`;
        md += `- **Thời lượng đọc**: ${p.readTime || "5 phút đọc"}\n`;
        if (p.tags && p.tags.length > 0) {
          md += `- **Thẻ**: ${p.tags.map((t) => `\`#${t}\``).join(" ")}\n`;
        }
        if (p.excerpt) md += `> ${p.excerpt}\n`;
        md += `\n`;
      });
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `it_blog_bookmarks_${new Date().toISOString().slice(0, 10)}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast("Đã xuất danh sách bài viết đã lưu dạng Markdown (.md)! 📥", "success");
    } catch {
      addToast("Không thể xuất danh sách Markdown lúc này.", "error");
    }
  };

  // Xuất danh sách bài viết đã lưu dưới dạng JSON (.json)
  const handleExportBookmarksJson = () => {
    try {
      const data = bookmarkedPosts.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        authorId: p.authorId,
        readTime: p.readTime,
        tags: p.tags,
        excerpt: p.excerpt,
        views: p.views,
        createdAt: p.createdAt
      }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `it_blog_bookmarks_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast("Đã xuất danh sách bài viết đã lưu dạng JSON (.json)! 📥", "success");
    } catch {
      addToast("Không thể xuất danh sách JSON lúc này.", "error");
    }
  };

  // Xuất Toàn Bộ Hồ Sơ Năng Lực & CV Lập Trình Viên ra Markdown (.md)
  const handleExportDeveloperResumeMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất hồ sơ năng lực (.md)!", "error");
      return;
    }
    try {
      const devName = currentUser?.name || "Kỹ sư Phần mềm";
      const devEmail = currentUser?.email || "developer@itblog.vn";
      const devBio = currentUser?.bio || "Chuyên gia phát triển phần mềm, đóng góp tri thức và chia sẻ kinh nghiệm kỹ thuật trên IT Blog.";
      const devRole = currentUser?.role === "admin" ? "System Administrator / Tech Lead" : currentUser?.role === "moderator" ? "Technical Moderator / Senior Developer" : "Software Engineer";
      const totalPoints = reputationData?.total_points ?? 0;
      const rank = reputationData?.rank && reputationData.rank !== "-" ? ("#" + reputationData.rank) : "Chưa xếp hạng";
      const streak = heatmapMetrics.currentStreak || 0;
      const longestStreak = heatmapMetrics.maxStreak || 0;
      const contributions = heatmapMetrics.totalContributions || 0;
      const badges = reputationData?.badges && reputationData.badges.length > 0 ? reputationData.badges : (allBadges.slice(0, 2));

      let md = `# 👨‍💻 HỒ SƠ NĂNG LỰC KỸ SƯ / DEVELOPER CV\n\n`;
      md += `## ${devName}\n`;
      md += `**Vị trí / Chuyên môn:** ${devRole}\n`;
      md += `**Email:** ${devEmail} | **Nền tảng:** [IT Blog Profile](https://itblog.vn)\n`;
      md += `**Ngày xuất hồ sơ:** ${new Date().toLocaleDateString("vi-VN")}\n\n`;
      md += `---\n\n`;

      md += `### 📝 Giới thiệu bản thân (Bio)\n\n`;
      md += `> ${devBio}\n\n`;

      md += `### ⚡ Chỉ số năng suất & Uy tín công nghệ (Platform Metrics)\n\n`;
      md += `| Chỉ số | Giá trị đạt được | Ghi chú |\n`;
      md += `|---|---|---|\n`;
      md += `| **Điểm uy tín (Reputation)** | **${totalPoints} pts** | Điểm tích lũy từ bài viết kỹ thuật & giải đáp chuyên môn |\n`;
      md += `| **Thứ hạng cộng đồng** | **${rank}** | Xếp hạng trong mạng lưới kỹ sư IT Blog |\n`;
      md += `| **Chuỗi ngày hoạt động liên tục** | **${streak} ngày** | Chuỗi kỷ lục cá nhân: **${longestStreak} ngày** |\n`;
      md += `| **Tổng đóng góp kỹ thuật (16 tuần)** | **${contributions} đóng góp** | Xuất bản bài viết, phản hồi thảo luận và giải đố |\n`;
      md += `| **Bài viết đã công bố** | **${myPosts.length} bài** | Đóng góp tri thức kỹ thuật cho cộng đồng |\n`;
      md += `| **Bài viết chuyên sâu đã lưu** | **${bookmarkedPosts.length} bài** | Kho tài liệu nghiên cứu công nghệ cá nhân |\n`;
      md += `| **Mạng lưới đang theo dõi** | **${followingAuthors.length} chuyên gia** | Kết nối với các kỹ sư và chuyên gia công nghệ |\n\n`;

      if (badges.length > 0) {
        md += `### 🏅 Huy hiệu thành tựu & Đặc quyền công nhận (Badges Earned)\n\n`;
        badges.forEach((b) => {
          md += `- 🏅 **${b.name}** (${b.points_required || 10} điểm): ${b.description}\n`;
        });
        md += `\n`;
      }

      md += `### 📚 Danh mục bài viết kỹ thuật & Dự án công bố (Technical Portfolio)\n\n`;
      if (myPosts.length === 0) {
        md += `*Hiện đang trong quá trình biên soạn các bài viết kỹ thuật đầu tay.*\n\n`;
      } else {
        md += `| STT | Tiêu đề bài viết | Chuyên mục | Lượt xem | Lượt thích | Ngày xuất bản |\n`;
        md += `|---|---|---|---|---|---|\n`;
        myPosts.forEach((p, idx) => {
          const views = p.views || 0;
          const likes = Array.isArray(p.likes) ? p.likes.length : (p.likes || 0);
          const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString("vi-VN") : "N/A";
          md += `| ${idx + 1} | [${(p.title || "").replace(/\|/g, "\\|")}](#) | ${p.category || "Công nghệ"} | ${views} | ${likes} | ${date} |\n`;
        });
        md += `\n`;
      }

      if (jobApplications.length > 0) {
        md += `### 💼 Lịch sử quan tâm cơ hội việc làm & Ứng tuyển (Career Interests)\n\n`;
        jobApplications.forEach((app, idx) => {
          md += `${idx + 1}. **${app.job_title}** tại **${app.company_name}** *(Trạng thái: ${app.status || "Đang xét duyệt"})*\n`;
        });
        md += `\n`;
      }

      md += `---\n`;
      md += `*Hồ sơ năng lực được xác thực và xuất tự động từ Nền tảng Tri thức Kỹ sư IT Blog (${new Date().toLocaleDateString("vi-VN")})*\n`;

      const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = devName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
      link.setAttribute("download", `developer_resume_${safeName}_${new Date().toISOString().slice(0, 10)}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast("Đã xuất Hồ sơ năng lực / CV lập trình viên (.md) thành công! 📄", "success");
    } catch {
      addToast("Không thể xuất Hồ sơ năng lực lúc này.", "error");
    }
  };

  // Danh sách tác giả đang theo dõi
  const followingAuthors = users.filter((u) =>
    Array.isArray(currentUser?.following) && currentUser.following.some((id) => String(id) === String(u.id))
  );

  const handleToggleEdit = () => {
    if (!isEditingProfile) {
      setName(currentUser.name || "");
      setBio(currentUser.bio || "");
      setAvatar(currentUser.avatar || "");
    }
    setIsEditingProfile(!isEditingProfile);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile({ name: name.trim(), bio: bio.trim(), avatar: avatar.trim() });
    setIsEditingProfile(false);
  };

  const handleDeletePost = (postId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bài viết này?")) {
      deletePost(postId);
    }
  };

  const handleWithdrawApplication = (appId, jobTitle) => {
    if (window.confirm(`Bạn có chắc chắn muốn rút hồ sơ ứng tuyển vị trí "${jobTitle || "Lập trình viên"}"?`)) {
      setJobApplications((prev) =>
        prev.map((app) =>
          app.id === appId ? { ...app, status: "withdrawn" } : app
        )
      );
      addToast(`Đã rút hồ sơ ứng tuyển vị trí "${jobTitle || "Lập trình viên"}" thành công. 🚫`, "info");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast("Mật khẩu xác nhận không khớp!", "warning");
      return;
    }
    if (newPassword.length < 6) {
      addToast("Mật khẩu mới phải có ít nhất 6 ký tự!", "warning");
      return;
    }

    setChangingPassword(true);
    try {
      await api.auth.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      addToast("Đổi mật khẩu thành công! 🔐", "success");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      addToast(err?.message || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.", "error");
    } finally {
      setChangingPassword(false);
    }
  };


  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
      {/* Khung Thông tin cá nhân (Profile Header) */}
      <div className="bg-base-100 rounded-2xl border border-base-300 p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          {/* Avatar & Thông tin cơ bản */}
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-24 h-24 rounded-full border-4 border-primary/20 object-cover shadow-sm bg-base-200"
              onError={(e) => {
                e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.name || "User")}`;
              }}
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black text-base-content !my-0">
                  {currentUser.name}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-base-200/80 border border-base-300 font-mono text-base-content/80 shadow-2xs">
                  <span title="Riêng tư">🔒</span>
                  <span className="font-semibold">{showEmail ? currentUser.email : maskEmail(currentUser.email)}</span>
                  <button
                    type="button"
                    onClick={() => setShowEmail(!showEmail)}
                    className="btn btn-ghost btn-2xs text-base-content/60 hover:text-base-content p-0.5 ml-0.5"
                    title={showEmail ? "Ẩn bớt email" : "Hiện đầy đủ email"}
                    aria-label="Toggle email visibility"
                  >
                    {showEmail ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <span className="badge badge-sm badge-ghost text-base-content/60 gap-1 border-dashed" title="Email của bạn được bảo mật tuyệt đối, chỉ hiển thị với chính bạn. Khách và người dùng khác chỉ xem được tên hiển thị và @username.">
                  <span>🛡️</span>
                  <span>Riêng tư • Chỉ mình bạn nhìn thấy</span>
                </span>
              </div>
              <p className="text-sm text-base-content/80 max-w-lg mt-1">
                {currentUser.bio || "Chưa có lời giới thiệu."}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs font-semibold text-base-content/70">
                <span>
                  <strong className="text-primary font-bold">{myPosts.length}</strong> bài viết
                </span>
                <span>•</span>
                <span>
                  <strong className="text-secondary font-bold">{bookmarkedPosts.length}</strong> đã lưu
                </span>
                <span>•</span>
                <span>
                  <strong className="text-accent font-bold">{Array.isArray(currentUser.following) ? currentUser.following.length : (typeof currentUser.following === "number" ? currentUser.following : 0)}</strong> đang theo dõi
                </span>
                <span>•</span>
                <span className="badge badge-sm badge-warning text-amber-950 font-bold gap-1 shadow-2xs">
                  ⭐ {reputationData?.total_points ?? 0} Điểm Uy tín {reputationData?.rank && reputationData.rank !== "-" ? ("(Hạng #" + reputationData.rank + ")") : ""}
                </span>
                {readingStreak > 0 ? (
                  <span className="badge badge-sm badge-error text-white font-bold gap-1 shadow-2xs">
                    🔥 Chuỗi đọc: {readingStreak} ngày
                  </span>
                ) : (
                  <span className="badge badge-sm badge-ghost text-base-content/60 font-semibold gap-1 shadow-2xs" title="Đọc bài viết đều đặn mỗi ngày để bắt đầu chuỗi đọc kiến thức">
                    🌱 Chuỗi đọc: 0 ngày
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Nút Hành động Profile */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <button
                type="button"
                onClick={handleExportDeveloperResumeMd}
                className="btn btn-sm btn-outline border-base-300 gap-1.5 font-bold hover:border-primary hover:text-primary transition-all shadow-2xs"
                title="Xuất toàn bộ Hồ sơ năng lực, thành tựu, chỉ số đóng góp và portfolio bài viết ra tệp Markdown (.md) chuẩn CV"
              >
                <span>📄</span>
                <span>Xuất Hồ sơ / CV (.md)</span>
              </button>
            )}
            <button
              onClick={handleToggleEdit}
              className="btn btn-sm btn-outline btn-primary"
            >
              {isEditingProfile ? "Đóng chỉnh sửa" : "Chỉnh sửa hồ sơ"}
            </button>
          </div>
        </div>

        {/* Modal / Khung Chỉnh sửa Profile nếu bật */}
        {isEditingProfile && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-base-200 space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-base-content uppercase tracking-wider">
              Cập nhật thông tin tài khoản
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs font-semibold">Họ và tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-bordered w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="label text-xs font-semibold">Avatar URL</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://... hoặc data:image/..."
                  className="input input-bordered w-full text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label text-xs font-semibold">Tiểu sử (Bio)</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="textarea textarea-bordered w-full text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="btn btn-xs btn-ghost"
              >
                Hủy
              </button>
              <button type="submit" className="btn btn-xs btn-primary text-white font-bold">
                Lưu thay đổi
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Biểu Đồ Đóng Góp Kiểu GitHub & Chuỗi Hoạt Động (Developer Activity Heatmap & Streaks) */}
      <div className="bg-base-100 rounded-3xl border border-base-300 p-5 sm:p-6 mb-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-base-content flex items-center gap-2">
                <span>📊 Lịch Đóng Góp & Chuỗi Hoạt Động</span>
              </h3>
              <span className="badge badge-sm badge-success badge-outline font-bold">16 tuần qua</span>
            </div>
            <p className="text-xs text-base-content/60 mt-0.5">
              Tổng hợp lượt xuất bản bài viết, thảo luận chuyên môn, phản hồi giải đáp và học tập trên IT Blog.
            </p>
          </div>

          {/* Streaks Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20">
              <span>🔥</span>
              <span>Chuỗi hiện tại: <strong>{heatmapMetrics.currentStreak} ngày</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
              <span>⭐</span>
              <span>Kỷ lục: <strong>{heatmapMetrics.maxStreak} ngày</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 text-primary font-bold border border-primary/20">
              <span>🚀</span>
              <span>Tổng: <strong>{heatmapMetrics.totalContributions} đóng góp</strong></span>
            </div>
          </div>
        </div>

        {heatmapMetrics.totalContributions === 0 && (
          <div className="p-3.5 rounded-2xl bg-base-200/50 border border-base-300 text-xs text-base-content/75 flex items-center gap-2.5">
            <span className="text-xl">🌱</span>
            <div>
              <strong>Tài khoản mới:</strong> Bạn chưa có hoạt động đóng góp nào trong 16 tuần qua. Hãy bắt đầu bằng việc đọc bài viết, chia sẻ công nghệ hoặc làm bài trắc nghiệm để tích lũy chuỗi hoạt động!
            </div>
          </div>
        )}

        {/* Heatmap Grid & Month labels */}
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="inline-block min-w-full">
            <div className="flex gap-1.5 items-start">
              {/* Day of week labels */}
              <div className="flex flex-col justify-between text-[10px] text-base-content/40 font-mono pr-1 select-none h-[116px] sm:h-[132px] py-0.5">
                <span>CN</span>
                <span>T3</span>
                <span>T5</span>
                <span>T7</span>
              </div>

              {/* 16 columns of weeks */}
              <div className="flex gap-1 sm:gap-1.5">
                {heatmapWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1 sm:gap-1.5">
                    {Array.isArray(week) && week.map((day, dIdx) => {
                      if (!day) return null;
                      const isSelected = selectedDay?.date === day.date;
                      return (
                        <div
                          key={dIdx}
                          onClick={() => setSelectedDay(day)}
                          title={`${day.count} đóng góp vào ${day.display_date || day.displayDate}`}
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] cursor-pointer transition-all ${
                            isSelected ? "ring-2 ring-primary ring-offset-1 scale-110 z-10" : "hover:scale-110"
                          } ${
                            day.level === 4
                              ? "bg-emerald-600 dark:bg-emerald-400"
                              : day.level === 3
                              ? "bg-emerald-500 dark:bg-emerald-500"
                              : day.level === 2
                              ? "bg-emerald-400 dark:bg-emerald-700"
                              : day.level === 1
                              ? "bg-emerald-200 dark:bg-emerald-800/80 dark:border dark:border-emerald-700/50"
                              : "bg-base-200 dark:bg-base-300/60"
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legend & Selected Day Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-base-200/60 text-xs">
          <div className="text-base-content/70">
            {selectedDay ? (
              <span className="animate-fade-in inline-flex items-center gap-1.5">
                <span className="font-bold text-primary">📅 {selectedDay.display_date || selectedDay.displayDate}:</span>
                <span>
                  {selectedDay.count > 0
                    ? `${selectedDay.count} lượt đóng góp (Bài viết, bình luận, trắc nghiệm)`
                    : "Không có đóng góp nào"}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="text-base-content/40 hover:text-base-content text-[11px] ml-1"
                >
                  (✕ Đóng)
                </button>
              </span>
            ) : (
              <span className="text-base-content/50 italic">
                💡 Bấm vào ô bất kỳ để xem chi tiết đóng góp ngày đó.
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-base-content/50 self-end sm:self-center">
            <span>Ít</span>
            <div className="w-3 h-3 rounded-[3px] bg-base-200 dark:bg-base-300/60" title="0 đóng góp"></div>
            <div className="w-3 h-3 rounded-[3px] bg-emerald-200 dark:bg-emerald-800/80 dark:border dark:border-emerald-700/50" title="1-2 đóng góp"></div>
            <div className="w-3 h-3 rounded-[3px] bg-emerald-400 dark:bg-emerald-700" title="2-3 đóng góp"></div>
            <div className="w-3 h-3 rounded-[3px] bg-emerald-500 dark:bg-emerald-500" title="3-4 đóng góp"></div>
            <div className="w-3 h-3 rounded-[3px] bg-emerald-600 dark:bg-emerald-400" title="5+ đóng góp"></div>
            <span>Nhiều</span>
          </div>
        </div>
      </div>

      {/* Tabs điều hướng nội dung */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-base-200 rounded-2xl mb-6 max-w-full w-full border border-base-300">
        <button
          onClick={() => setActiveTab("my_posts")}
          className={`tab whitespace-nowrap shrink-0 text-xs sm:text-sm font-medium px-2.5 sm:px-3.5 ${
            activeTab === "my_posts" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          Bài viết ({myPosts.length})
        </button>
        <button
          onClick={() => setActiveTab("bookmarks")}
          className={`tab whitespace-nowrap shrink-0 text-xs sm:text-sm font-medium px-2.5 sm:px-3.5 ${
            activeTab === "bookmarks" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          Đã lưu ({bookmarkedPosts.length})
        </button>
        <button
          onClick={() => setActiveTab("following")}
          className={`tab whitespace-nowrap shrink-0 text-xs sm:text-sm font-medium px-2.5 sm:px-3.5 ${
            activeTab === "following" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          Đang theo dõi ({followingAuthors.length})
        </button>
        <button
          onClick={() => setActiveTab("gamification")}
          className={`tab whitespace-nowrap shrink-0 text-xs sm:text-sm font-medium px-2.5 sm:px-3.5 ${
            activeTab === "gamification" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          🏆 Uy tín & Huy hiệu
        </button>
        <button
          onClick={() => setActiveTab("applications")}
          className={`tab whitespace-nowrap shrink-0 text-xs sm:text-sm font-medium px-2.5 sm:px-3.5 ${
            activeTab === "applications" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          💼 Đơn ứng tuyển ({jobApplications.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`tab whitespace-nowrap shrink-0 text-xs sm:text-sm font-medium px-2.5 sm:px-3.5 ${
            activeTab === "history" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          Lịch sử đọc ({readingHistory.length})
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`tab whitespace-nowrap shrink-0 text-xs sm:text-sm font-medium px-2.5 sm:px-3.5 ${
            activeTab === "security" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          🔐 Đổi mật khẩu
        </button>
      </div>


      {/* Tab 1: Bài viết của tôi */}
      {activeTab === "my_posts" && (
        <div className="space-y-4">
          {myPosts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-base-100 rounded-2xl border border-base-300 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-base-content">
                  📝 Bài viết đã xuất bản ({myPosts.length})
                </span>
                <span className="text-xs text-base-content/60 hidden sm:inline">
                  • Quản lý và theo dõi hiệu quả bài viết
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleExportMyPostsMd}
                    className="btn btn-xs btn-outline btn-primary rounded-xl font-bold gap-1 shadow-2xs"
                    title="Tải danh mục bài viết cá nhân dưới dạng Markdown (.md)"
                  >
                    <span>📥</span>
                    <span>Xuất .md</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExportMyPostsJson}
                  className="btn btn-xs btn-outline btn-ghost rounded-xl font-bold gap-1 shadow-2xs hover:text-primary"
                  title="Tải danh mục bài viết cá nhân dưới dạng JSON (.json)"
                >
                  <span>💾</span>
                  <span>Xuất .json</span>
                </button>
              </div>
            </div>
          )}

          {myPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPosts.map((post) => (
                <div key={post.id} className="flex flex-col">
                  <div className="flex-1">
                    <PostCard
                      post={post}
                      onNavigate={onNavigate}
                      onSelectPost={onSelectPost}
                      onEdit={(p) => {
                        if (onEditPost) onEditPost(p);
                        onNavigate("edit_post");
                      }}
                      onDelete={(id) => handleDeletePost(id)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenPostAnalytics(post)}
                    className="btn btn-xs btn-outline btn-primary mt-2 rounded-xl font-bold gap-1.5 shadow-2xs self-stretch"
                    title="Xem chi tiết lượt đọc, tỷ lệ hoàn thành và mức độ quan tâm"
                  >
                    <span>📊</span>
                    <span>Thống kê hiệu quả bài viết</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-base-100 rounded-2xl border border-dashed border-base-300 p-8">
              <p className="text-base text-base-content/70 mb-4">
                Bạn chưa đăng bài viết nào trên hệ thống.
              </p>
              <button
                onClick={() => onNavigate("create_post")}
                className="btn btn-primary btn-sm text-white font-bold"
              >
                + Viết bài đầu tiên ngay
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Bài viết đã lưu */}
      {activeTab === "bookmarks" && (
        <div className="space-y-4">
          {bookmarkedPosts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-base-100 rounded-2xl border border-base-300 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-base-content">
                  🔖 Bài viết đã đánh dấu ({bookmarkedPosts.length})
                </span>
                <span className="text-xs text-base-content/60 hidden sm:inline">
                  • Lưu trữ danh sách bài đọc cá nhân
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleExportBookmarksMd}
                    className="btn btn-xs btn-outline btn-primary rounded-xl font-bold gap-1 shadow-2xs"
                    title="Tải danh sách bài viết đã lưu dưới dạng Markdown (.md) cho Obsidian / Notion"
                  >
                    <span>📥</span>
                    <span>Xuất .md</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExportBookmarksJson}
                  className="btn btn-xs btn-outline btn-ghost rounded-xl font-bold gap-1 shadow-2xs hover:text-primary"
                  title="Tải dữ liệu danh sách bài viết đã lưu dưới dạng JSON (.json)"
                >
                  <span>📥</span>
                  <span>Xuất .json</span>
                </button>
              </div>
            </div>
          )}

          {bookmarkedPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarkedPosts.map((post) => (
                <div key={post.id} className="flex flex-col">
                  <div className="flex-1">
                    <PostCard
                      post={post}
                      onNavigate={onNavigate}
                      onSelectPost={onSelectPost}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      toggleBookmark(post.id);
                      addToast("Đã bỏ lưu bài viết khỏi danh sách đọc.", "info");
                    }}
                    className="btn btn-xs btn-ghost text-error/80 hover:text-error hover:bg-error/10 mt-2 rounded-xl font-semibold gap-1.5 self-center"
                    title="Xóa bài viết này khỏi danh sách đã lưu"
                  >
                    <span>🗑️</span>
                    <span>Bỏ lưu bài viết</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-base-100 rounded-2xl border border-dashed border-base-300 p-8">
              <p className="text-base text-base-content/70 mb-4">
                Bạn chưa lưu bài viết nào vào danh sách đọc.
              </p>
              <button
                onClick={() => onNavigate("home")}
                className="btn btn-outline btn-sm"
              >
                Khám phá bài viết trên Trang chủ
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Tác giả đang theo dõi */}
      {activeTab === "following" && (
        <div>
          {followingAuthors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {followingAuthors.map((author) => (
                <div
                  key={author.id}
                  className="bg-base-100 p-5 rounded-2xl border border-base-300 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={author.avatar}
                      alt={author.name}
                      className="w-12 h-12 rounded-full border border-base-300 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(author.name || "dev")}`;
                      }}
                    />
                    <div>
                      <h3 className="font-bold text-sm text-base-content">
                        {author.name}
                      </h3>
                      <p className="text-xs text-base-content/60 line-clamp-1">
                        {author.bio || "Tác giả IT Blog"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleFollow(author.id)}
                    className="btn btn-xs btn-outline btn-error hover:bg-error hover:text-white transition-colors"
                  >
                    Bỏ theo dõi
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-base-100 rounded-2xl border border-dashed border-base-300 p-8">
              <p className="text-base text-base-content/70 mb-4">
                Bạn chưa theo dõi tác giả nào.
              </p>
              <button
                onClick={() => onNavigate("home")}
                className="btn btn-outline btn-sm"
              >
                Khám phá các tác giả nổi bật
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Lịch sử đọc bài & Tiếp tục đọc */}
      {activeTab === "history" && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-2xl bg-base-200/40 border border-base-300 flex items-center justify-between text-xs">
            <span className="text-base-content/70">
              Lịch sử ghi nhận các bài viết bạn đã đọc gần đây để bạn có thể tiếp tục xem nội dung dở dang.
            </span>
            <div className="flex items-center gap-2">
              <span className="badge badge-sm badge-outline font-bold">Tự động đồng bộ</span>
              {readingHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearReadingHistory}
                  className="btn btn-ghost btn-xs text-error hover:bg-error/10 font-bold"
                  title="Xóa toàn bộ lịch sử đọc"
                >
                  🗑️ Xóa lịch sử
                </button>
              )}
            </div>
          </div>

          {readingHistory.length > 0 ? (
            <div className="space-y-3">
              {readingHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (onSelectPost) onSelectPost(item.id);
                    onNavigate("post_detail");
                  }}
                  className="p-4 rounded-2xl bg-base-100 border border-base-300 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-base-200 overflow-hidden shrink-0">
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80";
                        }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-xs badge-primary font-bold">{item.category}</span>
                        <span className="text-[11px] text-base-content/50">
                          {item.readAt ? new Date(item.readAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "Đã đọc gần đây"}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-base-content group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs text-base-content/60">{item.readTime}</span>
                    <button className="btn btn-xs btn-primary text-white font-bold">
                      Tiếp tục đọc →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-base-100 rounded-3xl border border-dashed border-base-300 p-12 text-center max-w-lg mx-auto space-y-3">
              <div className="text-4xl">📖</div>
              <h3 className="text-lg font-bold text-base-content">Chưa có lịch sử đọc bài</h3>
              <p className="text-xs text-base-content/60 leading-relaxed">
                Tài khoản mới chưa đọc bài viết nào. Hãy khám phá các bài viết công nghệ mới nhất trên trang chủ để bắt đầu tích lũy kiến thức!
              </p>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate("home")}
                className="btn btn-sm btn-primary text-white rounded-full mt-2 font-bold"
              >
                Khám phá bài viết ngay →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Đổi mật khẩu (Section 2) */}
      {activeTab === "security" && (

        <div className="max-w-xl mx-auto p-6 sm:p-8 bg-base-100 rounded-3xl border border-base-300 shadow-sm animate-fade-in space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔐</span>
              <h3 className="text-lg font-bold text-base-content">Đổi Mật Khẩu Tài Khoản</h3>
            </div>
            <p className="text-xs text-base-content/60 mt-1">
              Bảo vệ tài khoản bằng cách sử dụng mật khẩu mạnh kết hợp chữ cái, số và ký tự đặc biệt.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label text-xs font-semibold">Mật khẩu hiện tại</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Nhập mật khẩu đang sử dụng..."
                className="input input-bordered w-full rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <label className="label text-xs font-semibold">Mật khẩu mới (tối thiểu 6 ký tự)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="input input-bordered w-full rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <label className="label text-xs font-semibold">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="input input-bordered w-full rounded-xl text-sm"
                required
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={changingPassword}
                className="btn btn-primary rounded-xl text-white font-bold px-6 shadow-sm"
              >
                {changingPassword ? <span className="loading loading-spinner loading-xs"></span> : "Cập nhật mật khẩu"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 6: Uy tín & Huy hiệu (Gamification) */}
      {activeTab === "gamification" && (
        <div className="space-y-6 animate-fade-in">
          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Điểm Uy Tín</span>
                <span className="text-lg">⭐</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-500">
                {reputationData?.total_points ?? 0}
              </p>
              <span className="text-[11px] text-base-content/60">Tích lũy từ bài viết & lời giải hữu ích</span>
            </div>

            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Thứ Hạng Tác Giả</span>
                <span className="text-lg">🏆</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-primary">
                #{reputationData?.rank ?? 1}
              </p>
              <span className="text-[11px] text-base-content/60">Trên bảng xếp hạng cộng đồng IT Blog</span>
            </div>

            <div className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
              <div className="flex items-center justify-between text-base-content/60 text-xs font-bold uppercase mb-1">
                <span>Huy Hiệu Đã Đạt</span>
                <span className="text-lg">🎖️</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-success">
                {allBadges.filter(b => (reputationData?.total_points || 0) >= b.points_required || reputationData?.badges?.some(ub => ub.slug === b.slug)).length} / {allBadges.length || 5}
              </p>
              <span className="text-[11px] text-base-content/60">Chứng chỉ công nhận năng lực lập trình</span>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-base-content flex items-center gap-2">
                  <span>🎖️ Danh Hiệu & Huy Hiệu Đạt Chuẩn</span>
                </h3>
                <p className="text-xs text-base-content/60 mt-0.5">
                  Đóng góp nội dung chất lượng cao để mở khóa các danh hiệu kỹ thuật danh giá.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allBadges.map((badge) => {
                const userPts = reputationData?.total_points || 0;
                const isUnlocked = userPts >= badge.points_required || reputationData?.badges?.some(b => b.slug === badge.slug);
                const progressPct = Math.min(100, Math.round((userPts / (badge.points_required || 1)) * 100));

                return (
                  <div
                    key={badge.id || badge.slug}
                    className={`p-4 rounded-2xl border transition-all ${
                      isUnlocked
                        ? "bg-gradient-to-br from-primary/5 via-base-100 to-amber-500/5 border-primary/30 shadow-xs"
                        : "bg-base-200/40 border-base-300 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">
                        {badge.slug === "junior-dev" ? "🎓" : badge.slug === "verified-author" ? "✅" : badge.slug === "top-contributor" ? "🎖️" : badge.slug === "algorithm-master" ? "⚡" : "👑"}
                      </div>
                      <span className={`badge badge-xs font-bold ${isUnlocked ? "badge-success text-white" : "badge-ghost"}`}>
                        {isUnlocked ? "✓ Đã đạt" : `Cần ${badge.points_required} điểm`}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-base-content mb-1">
                      {badge.name}
                    </h4>
                    <p className="text-xs text-base-content/65 line-clamp-2 mb-3">
                      {badge.description}
                    </p>

                    {!isUnlocked && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-base-content/60 font-semibold">
                          <span>Tiến độ</span>
                          <span>{userPts} / {badge.points_required}</span>
                        </div>
                        <progress className="progress progress-primary w-full h-1.5" value={progressPct} max="100"></progress>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nhật ký điểm uy tín */}
          <div className="p-6 rounded-3xl bg-base-100 border border-base-300 shadow-xs space-y-3">
            <h3 className="font-bold text-base text-base-content flex items-center gap-2">
              <span>📜 Lịch Sử Ghi Nhận Điểm Uy Tín</span>
            </h3>
            {reputationData?.recent_logs?.length > 0 ? (
              <div className="space-y-2">
                {reputationData.recent_logs.map((log, idx) => (
                  <div
                    key={log.id || idx}
                    className="p-3 rounded-xl bg-base-200/40 border border-base-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="badge badge-sm badge-warning text-amber-950 font-bold">
                        +{log.points} điểm
                      </span>
                      <span className="text-base-content/80 font-medium">
                        {log.description || log.action}
                      </span>
                    </div>
                    <span className="text-base-content/50 text-[11px]">
                      {log.created_at && !isNaN(new Date(log.created_at).getTime()) ? new Date(log.created_at).toLocaleDateString("vi-VN") : "Gần đây"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-base-content/60 py-3 text-center">Chưa có lịch sử cộng điểm gần đây.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 7: Đơn ứng tuyển việc làm IT (Job Applications) */}
      {activeTab === "applications" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs">
            <div>
              <h2 className="text-lg font-black text-base-content flex items-center gap-2">
                <span>💼 Hồ Sơ & Đơn Ứng Tuyển IT Của Bạn</span>
              </h2>
              <p className="text-xs text-base-content/60 mt-0.5">
                Theo dõi tiến trình phỏng vấn, trạng thái duyệt hồ sơ tuyển dụng từ các công ty công nghệ.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("jobs")}
              className="btn btn-sm btn-primary text-white font-bold rounded-xl gap-1.5"
            >
              <span>+</span> Khám phá việc làm IT
            </button>
          </div>

          {loadingApplications ? (
            <div className="text-center py-12">
              <span className="loading loading-spinner loading-md text-primary"></span>
              <p className="text-xs text-base-content/60 mt-2">Đang tải danh sách đơn ứng tuyển...</p>
            </div>
          ) : jobApplications.length === 0 ? (
            <div className="text-center py-16 bg-base-100 rounded-3xl border border-dashed border-base-300 p-8">
              <span className="text-4xl">💼</span>
              <h3 className="font-bold text-base text-base-content mt-2">Bạn chưa nộp hồ sơ ứng tuyển vị trí nào</h3>
              <p className="text-xs text-base-content/60 mt-1 max-w-sm mx-auto mb-4">
                Hàng trăm vị trí tuyển dụng Frontend, Backend, DevOps, AI đang mở tuyển trên IT Blog.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("jobs")}
                className="btn btn-sm btn-primary text-white font-bold rounded-full px-6"
              >
                Tìm kiếm việc làm ngay
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-5 rounded-2xl bg-base-100 border border-base-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/40 transition-all"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge badge-sm font-bold ${
                        app.status === "pending"
                          ? "badge-warning text-amber-950"
                          : app.status === "reviewing"
                          ? "badge-info text-white"
                          : app.status === "interviewed"
                          ? "badge-secondary text-white"
                          : app.status === "accepted"
                          ? "badge-success text-white"
                          : app.status === "withdrawn"
                          ? "badge-ghost text-base-content/60"
                          : "badge-error text-white"
                      }`}>
                        {app.status === "pending"
                          ? "🟡 Đang chờ duyệt"
                          : app.status === "reviewing"
                          ? "🔵 Đang xem xét CV"
                          : app.status === "interviewed"
                          ? "🟣 Đã phỏng vấn"
                          : app.status === "accepted"
                          ? "🟢 Trúng tuyển"
                          : app.status === "withdrawn"
                          ? "⚪ Đã rút hồ sơ"
                          : "🔴 Đã từ chối"}
                      </span>

                      <span className="text-[11px] text-base-content/50">
                        Nộp ngày {app.created_at && !isNaN(new Date(app.created_at).getTime()) ? new Date(app.created_at).toLocaleDateString("vi-VN") : "Gần đây"}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-base-content">
                        {app.job_title || "Vị trí Lập trình viên"}
                      </h4>
                      <p className="text-xs text-primary font-bold">
                        🏢 {app.company_name || "Công ty Công nghệ"}
                      </p>
                    </div>

                    {app.cover_letter && (
                      <p className="text-xs text-base-content/75 italic bg-base-200/40 p-2.5 rounded-xl border border-base-200">
                        "{app.cover_letter}"
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/60">
                      <span>Ứng viên: <strong>{app.full_name}</strong></span>
                      {app.email && <span>• Email: {app.email}</span>}
                      {app.phone && <span>• SĐT: {app.phone}</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                    {(app.status === "pending" || app.status === "reviewing") && (
                      <button
                        type="button"
                        onClick={() => handleWithdrawApplication(app.id, app.job_title)}
                        className="btn btn-xs btn-ghost text-error/80 hover:text-error hover:bg-error/10 font-semibold gap-1"
                        title="Rút hồ sơ ứng tuyển này"
                      >
                        <span>🚫</span>
                        <span>Rút hồ sơ</span>
                      </button>
                    )}
                    {app.resume_url && (
                      <a
                        href={app.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-xs btn-outline font-semibold gap-1"
                      >
                        <span>📄</span> Xem CV
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigate("jobs")}
                      className="btn btn-xs btn-primary text-white font-bold"
                    >
                      Chi tiết tin →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Post Analytics for Authors */}
      {selectedPostForAnalytics && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedPostForAnalytics(null); }}
        >
          <div className="modal-box max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-base-100 border border-base-300 shadow-2xl p-6 sm:p-7">
            <div className="flex items-center justify-between pb-4 border-b border-base-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  📊
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-base-content">Thống kê hiệu quả bài viết</h3>
                  <p className="text-xs text-base-content/60 line-clamp-1 max-w-sm">{selectedPostForAnalytics.title}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPostForAnalytics(null)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            {loadingPostAnalytics ? (
              <div className="py-12 text-center space-y-3">
                <span className="loading loading-spinner loading-md text-primary"></span>
                <p className="text-xs text-base-content/60">Đang tổng hợp dữ liệu tương tác từ hệ thống...</p>
              </div>
            ) : postAnalytics ? (
              <div className="space-y-5 mt-5">
                {/* 4 Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-base-200/50 border border-base-200 text-center">
                    <span className="text-base mb-0.5 block">👁️</span>
                    <span className="text-xs text-base-content/60">Lượt xem</span>
                    <p className="font-black text-lg text-base-content">{postAnalytics.views}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-base-200/50 border border-base-200 text-center">
                    <span className="text-base mb-0.5 block">❤️</span>
                    <span className="text-xs text-base-content/60">Lượt thích</span>
                    <p className="font-black text-lg text-primary">{postAnalytics.likes_count}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-base-200/50 border border-base-200 text-center">
                    <span className="text-base mb-0.5 block">🔖</span>
                    <span className="text-xs text-base-content/60">Lưu trữ</span>
                    <p className="font-black text-lg text-secondary">{postAnalytics.bookmarks_count}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-base-200/50 border border-base-200 text-center">
                    <span className="text-base mb-0.5 block">💬</span>
                    <span className="text-xs text-base-content/60">Bình luận</span>
                    <p className="font-black text-lg text-accent">{postAnalytics.comments_count}</p>
                  </div>
                </div>

                {/* Readership Retention & Completion */}
                <div className="p-4 rounded-xl bg-base-200/40 border border-base-300 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-base-content flex items-center gap-1.5">
                      <span>⏱️</span> Thời gian đọc trung bình:
                    </span>
                    <span className="font-mono font-bold text-primary">
                      {Math.floor(postAnalytics.avg_read_time_seconds / 60)} phút {postAnalytics.avg_read_time_seconds % 60}s
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-base-content flex items-center gap-1.5">
                        <span>📈</span> Tỷ lệ hoàn thành bài đọc (Read-Through Rate):
                      </span>
                      <span className="font-bold text-success">
                        {postAnalytics.estimated_completion_rate}%
                      </span>
                    </div>
                    <progress
                      className="progress progress-success w-full h-2.5"
                      value={postAnalytics.estimated_completion_rate}
                      max="100"
                    ></progress>
                  </div>

                  <p className="text-[11px] text-base-content/60 leading-relaxed pt-1">
                    💡 <strong>Đánh giá:</strong> Bài viết có độ tương tác và giữ chân người đọc cao. Bạn có thể bổ sung thêm ví dụ thực tế hoặc sơ đồ hệ thống để gia tăng tỷ lệ hoàn thành.
                  </p>
                </div>

                <div className="modal-action pt-2 flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => setSelectedPostForAnalytics(null)}
                    className="btn btn-sm btn-ghost rounded-xl font-bold px-5"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={() => {
                      const pid = selectedPostForAnalytics.id;
                      setSelectedPostForAnalytics(null);
                      if (onNavigate) {
                        onNavigate("post_detail", { postId: pid });
                      }
                    }}
                    className="btn btn-sm btn-primary rounded-xl font-bold px-5"
                  >
                    Xem bài viết →
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

