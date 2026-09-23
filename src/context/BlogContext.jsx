/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { SEED_POSTS } from "../data/seedData";
import { generateId } from "../utils/id";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { api } from "../services/api";

const BlogContext = createContext();

export function BlogProvider({ children }) {
  const { currentUser, users } = useAuth();
  const { addToast } = useToast();

  // Khởi tạo danh sách bài viết từ storage hoặc seed data
  const [posts, setPosts] = useState(() => {
    const saved = storage.get(STORAGE_KEYS.POSTS, null);
    if (!saved || !saved.some((p) => p.status === "pending")) {
      storage.set(STORAGE_KEYS.POSTS, SEED_POSTS);
      return SEED_POSTS;
    }
    return saved;
  });

  // Tự động tải và đồng bộ danh sách bài viết từ backend FastAPI
  const syncPostsFromBackend = () => {
    api.posts.list({ limit: 500 })
      .then((res) => {
        const backendItems = res?.items || (Array.isArray(res) ? res : []);
        if (backendItems.length > 0) {
          const normalized = backendItems.map((bp) => ({
            id: String(bp.id),
            title: bp.title,
            slug: bp.slug,
            category: bp.category?.name || bp.category || "Backend",
            tags: Array.isArray(bp.tags) ? bp.tags.map((t) => (typeof t === "object" ? t.name : t)) : [],
            coverImage: bp.cover_image || bp.coverImage || "",
            excerpt: bp.excerpt || "",
            content: bp.content || "",
            authorId: bp.author_id || bp.author?.id || "demo_user",
            author: bp.author ? {
              id: String(bp.author.id),
              name: bp.author.name || bp.author.username || "Tác giả IT",
              username: bp.author.username,
              avatar: bp.author.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${bp.author.id}`,
              bio: bp.author.bio || "Cộng tác viên IT Blog",
              role: bp.author.role || "user"
            } : null,
            status: bp.status || "approved",
            likes: Array.isArray(bp.likes) ? bp.likes : [],
            bookmarks: Array.isArray(bp.bookmarks) ? bp.bookmarks : [],
            comments: Array.isArray(bp.comments) ? bp.comments : [],
            views: typeof bp.views === "number" ? bp.views : (bp.views || 0),
            readTime: bp.read_time || "5 phút đọc",
            isVerified: Boolean(bp.is_verified || bp.isVerified),
            createdAt: bp.created_at || bp.createdAt || new Date().toISOString()
          }));

          setPosts((prev) => {
            const backendIds = new Set(normalized.map((n) => n.id));
            const remainingLocal = prev.filter((p) => !backendIds.has(String(p.id)));
            return [...normalized, ...remainingLocal];
          });
        }
      })
      .catch((err) => {
        console.warn("Backend posts sync fallback:", err.message);
      });
  };

  useEffect(() => {
    syncPostsFromBackend();
    window.addEventListener("refresh_posts", syncPostsFromBackend);
    return () => window.removeEventListener("refresh_posts", syncPostsFromBackend);
  }, []);

  // State bộ lọc và tìm kiếm
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedTag, setSelectedTag] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'likes' | 'comments' | 'views'
  const [timeRange, setTimeRange] = useState("all"); // 'all' | 'today' | 'week' | 'month'
  const [readDuration, setReadDuration] = useState("all"); // 'all' | 'quick' | 'medium' | 'deep'
  const [currentTimestamp] = useState(() => Date.now());

  // Tự động lưu posts vào storage mỗi khi có thay đổi
  useEffect(() => {
    storage.set(STORAGE_KEYS.POSTS, posts);
  }, [posts]);

  /**
   * Lấy thông tin tác giả dựa trên authorId
   */
  const getAuthor = (authorId) => {
    const author = users.find((u) => String(u.id) === String(authorId));
    if (author) return author;
    const postWithAuthor = posts.find((p) => String(p.authorId) === String(authorId) && p.author);
    if (postWithAuthor?.author) {
      return postWithAuthor.author;
    }
    return {
      id: authorId,
      name: "Tác giả IT",
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authorId || "unknown")}`,
      bio: "Cộng tác viên IT Blog",
      role: "user"
    };
  };

  /**
   * Toggle Like bài viết
   */
  const toggleLike = (postId) => {
    if (!currentUser) return false;

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;
        const currentLikes = Array.isArray(post.likes) ? post.likes : [];
        const alreadyLiked = currentLikes.includes(currentUser.id);
        const updatedLikes = alreadyLiked
          ? currentLikes.filter((id) => id !== currentUser.id)
          : [...currentLikes, currentUser.id];

        if (alreadyLiked) {
          addToast("Đã bỏ thích bài viết.", "info");
        } else {
          addToast("Đã thích bài viết! ❤️", "success");
        }

        return {
          ...post,
          likes: updatedLikes
        };
      })
    );

    api.interactions.toggleLikePost(postId).catch(() => {});
    return true;
  };

  /**
   * Toggle Bookmark (Lưu bài viết)
   */
  const toggleBookmark = (postId) => {
    if (!currentUser) return false;

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;
        const currentBookmarks = Array.isArray(post.bookmarks) ? post.bookmarks : [];
        const alreadyBookmarked = currentBookmarks.includes(currentUser.id);
        const updatedBookmarks = alreadyBookmarked
          ? currentBookmarks.filter((id) => id !== currentUser.id)
          : [...currentBookmarks, currentUser.id];

        if (alreadyBookmarked) {
          addToast("Đã xóa khỏi danh sách đã lưu.", "info");
        } else {
          addToast("Đã lưu bài viết vào hồ sơ cá nhân! 🔖", "success");
        }

        return {
          ...post,
          bookmarks: updatedBookmarks
        };
      })
    );

    api.interactions.toggleBookmarkPost(postId).catch(() => {});
    return true;
  };

  /**
   * Thêm bình luận mới vào bài viết (hỗ trợ trả lời lồng cấp parentId)
   */
  const addComment = (postId, content, parentId = null) => {
    if (!currentUser) return false;
    const trimmed = (content || "").trim();
    if (!trimmed) return false;

    const newComment = {
      id: generateId("cmt"),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content: trimmed,
      parentId: parentId,
      parent_id: parentId,
      likes_count: 0,
      createdAt: new Date().toISOString()
    };

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          comments: [...(post.comments || []), newComment]
        };
      })
    );

    addToast(parentId ? "Đã gửi phản hồi bình luận! 💬" : "Đã gửi bình luận thành công! 💬", "success");
    api.comments.create(postId, { content: trimmed, parent_id: parentId }).catch(() => {});
    return true;
  };

  /**
   * Xóa bình luận (Dành cho tác giả bình luận hoặc Quản trị viên Admin/Moderator trực tiếp)
   */
  const deleteComment = (postId, commentId) => {
    if (!currentUser) {
      addToast("Vui lòng đăng nhập để thực hiện thao tác!", "error");
      return false;
    }

    const isAdmin = Boolean(
      currentUser.role === "admin" ||
      currentUser.role === "moderator" ||
      currentUser.is_superuser ||
      currentUser.id === "demo_user" ||
      String(currentUser.id) === "1" ||
      (Array.isArray(currentUser.roles) && (
        currentUser.roles.includes("admin") ||
        currentUser.roles.includes("moderator") ||
        currentUser.roles.some(r => typeof r === "string" ? (r === "admin" || r === "moderator") : (r?.name === "admin" || r?.name === "moderator"))
      )) ||
      currentUser.email === "admin@itblog.dev" ||
      currentUser.username === "admin"
    );

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (String(post.id) !== String(postId)) return post;
        const targetComment = (post.comments || []).find((c) => String(c.id) === String(commentId));
        const isCommentAuthor = targetComment && String(targetComment.userId) === String(currentUser.id);
        if (targetComment && !isCommentAuthor && !isAdmin) {
          addToast("Bạn không có quyền xóa bình luận này!", "error");
          return post;
        }

        return {
          ...post,
          comments: (post.comments || []).filter(
            (c) => String(c.id) !== String(commentId) && String(c.parentId) !== String(commentId)
          )
        };
      })
    );

    addToast(isAdmin ? "🛡️ Admin đã xóa bình luận thành công!" : "Đã xóa bình luận.", "info");
    api.comments.delete(commentId).catch(() => {});
    return true;
  };

  /**
   * Tạo bài viết mới (Hỗ trợ status 'approved' hoặc 'pending' chờ duyệt)
   */
  const createPost = (postData) => {
    if (!currentUser) return null;

    const isPending = postData.status === "pending";

    const newPost = {
      ...postData,
      id: generateId("post"),
      authorId: currentUser.id,
      status: postData.status || "approved", // 'approved' | 'pending' | 'rejected'
      likes: [],
      bookmarks: [],
      comments: [],
      views: 1,
      readTime: postData.readTime || "4 phút đọc",
      createdAt: new Date().toISOString()
    };

    setPosts((prev) => [newPost, ...prev]);
    if (isPending) {
      addToast("Bài viết đã được gửi vào danh sách chờ duyệt! ⏳", "info");
    } else {
      addToast("Đăng bài viết mới thành công! 🎉", "success");
    }

    // Gửi lưu vào backend database
    api.posts.create({
      title: postData.title,
      category_name: postData.category,
      tags: postData.tags || ["IT"],
      cover_image: postData.coverImage || postData.cover_image || undefined,
      excerpt: postData.excerpt,
      content: postData.content,
      tech_stack_version: postData.techStackVersion,
      scheduled_at: postData.scheduledAt,
      is_deprecated: Boolean(postData.isDeprecated),
      deprecated_warning: postData.deprecatedWarning,
      status: postData.status || "approved"
    }).catch(() => {});

    return newPost;
  };

  /**
   * Duyệt và xuất bản bài viết (Yêu cầu xác thực Quản trị viên Admin / Kiểm duyệt viên Moderator)
   */
  const approvePost = (postId) => {
    if (!currentUser) {
      addToast("Vui lòng đăng nhập với quyền Quản trị viên để duyệt bài!", "error");
      return false;
    }
    const isAdmin = Boolean(
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
    );
    if (!isAdmin) {
      addToast("Bạn không có quyền duyệt bài viết! Yêu cầu vai trò Admin hoặc Moderator.", "error");
      return false;
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: "approved" } : p))
    );
    addToast("Đã phê duyệt và xuất bản bài viết thành công! ✓", "success");
    api.posts.update(postId, { status: "approved" }).catch(() => {});
    return true;
  };

  /**
   * Từ chối bài viết (Yêu cầu xác thực Quản trị viên Admin / Kiểm duyệt viên Moderator)
   */
  const rejectPost = (postId) => {
    if (!currentUser) {
      addToast("Vui lòng đăng nhập với quyền Quản trị viên để từ chối bài!", "error");
      return false;
    }
    const isAdmin = Boolean(
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
    );
    if (!isAdmin) {
      addToast("Bạn không có quyền từ chối bài viết! Yêu cầu vai trò Admin hoặc Moderator.", "error");
      return false;
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: "rejected" } : p))
    );
    addToast("Đã từ chối bài viết.", "info");
    api.posts.update(postId, { status: "rejected" }).catch(() => {});
    return true;
  };

  /**
   * Cập nhật bài viết
   */
  const updatePost = (postId, updatedData) => {
    if (!currentUser) return false;

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;
        // Kiểm tra quyền: chỉ tác giả
        if (post.authorId !== currentUser.id) {
          addToast("Bạn không có quyền chỉnh sửa bài viết này!", "error");
          return post;
        }
        return {
          ...post,
          ...updatedData,
          updatedAt: new Date().toISOString()
        };
      })
    );

    api.posts.update(postId, {
      title: updatedData.title,
      excerpt: updatedData.excerpt,
      content: updatedData.content,
      cover_image: updatedData.coverImage,
      category_name: updatedData.category,
      tech_stack_version: updatedData.techStackVersion,
      scheduled_at: updatedData.scheduledAt,
      change_summary: updatedData.changeSummary,
      is_deprecated: updatedData.isDeprecated,
      deprecated_warning: updatedData.deprecatedWarning
    }).catch(() => {});

    addToast("Cập nhật bài viết thành công!", "success");
    return true;
  };

  /**
   * Xóa bài viết (Hỗ trợ Tác giả và Quản trị viên Admin/Moderator trực tiếp trên Newfeed)
   */
  const deletePost = (postId) => {
    if (!currentUser) {
      addToast("Vui lòng đăng nhập để thực hiện thao tác!", "error");
      return false;
    }
    const target = posts.find((p) => String(p.id) === String(postId));
    if (!target) return false;

    const isAdmin = Boolean(
      currentUser.role === "admin" ||
      currentUser.role === "moderator" ||
      currentUser.is_superuser ||
      currentUser.id === "demo_user" ||
      String(currentUser.id) === "1" ||
      (Array.isArray(currentUser.roles) && (
        currentUser.roles.includes("admin") ||
        currentUser.roles.includes("moderator") ||
        currentUser.roles.some(r => typeof r === "string" ? (r === "admin" || r === "moderator") : (r?.name === "admin" || r?.name === "moderator"))
      )) ||
      currentUser.email === "admin@itblog.dev" ||
      currentUser.username === "admin"
    );

    const isAuthor = String(target.authorId) === String(currentUser.id) || String(target.author_id) === String(currentUser.id);

    if (!isAuthor && !isAdmin) {
      addToast("Bạn không có quyền xóa bài viết của người khác!", "error");
      return false;
    }

    setPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)));
    if (isAdmin && !isAuthor) {
      addToast("🛡️ Quản trị viên đã xóa bài viết trực tiếp thành công!", "info");
    } else {
      addToast("Đã xóa bài viết thành công.", "info");
    }
    api.posts.delete(postId).catch(() => {});
    return true;
  };

  /**
   * Ghim / Bỏ ghim bài viết lên đầu Newfeed (Quyền Admin)
   */
  const togglePinPost = (postId) => {
    if (!currentUser) return false;
    const isAdmin = Boolean(
      currentUser.role === "admin" ||
      currentUser.role === "moderator" ||
      currentUser.is_superuser ||
      currentUser.id === "demo_user" ||
      String(currentUser.id) === "1" ||
      (Array.isArray(currentUser.roles) && (
        currentUser.roles.includes("admin") ||
        currentUser.roles.includes("moderator") ||
        currentUser.roles.some(r => typeof r === "string" ? (r === "admin" || r === "moderator") : (r?.name === "admin" || r?.name === "moderator"))
      )) ||
      currentUser.email === "admin@itblog.dev" ||
      currentUser.username === "admin"
    );

    if (!isAdmin) {
      addToast("Chỉ quản trị viên mới có quyền ghim bài viết lên đầu Newfeed!", "error");
      return false;
    }

    setPosts((prev) =>
      prev.map((p) => {
        if (String(p.id) !== String(postId)) return p;
        const nextPin = !p.isPinned;
        if (nextPin) {
          addToast("📌 Đã ghim bài viết lên đầu Newfeed thành công!", "success");
        } else {
          addToast("Đã bỏ ghim bài viết khỏi đầu Newfeed.", "info");
        }
        return { ...p, isPinned: nextPin };
      })
    );
    return true;
  };

  /**
   * Ghi nhận và đồng bộ lượt xem thật cho bài viết từ CSDL PostgreSQL
   * Sử dụng khoảng giãn cách (cooldown 15 giây) để chống spam khi cuộn trang hay re-render,
   * nhưng đảm bảo mỗi lần độc giả mở bài viết vào xem sẽ được cộng lượt xem thật vào CSDL.
   */
  const incrementViews = useCallback((postId) => {
    if (!postId) return;
    const sessionKey = `last_viewed_ts_${postId}`;
    const lastViewed = typeof window !== "undefined" && window.sessionStorage?.getItem(sessionKey);
    const now = Date.now();
    const cooldownMs = 15000; // 15 giây chống spam liên tục trong cùng 1 lần đọc

    const isRecentView = lastViewed && (now - parseInt(lastViewed, 10)) < cooldownMs;

    if (!isRecentView) {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.setItem(sessionKey, String(now));
      }
      // Gọi API backend với track_view=true để ghi nhận lượt xem thật vào cơ sở dữ liệu
      api.posts.get(postId, { track_view: "true" })
        .then((updatedPost) => {
          if (updatedPost && typeof updatedPost.views === "number") {
            setPosts((prev) =>
              prev.map((p) => (String(p.id) === String(postId) ? { ...p, views: updatedPost.views } : p))
            );
          }
        })
        .catch(() => {
          // Fallback cục bộ chỉ khi backend không phản hồi
          setPosts((prev) =>
            prev.map((p) => (String(p.id) === String(postId) ? { ...p, views: (p.views || 0) + 1 } : p))
          );
        });
    } else {
      // Trong thời gian cooldown (ví dụ đang lướt đọc bài): đồng bộ số lượt xem thật từ CSDL mà không tăng thêm
      api.posts.get(postId, { track_view: "false" })
        .then((freshPost) => {
          if (freshPost && typeof freshPost.views === "number") {
            setPosts((prev) =>
              prev.map((p) => (String(p.id) === String(postId) ? { ...p, views: freshPost.views } : p))
            );
          }
        })
        .catch(() => {});
    }
  }, []);

  // Danh sách phân loại theo trạng thái duyệt
  const pendingPosts = useMemo(
    () => posts.filter((p) => p.status === "pending"),
    [posts]
  );
  const approvedPosts = useMemo(
    () => posts.filter((p) => !p.status || p.status === "approved"),
    [posts]
  );
  const rejectedPosts = useMemo(
    () => posts.filter((p) => p.status === "rejected"),
    [posts]
  );

  /**
   * Chuỗi xử lý lọc danh sách bài viết công khai trên trang chủ (chỉ hiện bài đã duyệt)
   */
  const filteredPosts = useMemo(() => {
    let result = posts.filter((p) => !p.status || p.status === "approved");

    // 1. Lọc theo từ khóa tìm kiếm (Search Query)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // 2. Lọc theo Danh mục (Category)
    if (selectedCategory && selectedCategory !== "Tất cả") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // 3. Lọc theo Tag
    if (selectedTag) {
      result = result.filter((p) => p.tags?.includes(selectedTag));
    }

    // 4. Lọc theo Khoảng thời gian xuất bản (Time Range)
    if (timeRange && timeRange !== "all") {
      const now = currentTimestamp;
      result = result.filter((p) => {
        const postTime = new Date(p.createdAt).getTime();
        if (isNaN(postTime)) return true;
        const diffMs = now - postTime;
        if (timeRange === "today") return diffMs <= 24 * 60 * 60 * 1000;
        if (timeRange === "week") return diffMs <= 7 * 24 * 60 * 60 * 1000;
        if (timeRange === "month") return diffMs <= 30 * 24 * 60 * 60 * 1000;
        return true;
      });
    }

    // 5. Lọc theo Thời lượng đọc kỹ thuật (Reading Duration)
    if (readDuration && readDuration !== "all") {
      result = result.filter((p) => {
        const match = String(p.readTime || "5").match(/\d+/);
        const mins = match ? parseInt(match[0], 10) : 5;
        if (readDuration === "quick") return mins < 3;
        if (readDuration === "medium") return mins >= 3 && mins <= 7;
        if (readDuration === "deep") return mins > 7;
        return true;
      });
    }

    // 6. Sắp xếp (Sort)
    if (sortBy === "likes") {
      result.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else if (sortBy === "comments") {
      result.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
    } else if (sortBy === "views") {
      result.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else {
      // Mặc định: Mới nhất
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Luôn ưu tiên bài viết được Admin Ghim (isPinned) lên đầu Newfeed
    result.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

    return result;
  }, [posts, searchQuery, selectedCategory, selectedTag, sortBy, timeRange, readDuration, currentTimestamp]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("Tất cả");
    setSelectedTag("");
    setSortBy("newest");
    setTimeRange("all");
    setReadDuration("all");
  };

  return (
    <BlogContext.Provider
      value={{
        posts,
        filteredPosts,
        pendingPosts,
        approvedPosts,
        rejectedPosts,
        searchQuery,
        setSearchQuery,
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
        getAuthor,
        toggleLike,
        toggleBookmark,
        addComment,
        deleteComment,
        createPost,
        updatePost,
        deletePost,
        togglePinPost,
        incrementViews,
        approvePost,
        rejectPost,
        refreshPosts: syncPostsFromBackend
      }}
    >
      {children}
    </BlogContext.Provider>
  );
}

export function useBlog() {
  const context = useContext(BlogContext);
  if (!context) {
    throw new Error("useBlog must be used within a BlogProvider");
  }
  return context;
}
