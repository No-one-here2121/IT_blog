/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { SEED_POSTS } from "../data/seedData";
import { generateId } from "../utils/id";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { dbApi, fromApiPost, toApiPost, cachePosts, apiEnabled } from "../utils/dbApi";

const BlogContext = createContext();

// Khoa sessionStorage: bai da xem trong phien hien tai (tranh dem trung luot xem)
const VIEWED_KEY = "it_blog_viewed_posts";

export function BlogProvider({ children }) {
  const { currentUser, users } = useAuth();
  const { addToast } = useToast();

  // Bai viet: uu tien doc tu database that (API), fallback localStorage khi API tat
  const [posts, setPosts] = useState(() => storage.get(STORAGE_KEYS.POSTS, SEED_POSTS));
  const [useDb, setUseDb] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!apiEnabled()) return;
    dbApi
      .listPosts()
      .then((rows) => {
        if (!alive || !rows) return;
        const local = storage.get(STORAGE_KEYS.POSTS, []);
        // Lay so lieu tu DB, nhung khong de mat luot xem vua tang o local
        // (tranh truong hop GET ve truoc khi POST /view kip ghi).
        const mapped = rows.map((r) => {
          const remote = fromApiPost(r);
          const l = Array.isArray(local) ? local.find((x) => x.id === remote.id) : null;
          const lv = l?.views || 0;
          return lv > (remote.views || 0) ? { ...remote, views: lv } : remote;
        });
        const finalPosts = mapped.length ? mapped : storage.get(STORAGE_KEYS.POSTS, SEED_POSTS);
        setPosts(finalPosts);
        cachePosts(finalPosts);
        setUseDb(true);
      })
      .catch(() => {
        if (!alive) return;
        setUseDb(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // State bộ lọc và tìm kiếm
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedTag, setSelectedTag] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'likes' | 'comments' | 'views'

  // Tự động lưu posts vào storage mỗi khi có thay đổi
  useEffect(() => {
    storage.set(STORAGE_KEYS.POSTS, posts);
  }, [posts]);

  /**
   * Lấy thông tin tác giả dựa trên authorId
   */
  const getAuthor = (authorId) => {
    const author = users.find((u) => u.id === authorId);
    if (author) return author;
    return {
      id: authorId,
      name: "Tác giả ẩn danh",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=unknown",
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
        const alreadyLiked = post.likes?.includes(currentUser.id);
        const updatedLikes = alreadyLiked
          ? post.likes.filter((id) => id !== currentUser.id)
          : [...(post.likes || []), currentUser.id];

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
        const alreadyBookmarked = post.bookmarks?.includes(currentUser.id);
        const updatedBookmarks = alreadyBookmarked
          ? post.bookmarks.filter((id) => id !== currentUser.id)
          : [...(post.bookmarks || []), currentUser.id];

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
    return true;
  };

  /**
   * Thêm bình luận mới vào bài viết
   */
  const addComment = (postId, content) => {
    if (!currentUser) return false;
    const trimmed = (content || "").trim();
    if (!trimmed) return false;

    const newComment = {
      id: generateId("cmt"),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content: trimmed,
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

    addToast("Đã gửi bình luận thành công! 💬", "success");
    return true;
  };

  /**
   * Xóa bình luận (Dành cho người tạo comment)
   */
  const deleteComment = (postId, commentId) => {
    if (!currentUser) return false;

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          comments: post.comments.filter((c) => c.id !== commentId)
        };
      })
    );
    addToast("Đã xóa bình luận.", "info");
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

    // Cap nhat UI ngay + luu local, dong thoi day len database that qua API
    setPosts((prev) => {
      const next = [newPost, ...prev];
      cachePosts(next);
      return next;
    });
    if (apiEnabled()) {
      dbApi
        .createPost(toApiPost(newPost))
        .then((saved) => {
          if (!saved) return;
          const mapped = fromApiPost(saved);
          setPosts((prev) => {
            const next = prev.map((p) => (p.id === newPost.id ? mapped : p));
            cachePosts(next);
            return next;
          });
          setUseDb(true);
        })
        .catch(() => setUseDb(false));
    }
    if (isPending) {
      addToast("Bài viết đã được gửi vào danh sách chờ duyệt! ⏳", "info");
    } else {
      addToast("Đăng bài viết mới thành công! 🎉", "success");
    }
    return newPost;
  };

  /**
   * Duyệt và xuất bản bài viết
   */
  const approvePost = (postId) => {
    setPosts((prev) => {
      const next = prev.map((p) => (p.id === postId ? { ...p, status: "approved" } : p));
      cachePosts(next);
      return next;
    });
    if (apiEnabled()) {
      dbApi.updatePost(postId, { status: "approved" }).catch(() => {});
    }
    addToast("Đã phê duyệt và xuất bản bài viết thành công! ✓", "success");
  };

  /**
   * Từ chối bài viết
   */
  const rejectPost = (postId) => {
    setPosts((prev) => {
      const next = prev.map((p) => (p.id === postId ? { ...p, status: "rejected" } : p));
      cachePosts(next);
      return next;
    });
    if (apiEnabled()) {
      dbApi.updatePost(postId, { status: "rejected" }).catch(() => {});
    }
    addToast("Đã từ chối bài viết.", "info");
  };

  /**
   * Cập nhật bài viết
   */
  const updatePost = (postId, updatedData) => {
    if (!currentUser) return false;

    setPosts((prevPosts) => {
      const next = prevPosts.map((post) => {
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
      });
      cachePosts(next);
      return next;
    });
    if (apiEnabled()) {
      const cur = posts.find((p) => p.id === postId);
      const merged = { ...(cur || {}), ...updatedData };
      dbApi
        .updatePost(postId, {
          title: merged.title,
          excerpt: merged.excerpt,
          content: merged.content,
          cover_image: merged.coverImage,
          category: merged.category,
          tags: merged.tags,
          status: merged.status
        })
        .then((saved) => {
          if (!saved) return;
          const mapped = fromApiPost(saved);
          setPosts((prev) => {
            const next = prev.map((p) => (p.id === postId ? { ...p, ...mapped } : p));
            cachePosts(next);
            return next;
          });
        })
        .catch(() => {});
    }

    addToast("Cập nhật bài viết thành công!", "success");
    return true;
  };

  /**
   * Xóa bài viết
   */
  const deletePost = (postId) => {
    if (!currentUser) return false;
    const target = posts.find((p) => p.id === postId);
    if (!target) return false;

    const isManager = ["admin", "manager"].includes(currentUser.role);
    if (!isManager && target.authorId !== currentUser.id) {
      addToast("Bạn không có quyền xóa bài viết này!", "error");
      return false;
    }

    setPosts((prev) => {
      const next = prev.filter((p) => p.id !== postId);
      cachePosts(next);
      return next;
    });
    if (apiEnabled()) {
      dbApi.deletePost(postId).catch(() => {});
    }
    addToast("Đã xóa bài viết thành công.", "info");
    return true;
  };

  /**
   * Tăng lượt xem cho bài viết: chỉ đếm 1 lần cho mỗi bài trong 1 phiên
   * (tránh nhảy số do React StrictMode / F5), và lưu thẳng vào database that.
   */
  const incrementViews = useCallback((postId) => {
    if (!postId) return;
    let seen;
    try {
      seen = JSON.parse(sessionStorage.getItem(VIEWED_KEY) || "[]");
      if (!Array.isArray(seen)) seen = [];
    } catch {
      seen = [];
    }
    if (seen.includes(postId)) return;

    seen.push(postId);
    try {
      sessionStorage.setItem(VIEWED_KEY, JSON.stringify(seen));
    } catch {
      // bo qua neu trinh duyet chan sessionStorage
    }

    setPosts((prev) => {
      const next = prev.map((p) => (p.id === postId ? { ...p, views: (p.views || 0) + 1 } : p));
      cachePosts(next);
      return next;
    });

    if (apiEnabled()) {
      dbApi
        .incrementView(postId)
        .then((views) => {
          if (typeof views !== "number") return;
          setPosts((prev) => {
            const next = prev.map((p) =>
              p.id === postId ? { ...p, views: Math.max(views, p.views || 0) } : p
            );
            cachePosts(next);
            return next;
          });
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

    // 4. Sắp xếp (Sort)
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

    return result;
  }, [posts, searchQuery, selectedCategory, selectedTag, sortBy]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("Tất cả");
    setSelectedTag("");
    setSortBy("newest");
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
        resetFilters,
        getAuthor,
        useDb,
        toggleLike,
        toggleBookmark,
        addComment,
        deleteComment,
        createPost,
        updatePost,
        deletePost,
        incrementViews,
        approvePost,
        rejectPost
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
