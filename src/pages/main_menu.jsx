import { useState, useEffect, useMemo } from "react";
import Banner_full from "../components/banner_main";
import PostCard from "../components/PostCard";
import PostCardSkeleton from "../components/PostCardSkeleton";
import DeveloperAdCard from "../components/DeveloperAdCard";
import { useBlog } from "../context/BlogContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { CATEGORIES, POPULAR_TAGS } from "../data/seedData";
import { api } from "../services/api";

const formatFeedPost = (p) => ({
  id: p.id,
  title: p.title,
  slug: p.slug,
  content: p.content || p.excerpt || "",
  excerpt: p.excerpt || "",
  coverImage: p.cover_image || p.coverImage || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80",
  views: p.views || 0,
  likes: p.likes_count !== undefined ? Array(p.likes_count).fill(1) : (Array.isArray(p.likes) ? p.likes : []),
  bookmarks: Array.isArray(p.bookmarks) ? p.bookmarks : [],
  comments: p.comments_count !== undefined ? Array(p.comments_count).fill(1) : (Array.isArray(p.comments) ? p.comments : []),
  category: p.category?.name || p.category_name || p.category || "Công nghệ",
  tags: p.tags?.map((t) => (typeof t === "string" ? t : t.name)) || [],
  authorId: p.author?.id || p.author_id || 1,
  authorName: p.author?.name || p.author_name || "Tác giả IT",
  authorAvatar: p.author?.avatar || p.author_avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  readTime: p.read_time || "5 phút đọc",
  createdAt: p.created_at || p.createdAt || new Date().toISOString(),
  date: (p.created_at && !isNaN(new Date(p.created_at).getTime())) ? new Date(p.created_at).toLocaleDateString("vi-VN") : "Hôm nay",
  status: p.status || "approved",
});

export default function Menu_main({ onNavigate, onSelectPost, onEditPost }) {
  const {
    posts,
    filteredPosts,
    searchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedTag,
    setSelectedTag,
    sortBy,
    setSortBy,
    timeRange,
    setTimeRange,
    readDuration,
    setReadDuration,
    resetFilters,
    deletePost
  } = useBlog();

  const { users, currentUser, requireAuth, toggleFollow } = useAuth();
  const { addToast } = useToast();

  const isAdmin = Boolean(
    currentUser && (
      currentUser.role === "admin" ||
      currentUser.role === "moderator" ||
      currentUser.is_superuser ||
      (Array.isArray(currentUser.roles) && (
        currentUser.roles.includes("admin") ||
        currentUser.roles.includes("moderator") ||
        currentUser.roles.some((r) =>
          typeof r === "string" ? r === "admin" || r === "moderator" : r?.name === "admin" || r?.name === "moderator"
        )
      )) ||
      currentUser.email === "admin@itblog.dev" ||
      currentUser.username === "admin"
    )
  );
  const [isLoading, setIsLoading] = useState(false);
  const [categoriesList, setCategoriesList] = useState(CATEGORIES);
  const [popularTagsList, setPopularTagsList] = useState(POPULAR_TAGS);

  // Smart Discovery Feed Mode
  const [feedMode, setFeedMode] = useState("all"); // 'all' | 'for_you' | 'following' | 'trending'
  const [feedPosts, setFeedPosts] = useState([]);
  const [isFeedLoading, setIsFeedLoading] = useState(false);

  const [layoutMode, setLayoutMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("layout") === "grid" ? "grid" : "sidebar";
    } catch {
      return "sidebar";
    }
  });

  // Danh sách bài viết đọc nhiều nhất
  const trendingPosts = [...posts]
    .filter((p) => p.status === "approved" || !p.status)
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 3);

  // Tắt trạng thái loading ban đầu sau khi component mount & nạp categories/tags
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      try {
        const params = new URLSearchParams(window.location.search);
        const scrollY = parseInt(params.get("scroll") || "0", 10);
        if (scrollY > 0) {
          window.scrollTo({ top: scrollY, behavior: "instant" });
        }
      } catch (e) {
        console.error(e);
      }
    }, 350);

    // Dynamic categories & tags from backend
    api.categories.list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategoriesList(["Tất cả", ...data.map((c) => c.name)]);
        }
      })
      .catch(() => {});

    api.tags.list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPopularTagsList(data.map((t) => t.name));
        }
      })
      .catch(() => {});

    return () => clearTimeout(timer);
  }, []);

  // Fetch or filter posts based on feedMode
  useEffect(() => {
    if (feedMode === "all") return;

    let isMounted = true;

    if (feedMode === "for_you") {
      api.feeds.forYou()
        .then((res) => {
          const items = res?.items || (Array.isArray(res) ? res : []);
          if (isMounted) {
            if (items.length > 0) {
              setFeedPosts(items.map(formatFeedPost));
            } else {
              // Smart recommendation ranking
              const ranked = [...posts].sort((a, b) => {
                const aScore = (a.isVerified ? 30 : 0) + (a.views || 0) * 0.1 + (Array.isArray(a.likes) ? a.likes.length * 5 : 0);
                const bScore = (b.isVerified ? 30 : 0) + (b.views || 0) * 0.1 + (Array.isArray(b.likes) ? b.likes.length * 5 : 0);
                return bScore - aScore;
              });
              setFeedPosts(ranked.slice(0, 18));
            }
          }
        })
        .catch(() => {
          if (isMounted) {
            const ranked = [...posts].sort((a, b) => {
              const aScore = (a.isVerified ? 30 : 0) + (a.views || 0) * 0.1 + (Array.isArray(a.likes) ? a.likes.length * 5 : 0);
              const bScore = (b.isVerified ? 30 : 0) + (b.views || 0) * 0.1 + (Array.isArray(b.likes) ? b.likes.length * 5 : 0);
              return bScore - aScore;
            });
            setFeedPosts(ranked.slice(0, 18));
          }
        })
        .finally(() => {
          if (isMounted) setIsFeedLoading(false);
        });
    } else if (feedMode === "following") {
      api.feeds.following()
        .then((res) => {
          const items = res?.items || (Array.isArray(res) ? res : []);
          if (isMounted) {
            if (items.length > 0) setFeedPosts(items.map(formatFeedPost));
            else {
              const followingIds = Array.isArray(currentUser?.following) ? currentUser.following : [];
              const followed = posts.filter((p) => followingIds.includes(p.authorId));
              setFeedPosts(followed.length > 0 ? followed : posts.slice(0, 3));
            }
          }
        })
        .catch(() => {
          if (isMounted) {
            const followingIds = Array.isArray(currentUser?.following) ? currentUser.following : [];
            const followed = posts.filter((p) => followingIds.includes(p.authorId));
            setFeedPosts(followed.length > 0 ? followed : posts.slice(0, 3));
          }
        })
        .finally(() => {
          if (isMounted) setIsFeedLoading(false);
        });
    } else if (feedMode === "trending") {
      api.feeds.trending()
        .then((data) => {
          if (isMounted) {
            if (Array.isArray(data) && data.length > 0) setFeedPosts(data.map(formatFeedPost));
            else {
              const sorted = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0));
              setFeedPosts(sorted.slice(0, 6));
            }
          }
        })
        .catch(() => {
          if (isMounted) {
            const sorted = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0));
            setFeedPosts(sorted.slice(0, 6));
          }
        })
        .finally(() => {
          if (isMounted) setIsFeedLoading(false);
        });
    }
  }, [feedMode, currentUser?.id, currentUser?.following, posts]);

  const displayedPosts = useMemo(() => {
    const list = feedMode === "all" ? filteredPosts : feedPosts;
    if (feedMode !== "all") {
      const sorted = [...list];
      if (sortBy === "likes") {
        sorted.sort((a, b) => (Array.isArray(b.likes) ? b.likes.length : (b.likes || 0)) - (Array.isArray(a.likes) ? a.likes.length : (a.likes || 0)));
      } else if (sortBy === "comments") {
        sorted.sort((a, b) => (Array.isArray(b.comments) ? b.comments.length : (b.comments || 0)) - (Array.isArray(a.comments) ? a.comments.length : (a.comments || 0)));
      } else if (sortBy === "views") {
        sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
      } else {
        sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }
      return sorted;
    }
    return list;
  }, [feedMode, filteredPosts, feedPosts, sortBy]);
  const isPostListLoading = isLoading || (feedMode !== "all" && isFeedLoading);

  const isFiltering =
    searchQuery.trim() !== "" ||
    selectedCategory !== "Tất cả" ||
    selectedTag !== "" ||
    sortBy !== "newest" ||
    timeRange !== "all" ||
    readDuration !== "all";

  const handleFollowAuthor = (authorId, authorName) => {
    requireAuth(
      () => toggleFollow(authorId),
      `Vui lòng đăng nhập để theo dõi tác giả ${authorName}!`
    );
  };

  const handleExportFeedMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất dữ liệu Markdown (.md)!", "error");
      return;
    }
    if (displayedPosts.length === 0) {
      addToast("Không có bài viết nào trong danh sách để xuất! ℹ️", "info");
      return;
    }
    const filterInfo = [
      selectedCategory !== "Tất cả" ? `Chuyên mục: ${selectedCategory}` : null,
      selectedTag ? `Thẻ tag: #${selectedTag}` : null,
      searchQuery ? `Từ khóa: "${searchQuery}"` : null,
      feedMode !== "all" ? `Bảng tin: ${feedMode}` : null
    ].filter(Boolean).join(" | ") || "Toàn bộ bài viết";

    const rows = displayedPosts.map((p, idx) => {
      const title = (p.title || "Bài viết").replace(/\|/g, "\\|");
      const author = p.authorName || "Tác giả IT";
      const cat = p.category || "Công nghệ";
      const readTime = p.readTime || "5 phút đọc";
      const date = p.date || "N/A";
      const views = p.views || 0;
      const likes = Array.isArray(p.likes) ? p.likes.length : (p.likes || 0);
      return `| ${idx + 1} | ${title} | ${cat} | ${author} | ${readTime} | ${views} | ${likes} | ${date} |`;
    }).join("\n");

    const mdContent = `# DANH SÁCH BÀI VIẾT KỸ THUẬT - IT BLOG
*Thời gian xuất:* ${new Date().toLocaleString("vi-VN")}
*Bộ lọc:* ${filterInfo}
*Tổng số bài viết:* ${displayedPosts.length}

| STT | Tiêu đề | Chuyên mục | Tác giả | Thời lượng | Lượt xem | Lượt thích | Ngày đăng |
|---|---|---|---|---|---|---|---|
${rows}

---
*Tài liệu được xuất từ Nền tảng Tri thức & Mạng xã hội Kỹ sư IT Blog.*
`;

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `it_blog_reading_list_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Đã tải xuống danh sách bài viết định dạng Markdown (.md)! 📥", "success");
  };

  return (
    <div className="w-full">
      {/* Carousel Banner tiêu điểm */}
      <Banner_full onNavigate={onNavigate} />

      {/* Thân trang chính */}
      <main
        id="posts-container"
        className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 scroll-mt-20"
        >
          {/* Thanh chuyển đổi Discovery Feed Mode */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setFeedMode("all")}
              className={`btn btn-sm rounded-xl font-bold transition-all gap-1.5 shrink-0 whitespace-nowrap ${
                feedMode === "all"
                  ? "btn-primary text-white shadow-sm"
                  : "btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200"
              }`}
            >
              <span>📚</span>
              <span>Khám phá chung</span>
            </button>
            <button
              type="button"
              onClick={() => {
                requireAuth(
                  () => {
                    setIsFeedLoading(true);
                    setFeedMode("for_you");
                  },
                  "Vui lòng đăng nhập để xem nội dung gợi ý cá nhân hóa!"
                );
              }}
              className={`btn btn-sm rounded-xl font-bold transition-all gap-1.5 shrink-0 whitespace-nowrap ${
                feedMode === "for_you"
                  ? "btn-primary text-white shadow-sm"
                  : "btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200"
              }`}
            >
              <span>🎯</span>
              <span>Dành cho bạn (AI Feed)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                requireAuth(
                  () => {
                    setIsFeedLoading(true);
                    setFeedMode("following");
                  },
                  "Vui lòng đăng nhập để xem bài viết từ tác giả đang theo dõi!"
                );
              }}
              className={`btn btn-sm rounded-xl font-bold transition-all gap-1.5 shrink-0 whitespace-nowrap ${
                feedMode === "following"
                  ? "btn-primary text-white shadow-sm"
                  : "btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200"
              }`}
            >
              <span>👥</span>
              <span>Đang theo dõi</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFeedLoading(true);
                setFeedMode("trending");
              }}
              className={`btn btn-sm rounded-xl font-bold transition-all gap-1.5 shrink-0 whitespace-nowrap ${
                feedMode === "trending"
                  ? "btn-primary text-white shadow-sm"
                  : "btn-ghost text-base-content/70 hover:text-base-content hover:bg-base-200"
              }`}
            >
              <span>🔥</span>
              <span>Xu hướng hot</span>
            </button>
          </div>

          {/* Thanh phân loại Danh mục (Category Tabs) - chỉ áp dụng khi xem Khám phá chung */}
          {feedMode === "all" && (
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none border-b border-base-200">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`btn btn-sm rounded-full whitespace-nowrap shrink-0 transition-all font-semibold ${
                    selectedCategory === cat
                      ? "btn-primary text-white shadow-sm"
                      : "btn-ghost text-base-content hover:bg-base-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Thanh công cụ lọc & sắp xếp */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-base-200/50 p-3.5 rounded-xl border border-base-300">
            <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/70">
              <span>
                Tìm thấy <strong className="text-primary font-bold">{displayedPosts.length}</strong> bài viết
              </span>
              {selectedTag && (
                <span className="badge badge-sm badge-secondary text-white gap-1 font-semibold">
                  #{selectedTag}
                  <button onClick={() => setSelectedTag("")} className="hover:text-base-100">
                    ✕
                  </button>
                </span>
              )}
              {isFiltering && (
                <button
                  onClick={resetFilters}
                  className="btn btn-ghost btn-xs text-error font-semibold hover:underline ml-1"
                >
                  Đặt lại bộ lọc
                </button>
              )}
              {isAdmin && displayedPosts.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportFeedMd}
                  className="btn btn-ghost btn-xs text-primary font-bold hover:underline ml-1 flex items-center gap-1"
                  title="Xuất danh sách bài viết đang lọc ra tệp Markdown (.md)"
                >
                  <span>📥</span>
                  <span>Xuất .md</span>
                </button>
              )}
            </div>

            {/* Sắp xếp & Chuyển đổi giao diện hiển thị */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Lọc theo Thời gian xuất bản */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-base-content/70">Thời gian:</span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="select select-xs select-bordered bg-base-100 focus:select-primary font-semibold text-xs"
                >
                  <option value="all">Tất cả thời gian</option>
                  <option value="today">Hôm nay (24h)</option>
                  <option value="week">7 ngày qua</option>
                  <option value="month">30 ngày qua</option>
                </select>
              </div>

              {/* Lọc theo Thời lượng đọc */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-base-content/70">Độ dài:</span>
                <select
                  value={readDuration}
                  onChange={(e) => setReadDuration(e.target.value)}
                  className="select select-xs select-bordered bg-base-100 focus:select-primary font-semibold text-xs"
                >
                  <option value="all">Tất cả độ dài</option>
                  <option value="quick">⚡ Đọc nhanh (&lt; 3p)</option>
                  <option value="medium">📖 Vừa phải (3-7p)</option>
                  <option value="deep">🧠 Chuyên sâu (&gt; 7p)</option>
                </select>
              </div>

              {/* Toggle Chế độ xem: 2 Cột + Sidebar vs Lưới 3 Cột rộng */}
              <div className="hidden sm:flex items-center bg-base-200/80 p-0.5 rounded-lg border border-base-300">
                <button
                  type="button"
                  onClick={() => setLayoutMode("sidebar")}
                  className={`btn btn-xs rounded-md font-semibold transition-all ${
                    layoutMode === "sidebar"
                      ? "btn-primary text-white shadow-xs"
                      : "btn-ghost text-base-content/70 hover:text-base-content"
                  }`}
                  title="Chế độ có Sidebar dính theo trang (không để khoảng trống khi cuộn)"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h10" />
                  </svg>
                  <span className="text-[11px]">Có Sidebar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("grid")}
                  className={`btn btn-xs rounded-md font-semibold transition-all ${
                    layoutMode === "grid"
                      ? "btn-primary text-white shadow-xs"
                      : "btn-ghost text-base-content/70 hover:text-base-content"
                  }`}
                  title="Chế độ lưới 3 cột rộng toàn màn hình (không để thừa khoảng trống bên phải)"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="text-[11px]">Lưới 3 cột rộng</span>
                </button>
              </div>

              {/* Sắp xếp */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-base-content/70">Sắp xếp:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="select select-xs select-bordered bg-base-100 focus:select-primary font-semibold"
                >
                  <option value="newest">⚡ Mới nhất</option>
                  <option value="likes">❤️ Nhiều lượt thích nhất</option>
                  <option value="comments">💬 Nhiều bình luận nhất</option>
                  <option value="views">🔥 Lượt xem nhiều nhất</option>
                </select>
              </div>
            </div>
          </div>

          {/* Khi ở chế độ Lưới 3 cột rộng: hiển thị thanh tác giả tiêu biểu nằm ngang phía trên */}
          {layoutMode === "grid" && (
            <div className="mb-6 bg-base-100 rounded-2xl border border-base-300 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-base-content uppercase tracking-wider flex items-center gap-1.5">
                  <span>⭐ Tác giả nổi bật</span>
                </h3>
                <span className="text-[11px] text-base-content/50">Cộng đồng IT Blog</span>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                {users.slice(0, 6).map((author) => {
                  const isFollowing = currentUser?.following && Array.isArray(currentUser.following) && currentUser.following.includes(author.id);
                  const isMe = currentUser?.id === author.id;
                  return (
                    <div
                      key={author.id}
                      className="flex items-center gap-2 p-2 bg-base-200/50 rounded-xl border border-base-200 shrink-0 hover:bg-base-200 transition-colors"
                    >
                      <img
                        src={author.avatar}
                        alt={author.name}
                        className="w-8 h-8 rounded-full border border-base-300 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(author.name || "dev")}`;
                        }}
                      />
                      <div className="text-left">
                        <p className="text-xs font-bold text-base-content leading-tight max-w-[120px] truncate">
                          {author.name}
                        </p>
                        <p className="text-[10px] text-base-content/60 max-w-[120px] truncate">
                          {author.bio}
                        </p>
                      </div>
                      {isMe ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-full shrink-0 ml-1">
                          Bạn
                        </span>
                      ) : (
                        <button
                          onClick={() => handleFollowAuthor(author.id, author.name)}
                          className={`btn btn-xs rounded-full font-semibold ml-1 transition-all ${
                            isFollowing
                              ? "btn-soft text-[11px] px-2.5 text-success font-bold"
                              : "btn-primary btn-outline text-[11px] px-2.5"
                          }`}
                        >
                          {isFollowing ? "✓ Đang theo dõi" : "+ Theo dõi"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

                    {/* Admin On-Feed Moderation Banner */}
          {isAdmin && (
            <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-primary/15 via-base-100 to-secondary/15 border border-primary/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🛡️</span>
                <div>
                  <p className="font-black text-base-content text-sm">Chế độ Quản trị viên trên Newfeed</p>
                  <p className="text-base-content/70">Bạn có quyền Xóa bài viết, Ghim bài lên đầu trang (📌) và Xóa bình luận trực tiếp trên Feed.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("moderation")}
                className="btn btn-xs btn-primary text-white font-bold rounded-xl px-3.5 gap-1.5 shadow-xs shrink-0 self-start sm:self-center"
              >
                <span>⚙️</span> Cài đặt hệ thống
              </button>
            </div>
          )}

          {/* Bố cục nội dung chính: Tùy theo layoutMode */}
          {layoutMode === "grid" ? (
            /* Chế độ 1: Lưới 3 Cột Rộng Toàn Màn Hình */
            <div>
              {isPostListLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <PostCardSkeleton key={i} />
                  ))}
                </div>
              ) : displayedPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                  {displayedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onNavigate={onNavigate}
                      onSelectPost={onSelectPost}
                      onDelete={(id) => deletePost(id)}
                      onEdit={(p) => {
                        if (onEditPost) onEditPost(p);
                        else onNavigate("edit_post", { post: p });
                      }}
                    />
                  ))}
                </div>
              ) : (
                /* Empty State */
                <div className="text-center py-20 bg-base-100 rounded-2xl border border-dashed border-base-300 p-8">
                  <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4 text-base-content/40">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-base-content mb-1">
                    Chưa có bài viết nào
                  </h3>
                  <p className="text-sm text-base-content/60 max-w-sm mx-auto mb-6">
                    Không tìm thấy bài viết nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại của bạn.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={resetFilters}
                      className="btn btn-outline btn-sm font-semibold"
                    >
                      Đặt lại bộ lọc
                    </button>
                    <button
                      onClick={() => {
                        requireAuth(
                          () => onNavigate("create_post"),
                          "Vui lòng đăng nhập để viết bài mới!"
                        );
                      }}
                      className="btn btn-primary btn-sm text-white font-bold"
                    >
                      + Viết bài đầu tiên
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Chế độ 2: 2 Cột + Sidebar Cố Định (Sticky Top) Không Để Khoảng Trống */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
              {/* Cột chính: Danh sách bài viết (3 Cột trong hệ 4) */}
              <div className="lg:col-span-3">
                {isPostListLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <PostCardSkeleton key={i} />
                    ))}
                  </div>
                ) : displayedPosts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
                    {displayedPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onNavigate={onNavigate}
                        onSelectPost={onSelectPost}
                        onDelete={(id) => deletePost(id)}
                        onEdit={(p) => {
                          if (onEditPost) onEditPost(p);
                          else onNavigate("edit_post", { post: p });
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-base-100 rounded-2xl border border-dashed border-base-300 p-8">
                    <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto mb-4 text-base-content/40">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-base-content mb-1">
                      Chưa có bài viết nào
                    </h3>
                    <p className="text-sm text-base-content/60 max-w-sm mx-auto mb-6">
                      Không tìm thấy bài viết nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại của bạn.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        onClick={resetFilters}
                        className="btn btn-outline btn-sm font-semibold"
                      >
                        Đặt lại bộ lọc
                      </button>
                      <button
                        onClick={() => {
                          requireAuth(
                            () => onNavigate("create_post"),
                            "Vui lòng đăng nhập để viết bài mới!"
                          );
                        }}
                        className="btn btn-primary btn-sm text-white font-bold"
                      >
                        + Viết bài đầu tiên
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar bên phải: STICKY TOP-20 Cuộn theo trang, không bao giờ bị bỏ trống */}
              <aside className="lg:col-span-1 space-y-5 sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto scrollbar-none pr-1">
                {/* Widget 1: Tác giả nổi bật */}
                <div className="bg-base-100 rounded-2xl border border-base-300 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-base-content uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>⭐ Tác giả nổi bật</span>
                  </h3>
                  <div className="space-y-4">
                    {users.slice(0, 4).map((author) => {
                      const isFollowing = currentUser?.following && Array.isArray(currentUser.following) && currentUser.following.includes(author.id);
                      const isMe = currentUser?.id === author.id;

                      return (
                        <div key={author.id} className="flex items-center justify-between gap-3">
                          <div
                            onClick={() => onNavigate && onNavigate("profile", { authorId: author.id })}
                            className="flex items-center gap-2.5 min-w-0 cursor-pointer group/author"
                            title={`Xem hồ sơ của ${author.name}`}
                          >
                            <img
                              src={author.avatar}
                              alt={author.name}
                              className="w-9 h-9 rounded-full border border-base-300 shrink-0 object-cover group-hover/author:ring-2 group-hover/author:ring-primary transition-all"
                              onError={(e) => {
                                e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(author.name || "dev")}`;
                              }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-base-content truncate group-hover/author:text-primary transition-colors">
                                {author.name}
                              </p>
                              <p className="text-[11px] text-base-content/50 truncate">
                                {author.bio || "Tác giả IT"}
                              </p>
                            </div>
                          </div>

                          {isMe ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-full shrink-0">
                              Bạn
                            </span>
                          ) : (
                            <button
                              onClick={() => handleFollowAuthor(author.id, author.name)}
                              className={`btn btn-xs rounded-full shrink-0 font-medium transition-all ${
                                isFollowing
                                  ? "btn-soft text-[11px] font-bold text-success"
                                  : "btn-outline btn-primary text-[11px]"
                              }`}
                            >
                              {isFollowing ? "✓ Đang theo dõi" : "+ Theo dõi"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Widget 2: Đọc nhiều nhất (Trending Posts) */}
                {trendingPosts.length > 0 && (
                  <div className="bg-base-100 rounded-2xl border border-base-300 p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-base-content uppercase tracking-wider mb-4 flex items-center gap-2">
                      <span>🔥 Đọc nhiều nhất</span>
                    </h3>
                    <div className="space-y-3.5">
                      {trendingPosts.map((trendPost, idx) => (
                        <div
                          key={trendPost.id}
                          onClick={() => {
                            if (onSelectPost) onSelectPost(trendPost.id);
                            if (onNavigate) {
                              onNavigate("post_detail", { postId: trendPost.id });
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          className="flex items-start gap-3 group cursor-pointer"
                        >
                          <span className="w-6 h-6 rounded-lg bg-base-200 group-hover:bg-primary group-hover:text-white font-black text-xs flex items-center justify-center shrink-0 transition-colors">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-base-content group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                              {trendPost.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-base-content/50">
                              <span>{trendPost.category}</span>
                              <span>•</span>
                              <span>👁️ {trendPost.views}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Widget 3: Khám phá Tags */}
                <div className="bg-base-100 rounded-2xl border border-base-300 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-base-content uppercase tracking-wider mb-3">
                    🏷️ Thẻ chủ đề phổ biến
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {popularTagsList.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                        className={`badge badge-sm cursor-pointer transition-all ${
                          selectedTag === tag
                            ? "badge-primary text-white font-bold"
                            : "bg-base-200 text-base-content/80 hover:bg-base-300"
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Widget: Quảng bá & Cơ hội Developer */}
                <DeveloperAdCard />

                {/* Widget 4: Kêu gọi đóng góp bài viết */}
                <div className="bg-gradient-to-br from-primary/10 via-base-200 to-secondary/10 rounded-2xl border border-base-300 p-5 text-center space-y-3">
                  <div className="text-2xl">✍️</div>
                  <h4 className="font-bold text-sm text-base-content">
                    Bạn có kiến thức muốn chia sẻ?
                  </h4>
                  <p className="text-xs text-base-content/70">
                    Viết bài ngay hôm nay để cùng phát triển cộng đồng IT Blog lớn mạnh hơn!
                  </p>
                  <button
                    onClick={() => {
                      requireAuth(
                        () => onNavigate("create_post"),
                        "Vui lòng đăng nhập để tạo bài viết mới!"
                      );
                    }}
                    className="btn btn-sm btn-primary w-full text-white font-bold"
                  >
                    Bắt đầu viết bài
                  </button>
                </div>

                {/* Nút Cuộn lên đầu trang */}
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="btn btn-sm btn-ghost w-full gap-2 text-xs text-base-content/60 hover:text-base-content hover:bg-base-200 border border-dashed border-base-300 rounded-xl"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span>Cuộn lên đầu trang ↑</span>
                </button>
              </aside>
            </div>
          )}
        </main>
    </div>
  );
}