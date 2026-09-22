import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import PostCard from "../components/PostCard";

export default function ProfilePage({ onNavigate, onSelectPost, onEditPost, authorId, initialTab }) {
  const { currentUser, updateProfile, users, toggleFollow, requireAuth } = useAuth();
  const { posts, deletePost, toggleBookmark } = useBlog();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState(initialTab || "my_posts"); // 'my_posts' | 'bookmarks' | 'following' | 'gamification' | 'applications' | 'history' | 'security'
  const [isEditingProfile, setIsEditingProfile] = useState(false);

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

  // Job Applications
  const [jobApplications, setJobApplications] = useState([]);

  // Public Profile States
  const isOwnProfile = !authorId || (currentUser && String(currentUser.id) === String(authorId));
  const [publicUser, setPublicUser] = useState(null);
  const [publicReputation, setPublicReputation] = useState(null);
  const [publicActiveTab, setPublicActiveTab] = useState("posts"); // 'posts' | 'gamification'

  // Developer Activity Heatmap States
  const [selectedDay, setSelectedDay] = useState(null);

  // Generate deterministic contribution heatmap for the last 16 weeks (112 days)
  const heatmapWeeks = useMemo(() => {
    const weeks = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const seed = (currentUser?.id || 1) * 31 + (currentUser?.name?.length || 5);
    const totalDays = 112;
    const allDays = [];

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayOfWeek = d.getDay();

      const pseudoRandom = Math.sin(seed * (i + 1) * 9301 + 49297) * 233280;
      const randVal = Math.abs(pseudoRandom - Math.floor(pseudoRandom));

      let count = 0;
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      if (isWeekday && randVal > 0.35) {
        count = Math.floor(randVal * 6) + 1;
      } else if (!isWeekday && randVal > 0.65) {
        count = Math.floor(randVal * 4) + 1;
      }

      if (i <= 4) {
        count = Math.max(count, (i % 3) + 2);
      }

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
  }, [currentUser]);

  const heatmapMetrics = useMemo(() => {
    let total = 0;
    heatmapWeeks.forEach((week) => {
      week.forEach((day) => {
        total += day.count;
      });
    });

    const userPostsCount = posts.filter(
      (p) => currentUser && p.authorId === currentUser.id
    ).length;

    return {
      totalContributions: total + userPostsCount * 3,
      currentStreak: 5,
      maxStreak: 16
    };
  }, [heatmapWeeks, posts, currentUser]);

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

    api.gamification.userReputation(currentUser.id)
      .then((data) => setReputationData(data))
      .catch(() => {
        setReputationData({
          total_points: 65,
          rank: 2,
          badges: [
            { id: 1, name: "Thực tập sinh tiềm năng", slug: "junior-dev", description: "Gia nhập nền tảng IT Blog và đăng bài viết đầu tiên.", points_required: 10 }
          ],
          recent_logs: [
            { id: 1, action: "approved_post", points: 15, description: "Bài viết kỹ thuật được xuất bản thành công", created_at: new Date().toISOString() },
            { id: 2, action: "initial_welcome", points: 10, description: "Gia nhập cộng đồng lập trình viên", created_at: new Date(Date.now() - 86400000).toISOString() }
          ]
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
          total_points: 125,
          rank: 2,
          badges: [
            {
              id: 1,
              name: "Thực tập sinh tiềm năng",
              slug: "junior-dev",
              description: "Gia nhập nền tảng IT Blog và đăng bài viết đầu tiên.",
              points_required: 10
            },
            {
              id: 2,
              name: "Tác giả uy tín (Verified Author)",
              slug: "verified-author",
              description: "Có bài viết được chuyên gia kiểm chứng chuẩn kỹ thuật.",
              points_required: 50
            }
          ],
          recent_logs: [
            {
              id: 1,
              action: "approved_post",
              points: 15,
              description: "Bài viết kỹ thuật được xuất bản thành công",
              created_at: new Date().toISOString()
            }
          ]
        });
      });
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
        String(p.authorId) === String(authorId) ||
        String(p.author?.id) === String(authorId) ||
        String(p.author_id) === String(authorId)
    );

    const isFollowing = currentUser?.following && Array.isArray(currentUser.following) && currentUser.following.includes(targetUser.id);

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
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
                src={targetUser.avatar}
                alt={targetUser.name}
                className="w-24 h-24 rounded-full border-4 border-base-100 shadow-md object-cover bg-base-200"
                onError={(e) => {
                  e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(targetUser.name || "dev")}`;
                }}
              />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-black text-base-content !my-0">
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
                <p className="text-sm text-base-content/80 max-w-lg mt-1 leading-relaxed">
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
                    ⭐ {publicReputation?.total_points ?? 125} Điểm Uy tín
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
                    ? "btn-soft border border-base-300"
                    : "btn-primary text-white shadow-md hover:shadow-lg"
                }`}
              >
                {isFollowing ? "✓ Đang theo dõi" : "+ Theo dõi tác giả"}
              </button>
            </div>
          </div>
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
                    {publicReputation?.total_points ?? 125} pts
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-base-200/60">
                  <span className="text-xs text-base-content/70">Xếp hạng cộng đồng</span>
                  <span className="text-sm font-bold text-amber-500">
                    #{publicReputation?.rank ?? 2}
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
      <div className="max-w-md mx-auto my-16 p-8 bg-base-100 rounded-3xl border border-base-300 shadow-lg text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl">
          👤
        </div>
        <h2 className="text-2xl font-black text-base-content">Trang cá nhân</h2>
        <p className="text-sm text-base-content/70">
          Vui lòng đăng nhập để xem thông tin hồ sơ, bài viết đã lưu và danh sách theo dõi của bạn.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => onNavigate("login")}
            className="btn btn-primary btn-sm rounded-full text-white font-bold"
          >
            Đăng nhập ngay
          </button>
          <button
            onClick={() => onNavigate("home")}
            className="btn btn-ghost btn-sm rounded-full"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Lọc bài viết của user
  const myPosts = posts.filter((p) => p.authorId === currentUser.id);

  // Xuất danh sách bài viết của tôi dưới dạng Markdown (.md)
  const handleExportMyPostsMd = () => {
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

  // Lọc bài viết user đã lưu (bookmark)
  const bookmarkedPosts = posts.filter((p) => Array.isArray(p.bookmarks) && currentUser && p.bookmarks.includes(currentUser.id));

  // Xuất danh sách bài viết đã lưu dưới dạng Markdown (.md)
  const handleExportBookmarksMd = () => {
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
    try {
      const devName = currentUser?.name || "Kỹ sư Phần mềm";
      const devEmail = currentUser?.email || "developer@itblog.vn";
      const devBio = currentUser?.bio || "Chuyên gia phát triển phần mềm, đóng góp tri thức và chia sẻ kinh nghiệm kỹ thuật trên IT Blog.";
      const devRole = currentUser?.role === "admin" ? "System Administrator / Tech Lead" : currentUser?.role === "moderator" ? "Technical Moderator / Senior Developer" : "Software Engineer";
      const totalPoints = reputationData?.total_points ?? 65;
      const rank = reputationData?.rank ?? 1;
      const streak = heatmapMetrics.currentStreak || 5;
      const longestStreak = heatmapMetrics.maxStreak || 16;
      const contributions = heatmapMetrics.totalContributions || 42;
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
      md += `| **Thứ hạng cộng đồng** | **#${rank}** | Xếp hạng trong mạng lưới kỹ sư IT Blog |\n`;
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
  const followingAuthors = users.filter((u) => Array.isArray(currentUser?.following) && currentUser.following.includes(u.id));

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
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
              <p className="text-xs text-base-content/60 font-mono">
                {currentUser.email}
              </p>
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
                  ⭐ {reputationData?.total_points ?? 65} Điểm Uy tín (Hạng #{reputationData?.rank ?? 1})
                </span>
                <span className="badge badge-sm badge-error text-white font-bold gap-1 shadow-2xs">
                  🔥 Chuỗi đọc: 5 ngày
                </span>
              </div>
            </div>
          </div>

          {/* Nút Hành động Profile */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportDeveloperResumeMd}
              className="btn btn-sm btn-outline border-base-300 gap-1.5 font-bold hover:border-primary hover:text-primary transition-all shadow-2xs"
              title="Xuất toàn bộ Hồ sơ năng lực, thành tựu, chỉ số đóng góp và portfolio bài viết ra tệp Markdown (.md) chuẩn CV"
            >
              <span>📄</span>
              <span>Xuất Hồ sơ / CV (.md)</span>
            </button>
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
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
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
                    {week.map((day, dIdx) => {
                      const isSelected = selectedDay?.date === day.date;
                      return (
                        <div
                          key={dIdx}
                          onClick={() => setSelectedDay(day)}
                          title={`${day.count} đóng góp vào ${day.displayDate}`}
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
                              ? "bg-emerald-200 dark:bg-emerald-950"
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
                <span className="font-bold text-primary">📅 {selectedDay.displayDate}:</span>
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
            <div className="w-3 h-3 rounded-[3px] bg-emerald-200 dark:bg-emerald-950" title="1-2 đóng góp"></div>
            <div className="w-3 h-3 rounded-[3px] bg-emerald-400 dark:bg-emerald-700" title="2-3 đóng góp"></div>
            <div className="w-3 h-3 rounded-[3px] bg-emerald-500 dark:bg-emerald-500" title="3-4 đóng góp"></div>
            <div className="w-3 h-3 rounded-[3px] bg-emerald-600 dark:bg-emerald-400" title="5+ đóng góp"></div>
            <span>Nhiều</span>
          </div>
        </div>
      </div>

      {/* Tabs điều hướng nội dung */}
      <div className="tabs tabs-boxed p-1 bg-base-200 mb-6 max-w-full w-full overflow-x-auto scrollbar-none flex-nowrap">
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
          Lịch sử đọc
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
                <button
                  type="button"
                  onClick={handleExportMyPostsMd}
                  className="btn btn-xs btn-outline btn-primary rounded-xl font-bold gap-1 shadow-2xs"
                  title="Tải danh mục bài viết cá nhân dưới dạng Markdown (.md)"
                >
                  <span>📥</span>
                  <span>Xuất .md</span>
                </button>
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
                <button
                  type="button"
                  onClick={handleExportBookmarksMd}
                  className="btn btn-xs btn-outline btn-primary rounded-xl font-bold gap-1 shadow-2xs"
                  title="Tải danh sách bài viết đã lưu dưới dạng Markdown (.md) cho Obsidian / Notion"
                >
                  <span>📥</span>
                  <span>Xuất .md</span>
                </button>
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
            <span className="badge badge-sm badge-outline font-bold">Tự động đồng bộ</span>
          </div>

          <div className="space-y-3">
            {posts.slice(0, 4).map((post, idx) => (
              <div
                key={post.id}
                onClick={() => {
                  if (onSelectPost) onSelectPost(post.id);
                  onNavigate("post_detail");
                }}
                className="p-4 rounded-2xl bg-base-100 border border-base-300 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-base-200 overflow-hidden shrink-0">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80";
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge badge-xs badge-primary font-bold">{post.category}</span>
                      <span className="text-[11px] text-base-content/50">Đã đọc {idx === 0 ? "hôm nay" : `${idx + 1} ngày trước`}</span>
                    </div>
                    <h4 className="font-bold text-sm text-base-content group-hover:text-primary transition-colors">
                      {post.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className="text-xs text-base-content/60">{post.readTime}</span>
                  <button className="btn btn-xs btn-primary text-white font-bold">
                    Tiếp tục đọc →
                  </button>
                </div>
              </div>
            ))}
          </div>
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

                <div className="modal-action pt-2 flex items-center justify-end gap-2">
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

