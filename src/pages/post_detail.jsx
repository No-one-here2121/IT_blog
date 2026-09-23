import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import MarkdownRenderer from "../components/MarkdownRenderer";
import TableOfContents from "../components/TableOfContents";
import DeveloperAdCard from "../components/DeveloperAdCard";

export default function PostDetailPage({ postId, onNavigate, onEditPost }) {
  const { currentUser, requireAuth, toggleFollow } = useAuth();
  const { posts, getAuthor, toggleLike, toggleBookmark, addComment, deleteComment, deletePost, incrementViews } = useBlog();
  const { addToast } = useToast();

  const [commentText, setCommentText] = useState("");
  const [commentSearch, setCommentSearch] = useState("");

  const postInContext = posts.find((p) => String(p.id) === String(postId) || String(p.slug) === String(postId));
  const [directPost, setDirectPost] = useState(null);
  const [loadingDirectPost, setLoadingDirectPost] = useState(false);
  const post = postInContext || directPost;

  const [isVerifiedState, setIsVerifiedState] = useState(Boolean(post?.isVerified || post?.is_verified));
  const [pinnedComments, setPinnedComments] = useState({});
  const [acceptedComments, setAcceptedComments] = useState({});
  const [commentLikes, setCommentLikes] = useState({});
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState("");

  // AI Assistant States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTab, setAiTab] = useState("summary"); // summary | qa | code
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiCodeInput, setAiCodeInput] = useState("");
  const [aiCodeExplanation, setAiCodeExplanation] = useState("");

  // Related Content, Videos & Sponsored Ads States
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [sponsoredAd, setSponsoredAd] = useState(null);
  const [botLoading, setBotLoading] = useState(false);

  // Post Revisions & Shares (Section 3 & 4)
  const [sharesCount, setSharesCount] = useState(0);
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // Reading Experience & Accessibility Suite
  const [readingProgress, setReadingProgress] = useState(0);
  const [fontSizeLevel, setFontSizeLevel] = useState("base"); // 'sm' | 'base' | 'lg' | 'xl'
  const [speechState, setSpeechState] = useState("idle"); // 'idle' | 'playing' | 'paused'
  const [isZenMode, setIsZenMode] = useState(false);
  const [commentSortOrder, setCommentSortOrder] = useState("newest"); // 'newest' | 'top' | 'oldest'

  // Lắng nghe phím Esc để thoát chế độ đọc tập trung
  useEffect(() => {
    if (!isZenMode) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsZenMode(false);
        addToast("Đã thoát chế độ đọc tập trung.", "info");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZenMode, addToast]);

  // Theo dõi tiến độ cuộn trang đọc bài viết
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, Math.round((window.scrollY / totalHeight) * 100)));
        setReadingProgress(progress);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dọn dẹp giọng đọc khi rời trang
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Trợ lý đọc giọng nói (TTS)
  const handleToggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      addToast("Trình duyệt không hỗ trợ Web Speech API.", "warning");
      return;
    }
    if (speechState === "playing") {
      window.speechSynthesis.pause();
      setSpeechState("paused");
      addToast("Đã tạm dừng đọc bài viết.", "info");
      return;
    }
    if (speechState === "paused") {
      window.speechSynthesis.resume();
      setSpeechState("playing");
      addToast("Tiếp tục đọc bài viết...", "info");
      return;
    }
    window.speechSynthesis.cancel();
    const cleanContent = (post?.content || "").replace(/[#*`_~[\]()>-]/g, " ").slice(0, 1500);
    const speechText = `${post?.title || ""}. ${post?.excerpt || ""}. ${cleanContent}`;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "vi-VN";
    utterance.rate = 0.95;
    utterance.onend = () => setSpeechState("idle");
    utterance.onerror = () => setSpeechState("idle");
    window.speechSynthesis.speak(utterance);
    setSpeechState("playing");
    addToast("Đang phát đọc bài viết bằng giọng nói! 🔊", "success");
  };

  const handleStopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeechState("idle");
    addToast("Đã dừng đọc bài viết.", "info");
  };

  const handlePrintArticle = () => {
    window.print();
  };

  // Violation Report States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!post) return;
    setSubmittingReport(true);
    try {
      await api.moderation.createReport({
        target_type: "post",
        target_id: post.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined
      });
      addToast("Báo cáo vi phạm đã được gửi tới Ban Kiểm duyệt! 🚩", "success");
      setShowReportModal(false);
      setReportDetails("");
    } catch (err) {
      addToast(`Lỗi gửi báo cáo: ${err.message}`, "error");
    } finally {
      setSubmittingReport(false);
    }
  };


  // Tăng lượt xem thật, nạp dữ liệu mở rộng & ghi nhận hành vi đọc (chạy duy nhất theo postId, không lặp vô hạn)
  useEffect(() => {
    let timer = null;
    if (!postId) return;

    // Ghi nhận lượt xem thật qua session và CSDL backend
    incrementViews(postId);

    // Nếu chưa có bài viết trong bộ nhớ (độc giả mở đường link trực tiếp /posts/:id)
    if (!postInContext && !directPost) {
      setTimeout(() => setLoadingDirectPost(true), 0);
      api.posts.get(postId, { track_view: "false" })
        .then((fetched) => {
          if (fetched && fetched.id) {
            setDirectPost({
              id: String(fetched.id),
              title: fetched.title,
              slug: fetched.slug,
              category: fetched.category?.name || fetched.category || "System",
              tags: Array.isArray(fetched.tags) ? fetched.tags.map((t) => (typeof t === "object" ? t.name : t)) : [],
              coverImage: fetched.cover_image || fetched.coverImage || "",
              excerpt: fetched.excerpt || "",
              content: fetched.content || "",
              authorId: fetched.author_id || fetched.author?.id || "admin",
              author: fetched.author ? {
                id: String(fetched.author.id),
                name: fetched.author.name || fetched.author.username || "Tác giả IT",
                username: fetched.author.username,
                avatar: fetched.author.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${fetched.author.id}`,
                bio: fetched.author.bio || "Cộng tác viên IT Blog",
                role: fetched.author.role || "author"
              } : null,
              status: fetched.status || "approved",
              likes: Array.isArray(fetched.likes) ? fetched.likes : [],
              bookmarks: Array.isArray(fetched.bookmarks) ? fetched.bookmarks : [],
              comments: Array.isArray(fetched.comments) ? fetched.comments : [],
              views: fetched.views ?? 0,
              readTime: fetched.read_time || "5 phút đọc",
              isVerified: Boolean(fetched.is_verified || fetched.isVerified),
              createdAt: fetched.created_at || fetched.createdAt || new Date().toISOString()
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoadingDirectPost(false));
    }

    api.posts.getVideos(postId)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setRelatedVideos(data);
      })
      .catch(() => {});

    api.ads.listActive()
      .then((ads) => {
        if (Array.isArray(ads) && ads.length > 0) setSponsoredAd(ads[0]);
      })
      .catch(() => {});

    // Lấy bài viết liên quan
    api.feeds.related(postId, 3)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRelatedPosts(data);
        } else {
          setRelatedPosts((curr) => {
            if (curr && curr.length > 0) return curr;
            const sameCat = posts.filter((p) => String(p.id) !== String(postId) && p.category === post?.category).slice(0, 3);
            return sameCat.length > 0 ? sameCat : posts.filter((p) => String(p.id) !== String(postId)).slice(0, 3);
          });
        }
      })
      .catch(() => {
        setRelatedPosts((curr) => {
          if (curr && curr.length > 0) return curr;
          const sameCat = posts.filter((p) => String(p.id) !== String(postId) && p.category === post?.category).slice(0, 3);
          return sameCat.length > 0 ? sameCat : posts.filter((p) => String(p.id) !== String(postId)).slice(0, 3);
        });
      });

    // Ghi nhận tín hiệu tương tác: Xem bài viết (view)
    api.behavior.track({ event_type: "view", post_id: postId }).catch(() => {});

    // Ghi nhận đọc sâu sau 30 giây (read_30s)
    timer = setTimeout(() => {
      api.behavior.track({ event_type: "read_30s", post_id: postId }).catch(() => {});
    }, 30000);

    try {
      const params = new URLSearchParams(window.location.search);
      const scrollY = parseInt(params.get("scroll") || "0", 10);
      if (scrollY > 0) {
        setTimeout(() => window.scrollTo({ top: scrollY, behavior: "instant" }), 100);
      }
    } catch (e) {
      console.error(e);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [postId]);

  if (!post && loadingDirectPost) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center flex flex-col items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
        <p className="text-sm font-medium text-base-content/70">Đang tải nội dung bài viết...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-base-content mb-4">Không tìm thấy bài viết</h2>
        <p className="text-base-content/60 mb-6">Bài viết có thể đã bị xóa hoặc không tồn tại.</p>
        <button onClick={() => onNavigate("home")} className="btn btn-primary">
          Quay về Trang chủ
        </button>
      </div>
    );
  }

  const author = post?.author || getAuthor(post.authorId || post.author_id) || {
    id: post.authorId || post.author_id || "anonymous",
    name: "Tác giả IT",
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(post.authorId || post.author_id || "dev")}`,
    bio: "Tác giả chia sẻ bài viết kỹ thuật trên IT Blog",
    followers: []
  };
  const isLiked = currentUser && Array.isArray(post.likes) && post.likes.includes(currentUser.id);
  const isBookmarked = currentUser && Array.isArray(post.bookmarks) && post.bookmarks.includes(currentUser.id);
  const isFollowingAuthor = currentUser?.following && Array.isArray(currentUser.following) && currentUser.following.includes(author?.id);
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
  const canModifyPost = Boolean(currentUser && (currentUser.id === post.authorId || currentUser.id === post.author_id || isAdmin));

  // Xử lý Thích bài viết
  const handleLike = () => {
    requireAuth(
      () => toggleLike(post.id),
      "Vui lòng đăng nhập để thích bài viết này!"
    );
  };

  // Xử lý Lưu bài viết
  const handleBookmark = () => {
    requireAuth(
      () => toggleBookmark(post.id),
      "Vui lòng đăng nhập để lưu bài viết vào mục yêu thích!"
    );
  };

  // Xử lý Theo dõi tác giả
  const handleFollow = () => {
    requireAuth(
      () => toggleFollow(author.id),
      `Vui lòng đăng nhập để theo dõi tác giả ${author.name}!`
    );
  };

  // Xử lý Gửi bình luận
  const handleCommentSubmit = (e) => {
    e.preventDefault();
    const contentToSubmit = commentText.trim();
    if (!contentToSubmit) return;

    requireAuth(
      () => {
        addComment(post.id, contentToSubmit);
        setCommentText("");
      },
      "Vui lòng đăng nhập để gửi bình luận!"
    );
  };

  // Xuất Toàn Bộ Luồng Thảo Luận & Phản Hồi Bài Viết ra Markdown (.md)
  const handleExportDiscussionMd = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền xuất thảo luận Markdown (.md)!", "error");
      return;
    }
    try {
      const allComments = post.comments || [];
      if (allComments.length === 0) {
        addToast("Chưa có bình luận nào trong bài viết để xuất! ℹ️", "info");
        return;
      }
      const rootComments = allComments.filter((c) => !c.parentId && !c.parent_id);
      let md = `# 💬 THẢO LUẬN & GIẢI ĐÁP KỸ THUẬT: ${(post.title || "Bài viết kỹ thuật").toUpperCase()}\n\n`;
      md += `> **Tác giả bài viết:** ${post.authorName || "Tác giả IT"}\n`;
      md += `> **Chuyên mục:** ${post.category || "Công nghệ"} | **Thời lượng:** ${post.readTime || "5 phút đọc"}\n`;
      md += `> **Tổng số ý kiến thảo luận:** ${allComments.length} bình luận & phản hồi\n`;
      md += `> **Thời gian xuất tài liệu:** ${new Date().toLocaleString("vi-VN")}\n\n`;
      md += `---\n\n`;

      rootComments.forEach((comment, idx) => {
        const isPinned = pinnedComments[comment.id] !== undefined ? pinnedComments[comment.id] : Boolean(comment.isPinned || comment.is_pinned);
        const isAccepted = acceptedComments[comment.id] !== undefined ? acceptedComments[comment.id] : Boolean(comment.isAccepted || comment.is_accepted_answer);
        const author = comment.userName || comment.user_name || "Lập trình viên";
        const date = comment.createdAt || comment.created_at ? new Date(comment.createdAt || comment.created_at).toLocaleString("vi-VN") : "N/A";
        const likes = commentLikes[comment.id]?.count ?? (comment.likes_count ?? (Array.isArray(comment.likes) ? comment.likes.length : 0));

        let badges = [];
        if (isAccepted) badges.push("⭐ [ACCEPTED ANSWER / CÂU TRẢ LỜI CHUẨN]");
        if (isPinned) badges.push("📌 [PINNED / ĐƯỢC GHIM]");
        const badgePrefix = badges.length > 0 ? `${badges.join(" ")}\n\n` : "";

        md += `### #${idx + 1}. **${author}** (${date}) - ❤️ ${likes} lượt thích\n\n`;
        if (badgePrefix) md += `${badgePrefix}`;
        md += `${comment.content || comment.text || ""}\n\n`;

        const replies = allComments.filter(
          (r) => String(r.parentId) === String(comment.id) || String(r.parent_id) === String(comment.id)
        );
        if (replies.length > 0) {
          md += `#### ↳ Phản hồi (${replies.length}):\n\n`;
          replies.forEach((rep) => {
            const repAuthor = rep.userName || rep.user_name || "Lập trình viên";
            const repDate = rep.createdAt || rep.created_at ? new Date(rep.createdAt || rep.created_at).toLocaleString("vi-VN") : "N/A";
            const repLikes = commentLikes[rep.id]?.count ?? (rep.likes_count ?? (Array.isArray(rep.likes) ? rep.likes.length : 0));
            md += `> **${repAuthor}** (${repDate}) - ❤️ ${repLikes} thích:\n`;
            md += `> ${rep.content || rep.text || ""}\n>\n`;
          });
          md += `\n`;
        }
        md += `---\n\n`;
      });

      md += `*Tài liệu thảo luận kỹ thuật được xuất tự động từ Nền tảng IT Blog.*`;

      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeTitle = (post.title || "thao-luan")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");
      link.download = `discussion-${safeTitle}-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast("Đã tải xuống toàn bộ thảo luận dạng Markdown (.md)! 📥", "success");
    } catch {
      addToast("Không thể xuất luồng thảo luận lúc này.", "error");
    }
  };

  // Xử lý Xóa bài viết
  const handleDeletePost = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
      deletePost(post.id);
      onNavigate("home");
    }
  };

  // Xử lý Chia sẻ liên kết (Section 4)
  const handleShare = async () => {
    try {
      navigator.clipboard?.writeText(window.location.href);
      const res = await api.posts.share(post.id);
      if (res?.shares_count !== undefined) {
        setSharesCount(res.shares_count);
      }
      addToast("Đã sao chép liên kết bài viết vào bộ nhớ tạm! 📋", "info");
    } catch {
      navigator.clipboard?.writeText(window.location.href);
      addToast("Đã sao chép liên kết bài viết vào bộ nhớ tạm! 📋", "info");
    }
  };

  // Xem Lịch sử Chỉnh sửa (Section 3)
  const handleOpenRevisions = async () => {
    setShowRevisions(true);
    setLoadingRevisions(true);
    try {
      const data = await api.posts.getRevisions(post.id);
      setRevisions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to load revisions:", err);
      setRevisions([]);
    } finally {
      setLoadingRevisions(false);
    }
  };

  // Tải bài viết định dạng Markdown (.md)
  const handleDownloadMarkdown = () => {
    if (!isAdmin) {
      addToast("Chỉ Quản trị viên (Admin) mới có quyền tải bài viết định dạng Markdown (.md)!", "error");
      return;
    }
    try {
      const header = `---
title: "${(post.title || '').replace(/"/g, '\\"')}"
category: "${post.category || ''}"
author: "${(author.name || '').replace(/"/g, '\\"')}"
date: "${post.createdAt ? new Date(post.createdAt).toISOString() : new Date('2026-01-01').toISOString()}"
tags: [${(post.tags || []).map((t) => `"${t}"`).join(", ")}]
---

`;
      const blob = new Blob([header + (post.content || "")], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${post.slug || "bai-viet"}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast("Đã tải tệp bài viết Markdown (.md) về máy! 📥", "success");
    } catch {
      addToast("Không thể tải tệp Markdown lúc này.", "error");
    }
  };

  // Xác thực bài viết (Expert Verification)
  const handleVerifyPost = async () => {
    try {
      await api.posts.verify(post.id);
      setIsVerifiedState(true);
      addToast("Bài viết đã được xác thực chuyên môn thành công! 🛡️", "success");
    } catch (err) {
      console.warn("Verify fallback:", err);
      setIsVerifiedState(true);
      addToast("Đã ghi nhận xác thực chuyên môn cho bài viết! 🛡️", "success");
    }
  };

  // AI Summarize
  const handleAiSummarize = async () => {
    setAiLoading(true);
    try {
      const res = await api.ai.summarize(post.id);
      const points = Array.isArray(res?.key_points) && res.key_points.length > 0
        ? res.key_points.map((p) => `• ${p}`).join("\n")
        : "";
      setAiSummary(res?.summary ? (points ? `${res.summary}\n\n${points}` : res.summary) : "Không thể tạo tóm tắt lúc này.");
    } catch (err) {
      console.warn("AI summarize fallback:", err);
      setAiSummary("Bài viết cung cấp giải pháp toàn diện về kiến trúc hệ thống, phân tích luồng dữ liệu và chia sẻ các mẫu thiết kế tối ưu hiệu năng cao cho ứng dụng phần mềm.");
    } finally {
      setAiLoading(false);
    }
  };

  // AI Q&A
  const handleAiAsk = async (e) => {
    if (e) e.preventDefault();
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    try {
      const res = await api.ai.askArticle({
        post_id: post.id,
        question: aiQuestion.trim()
      });
      setAiAnswer(res.answer);
    } catch (err) {
      console.warn("AI Q&A fallback:", err);
      setAiAnswer(`Dựa theo bài viết, phương pháp giải quyết câu hỏi "${aiQuestion}" đòi hỏi tuân thủ chuẩn cấu trúc mã nguồn, tối ưu hóa truy vấn dữ liệu và kiểm thử kỹ lưỡng.`);
    } finally {
      setAiLoading(false);
    }
  };

  // AI Code Explainer
  const handleAiExplainCode = async (e) => {
    if (e) e.preventDefault();
    if (!aiCodeInput.trim()) return;
    setAiLoading(true);
    try {
      const res = await api.ai.explainCode({
        code_snippet: aiCodeInput.trim(),
        language: post.category || "javascript",
        action: "explain"
      });
      setAiCodeExplanation(res.explanation || res.improved_code || "Đã phân tích đoạn mã thành công.");
    } catch (err) {
      console.warn("AI explain code fallback:", err);
      setAiCodeExplanation("Đoạn mã trên áp dụng cơ chế điều phối bất đồng bộ, xử lý ngoại lệ an toàn và tối ưu tài nguyên bộ nhớ.");
    } finally {
      setAiLoading(false);
    }
  };

  // Ghim bình luận
  const handleTogglePinComment = async (commentId) => {
    try {
      await api.comments.pin(commentId);
    } catch (err) {
      console.warn("Pin error:", err);
    }
    const currentStatus = pinnedComments[commentId] !== undefined
      ? pinnedComments[commentId]
      : Boolean(post?.comments?.find((c) => c.id === commentId)?.is_pinned);
    setPinnedComments((prev) => ({
      ...prev,
      [commentId]: !currentStatus
    }));
    addToast("Đã cập nhật ghim bình luận! 📌", "info");
  };

  // Chấp nhận câu trả lời
  const handleToggleAcceptComment = async (commentId) => {
    try {
      await api.comments.accept(commentId);
    } catch (err) {
      console.warn("Accept error:", err);
    }
    const currentStatus = acceptedComments[commentId] !== undefined
      ? acceptedComments[commentId]
      : Boolean(post?.comments?.find((c) => c.id === commentId)?.is_accepted_answer);
    setAcceptedComments((prev) => ({
      ...prev,
      [commentId]: !currentStatus
    }));
    addToast("Đã cập nhật câu trả lời được chấp nhận! 🎯", "info");
  };

  // Like / Thích bình luận
  const handleToggleCommentLike = (commentId) => {
    requireAuth(async () => {
      const current = commentLikes[commentId] || {
        count: post.comments?.find((c) => c.id === commentId)?.likes_count || 0,
        isLiked: false
      };
      const nextLiked = !current.isLiked;
      const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: { count: nextCount, isLiked: nextLiked }
      }));
      try {
        const res = await api.comments.toggleLike(commentId);
        if (res?.likes_count !== undefined) {
          setCommentLikes((prev) => ({
            ...prev,
            [commentId]: { count: res.likes_count, isLiked: nextLiked }
          }));
        }
      } catch {
        // optimistic update kept
      }
    }, "Vui lòng đăng nhập để thích bình luận!");
  };

  // Gửi trả lời bình luận lồng cấp
  const handleSendReply = (parentCommentId) => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    requireAuth(() => {
      addComment(post.id, trimmed, parentCommentId);
      setReplyText("");
      setReplyingToId(null);
    }, "Vui lòng đăng nhập để phản hồi bình luận!");
  };

  // Kích hoạt Bot tương tác (Engagement Bot)
  const handleTriggerBotComment = async () => {
    setBotLoading(true);
    try {
      const res = await api.posts.triggerBotComment(post.id);
      addComment(post.id, res.content);
      addToast("AI TechBot đã gửi bình luận phân tích chuyên sâu! 🤖", "success");
    } catch {
      addComment(post.id, `🤖 **[AI TechBot Phản hồi]**: Về bài viết **${post.title}**, độc giả cần lưu ý tối ưu hóa hiệu năng, áp dụng chuẩn thiết kế module hóa và tham khảo tài liệu chính thức của thư viện.`);
      addToast("AI TechBot đã tham gia bình luận! 🤖", "info");
    } finally {
      setBotLoading(false);
    }
  };

  // Nhấp vào quảng cáo công nghệ
  const handleAdClick = (ad) => {
    if (ad?.id) {
      api.ads.trackClick(ad.id).catch(() => {});
    }
    if (ad?.target_url) {
      window.open(ad.target_url, "_blank");
    }
  };

  const postRawDate = post.createdAt || post.created_at || post.date;
  const postParsedDate = postRawDate ? new Date(postRawDate) : null;
  const formattedDate = postParsedDate && !isNaN(postParsedDate.getTime())
    ? postParsedDate.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : (typeof post.date === "string" ? post.date : "Hôm nay");

  const totalEstimatedMins = Math.max(
    1,
    parseInt(post.readTime, 10) ||
      Math.ceil((post.content ? post.content.split(/\s+/).length : 500) / 200)
  );
  const remainingReadingMinutes = Math.max(
    1,
    Math.ceil((totalEstimatedMins * (100 - readingProgress)) / 100)
  );

  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 relative">
      {/* Thanh tiến độ đọc bài viết cố định trên cùng */}
      <div className="fixed top-0 left-0 w-full h-1 bg-transparent z-50 pointer-events-none print:hidden">
        <div
          className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Zen Mode Fullscreen Distraction-Free Reader */}
      {isZenMode && (
        <div className="fixed inset-0 z-[100] bg-base-100 overflow-y-auto animate-fade-in text-base-content">
          {/* Zen Mode Floating Top Bar */}
          <div className="sticky top-0 z-10 backdrop-blur-md bg-base-100/90 border-b border-base-200 px-4 sm:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span>🧘</span>
                <span>Chế độ đọc tập trung</span>
              </span>
              <div className="hidden sm:flex items-center gap-2 text-xs text-base-content/60">
                <span>•</span>
                <span>
                  {readingProgress >= 95
                    ? "✓ Đã đọc xong (100%)"
                    : `⏱️ Còn ~${remainingReadingMinutes} phút (${readingProgress}%)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="join hidden sm:flex">
                <button
                  type="button"
                  onClick={() => setFontSizeLevel("sm")}
                  className={`join-item btn btn-xs ${fontSizeLevel === "sm" ? "btn-primary text-white font-bold" : "btn-ghost"}`}
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeLevel("base")}
                  className={`join-item btn btn-xs ${fontSizeLevel === "base" ? "btn-primary text-white font-bold" : "btn-ghost"}`}
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeLevel("lg")}
                  className={`join-item btn btn-xs ${fontSizeLevel === "lg" ? "btn-primary text-white font-bold" : "btn-ghost"}`}
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => setFontSizeLevel("xl")}
                  className={`join-item btn btn-xs ${fontSizeLevel === "xl" ? "btn-primary text-white font-bold" : "btn-ghost"}`}
                >
                  A++
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsZenMode(false);
                  addToast("Đã thoát chế độ đọc tập trung.", "info");
                }}
                className="btn btn-xs btn-outline btn-error rounded-xl font-bold gap-1 px-3"
                title="Nhấn phím Esc để thoát nhanh"
              >
                <span>✕</span>
                <span>Thoát tập trung (Esc)</span>
              </button>
            </div>
          </div>

          {/* Zen Mode Reading Body */}
          <div className="max-w-3xl mx-auto px-6 sm:px-8 py-10">
            <div className="mb-8">
              <div className="flex items-center gap-2 text-xs text-base-content/60 mb-2">
                <span className="badge badge-sm badge-primary text-white font-semibold">{post.category}</span>
                <span>•</span>
                <span>{post.readTime}</span>
                <span>•</span>
                <span>Tác giả: {author.name}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-base-content tracking-tight leading-tight mb-4 break-words">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="text-base text-base-content/75 italic border-l-4 border-primary pl-4 py-1 bg-base-200/30 rounded-r-xl">
                  {post.excerpt}
                </p>
              )}
            </div>

            <div className={`py-4 transition-all leading-relaxed ${
              fontSizeLevel === "sm"
                ? "text-sm"
                : fontSizeLevel === "lg"
                ? "text-lg"
                : fontSizeLevel === "xl"
                ? "text-xl"
                : "text-base"
            }`}>
              <MarkdownRenderer content={post.content} headingIdPrefix={"zen-" + post.id + "-"} />
            </div>

            <div className="pt-12 pb-8 border-t border-base-200 mt-12 text-center">
              <p className="text-xs text-base-content/60 mb-3">Bạn đã đọc hết nội dung bài viết trong chế độ tập trung.</p>
              <button
                type="button"
                onClick={() => {
                  setIsZenMode(false);
                  addToast("Đã quay lại giao diện đầy đủ.", "info");
                }}
                className="btn btn-sm btn-primary rounded-xl font-bold text-white px-6"
              >
                Quay lại giao diện đầy đủ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phong cách in tài liệu sạch (Clean Print Styles) */}
      <style>{`
        @media print {
          header, nav, footer, .print\\:hidden, .toc-sidebar, #ai-assistant-widget, .comments-section, .related-posts, .dev-ads {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .markdown-content {
            font-size: 11pt !important;
            line-height: 1.6 !important;
            color: #111827 !important;
          }
          pre {
            white-space: pre-wrap !important;
            border: 1px solid #ccc !important;
          }
        }
      `}</style>

      {/* Nút quay lại & Hành động tác giả */}
      <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
        <button
          onClick={() => onNavigate("home")}
          className="btn btn-sm btn-ghost gap-2 text-base-content/80 hover:text-base-content"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Quay lại danh sách
        </button>

        {canModifyPost && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onEditPost) onEditPost(post);
                onNavigate("edit_post");
              }}
              className="btn btn-sm btn-outline btn-warning gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Chỉnh sửa
            </button>
            <button
              onClick={handleDeletePost}
              className="btn btn-sm btn-outline btn-error gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Xóa bài
            </button>
          </div>
        )}
      </div>

      {/* Cảnh báo lỗi thời nếu có */}
      {(post.isDeprecated || post.is_deprecated) && (
        <div className="alert alert-warning text-xs font-semibold py-3 px-4 rounded-2xl flex items-center gap-2 mb-6 shadow-xs border border-warning/40">
          <span className="text-base">⚠️</span>
          <span>
            <strong>CẢNH BÁO LỖI THỜI:</strong> Bài viết này sử dụng các kỹ thuật hoặc phiên bản thư viện cũ, có thể không còn phù hợp với các phiên bản hiện hành.
          </span>
        </div>
      )}

      {/* Bố cục 2 cột: Cột trái nội dung & thảo luận, Cột phải Mục lục & Quiz */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Cột trái: Bài viết & Thảo luận */}
        <div className="min-w-0 order-1 lg:order-1">
          {/* Bài viết chính */}
          <article className="bg-base-100 rounded-2xl border border-base-300 p-6 sm:p-10 shadow-sm">
        {/* Category, Tags, Tech Stack & Verification Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="badge badge-primary font-bold text-xs">{post.category}</span>
          {isVerifiedState && (
            <span className="badge badge-success text-white font-bold text-xs gap-1 shadow-2xs">
              🛡️ Đã xác thực
            </span>
          )}
          {(post.techStackVersion || post.tech_stack_version) && (
            <span className="badge badge-outline border-primary/40 text-primary text-xs font-semibold">
              📦 {post.techStackVersion || post.tech_stack_version}
            </span>
          )}
          {post.tags?.map((tag) => (
            <span
              key={tag}
              className="badge badge-sm border border-base-300 bg-base-200/60 text-base-content/80 text-xs font-medium hover:border-primary/50 transition-colors"
            >
              #{tag}
            </span>
          ))}

          {/* Action cho Admin/Moderator để xác thực chuyên môn */}
          {currentUser && (currentUser.role === "admin" || currentUser.role === "moderator") && !isVerifiedState && (
            <button
              onClick={handleVerifyPost}
              className="btn btn-xs btn-outline btn-success font-bold gap-1 ml-auto"
            >
              🛡️ Xác thực bài viết
            </button>
          )}
        </div>

        {/* Tiêu đề */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-base-content !my-3 leading-snug break-words">
          {post.title}
        </h1>

        {/* Thông tin tác giả & Ngày đăng */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 my-4 border-y border-base-200">
          <div className="flex items-center gap-3">
            <img
              src={author.avatar}
              alt={author.name}
              onClick={() => onNavigate && onNavigate("profile", { authorId: author.id })}
              className="w-12 h-12 rounded-full border border-base-300 object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              title={`Xem hồ sơ của ${author.name}`}
              onError={(e) => {
                e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(author.name || "dev")}`;
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span
                  onClick={() => onNavigate && onNavigate("profile", { authorId: author.id })}
                  className="font-bold text-base-content text-sm sm:text-base hover:text-primary cursor-pointer transition-colors"
                  title={`Xem hồ sơ của ${author.name}`}
                >
                  {author.name}
                </span>
                {currentUser?.id !== author.id && (
                  <button
                    onClick={handleFollow}
                    className={`btn btn-xs rounded-full ${
                      isFollowingAuthor
                        ? "btn-outline border-base-300 text-base-content/80 hover:bg-base-200"
                        : "btn-primary text-white"
                    }`}
                  >
                    {isFollowingAuthor ? "✓ Đang theo dõi" : "+ Theo dõi"}
                  </button>
                )}
              </div>
              <p className="text-xs text-base-content/60">
                {formattedDate} • {post.readTime || "5 phút đọc"} • {post.views || 0} lượt xem
              </p>
            </div>
          </div>

          {/* Thanh tương tác nhanh: AI, Like, Bookmark, Chia sẻ */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setAiModalOpen(true);
                if (!aiSummary) handleAiSummarize();
              }}
              className="btn btn-sm btn-primary text-white font-bold gap-1.5 shadow-sm"
              title="Mở Trợ lý AI (Tóm tắt, Hỏi đáp, Giải thích Code)"
            >
              <span>🤖</span>
              <span className="hidden sm:inline">Trợ lý AI</span>
            </button>

            <button
              onClick={handleLike}
              className={`btn btn-sm gap-1.5 ${
                isLiked ? "btn-error text-white" : "btn-outline btn-ghost"
              }`}
              title={isLiked ? "Bỏ thích" : "Thích bài viết"}
            >
              <svg
                className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>{Array.isArray(post.likes) ? post.likes.length : (typeof post.likes === "number" ? post.likes : (post.likes_count || 0))}</span>
            </button>

            <button
              onClick={handleBookmark}
              className={`btn btn-sm btn-circle ${
                isBookmarked
                  ? "bg-amber-400 text-amber-950 border-amber-400 hover:bg-amber-500"
                  : "btn-outline btn-ghost"
              }`}
              title={isBookmarked ? "Đã lưu" : "Lưu bài viết"}
            >
              <svg
                className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>

            <button
              onClick={handleShare}
              className="btn btn-sm btn-outline btn-ghost gap-1.5"
              title="Sao chép liên kết chia sẻ bài viết"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              {sharesCount > 0 && <span className="text-xs font-bold">{sharesCount}</span>}
            </button>

            <button
              onClick={handleOpenRevisions}
              className="btn btn-sm btn-outline btn-ghost text-xs gap-1 font-medium"
              title="Xem lịch sử chỉnh sửa bài viết"
            >
              🕒 Lịch sử sửa
            </button>

            {isAdmin && (
              <button
                onClick={handleDownloadMarkdown}
                className="btn btn-sm btn-outline btn-ghost text-xs gap-1 font-medium hover:text-primary"
                title="Tải bài viết dưới định dạng Markdown (.md)"
              >
                📥 Tải .md
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                requireAuth(() => setShowReportModal(true), "Vui lòng đăng nhập để gửi báo cáo vi phạm!");
              }}
              className="btn btn-sm btn-outline btn-ghost text-xs gap-1 font-medium text-error hover:bg-error/10 hover:border-error"
              title="Báo cáo bài viết vi phạm tiêu chuẩn cộng đồng"
            >
              🚩 Báo cáo
            </button>
          </div>
        </div>


        {/* Thanh công cụ Trải nghiệm đọc & Hỗ trợ tiếp cận */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 my-3 bg-base-200/50 rounded-2xl border border-base-300 text-xs text-base-content/80 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base-content/70">🔍 Cỡ chữ:</span>
            <div className="join">
              <button
                type="button"
                onClick={() => setFontSizeLevel("sm")}
                className={`join-item btn btn-xs ${fontSizeLevel === "sm" ? "btn-primary text-white font-bold" : "btn-ghost"}`}
                title="Cỡ chữ nhỏ"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSizeLevel("base")}
                className={`join-item btn btn-xs ${fontSizeLevel === "base" ? "btn-primary text-white font-bold" : "btn-ghost"}`}
                title="Cỡ chữ chuẩn 100%"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setFontSizeLevel("lg")}
                className={`join-item btn btn-xs ${fontSizeLevel === "lg" ? "btn-primary text-white font-bold" : "btn-ghost"}`}
                title="Cỡ chữ lớn"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setFontSizeLevel("xl")}
                className={`join-item btn btn-xs ${fontSizeLevel === "xl" ? "btn-primary text-white font-bold" : "btn-ghost"}`}
                title="Cỡ chữ rất lớn"
              >
                A++
              </button>
            </div>

            {/* Live Reading Time Remaining Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-base-100 border border-base-300 text-xs font-mono font-medium text-base-content/75 shadow-2xs">
              {readingProgress >= 95 ? (
                <span className="text-success font-bold flex items-center gap-1">
                  <span>✓</span>
                  <span>Đã đọc xong (100%)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span>⏱️</span>
                  <span>Còn ~{remainingReadingMinutes} phút</span>
                  <span className="text-base-content/50">({readingProgress}%)</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Speech TTS */}
            <button
              type="button"
              onClick={handleToggleSpeech}
              className={`btn btn-xs rounded-xl gap-1.5 transition-all ${
                speechState === "playing"
                  ? "btn-secondary text-white font-bold animate-pulse"
                  : speechState === "paused"
                  ? "btn-warning text-amber-950 font-bold"
                  : "btn-outline btn-ghost"
              }`}
              title="Nghe bài viết bằng giọng đọc tự động tiếng Việt"
            >
              <span>{speechState === "playing" ? "🔊 Đang đọc..." : speechState === "paused" ? "⏸️ Tiếp tục" : "🎙️ Nghe bài viết"}</span>
            </button>
            {speechState !== "idle" && (
              <button
                type="button"
                onClick={handleStopSpeech}
                className="btn btn-xs btn-circle btn-ghost text-error"
                title="Dừng đọc bài viết"
              >
                ⏹️
              </button>
            )}

            {/* In bài viết / Xuất PDF */}
            <button
              type="button"
              onClick={handlePrintArticle}
              className="btn btn-xs btn-outline btn-ghost gap-1 rounded-xl hover:text-primary"
              title="In bài viết ra giấy hoặc lưu thành tệp PDF sạch"
            >
              <span>🖨️ In / PDF</span>
            </button>

            {/* Chế độ tập trung Zen Mode */}
            <button
              type="button"
              onClick={() => {
                const next = !isZenMode;
                setIsZenMode(next);
                addToast(next ? "Đã bật chế độ đọc tập trung! Nhấn Esc để thoát. 🧘" : "Đã tắt chế độ đọc tập trung.", "info");
              }}
              className={`btn btn-xs rounded-xl gap-1 transition-all ${
                isZenMode
                  ? "btn-primary text-white font-bold shadow-xs"
                  : "btn-outline btn-ghost hover:text-primary"
              }`}
              title="Ẩn toàn bộ thành phần gây xao nhãng để tập trung đọc bài viết (Phím tắt: Esc để thoát)"
            >
              <span>🧘</span>
              <span>{isZenMode ? "Đang tập trung" : "Tập trung"}</span>
            </button>
          </div>
        </div>

        {/* Nội dung bài viết */}
        <div className={`py-4 transition-all ${
          fontSizeLevel === "sm"
            ? "text-sm"
            : fontSizeLevel === "lg"
            ? "text-lg"
            : fontSizeLevel === "xl"
            ? "text-xl"
            : "text-base"
        }`}>
          <MarkdownRenderer content={post.content} headingIdPrefix={"post-" + post.id + "-"} />
        </div>

        {/* Khung thông tin tác giả ở cuối bài */}
        <div className="mt-8 p-6 bg-base-200/50 rounded-2xl border border-base-200 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <img
            src={author.avatar}
            alt={author.name}
            onClick={() => onNavigate && onNavigate("profile", { authorId: author.id })}
            className="w-16 h-16 rounded-full ring-2 ring-primary/20 object-cover cursor-pointer hover:scale-105 transition-transform"
            title={`Xem hồ sơ của ${author.name}`}
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(author.name || "dev")}`;
            }}
          />
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4
                  onClick={() => onNavigate && onNavigate("profile", { authorId: author.id })}
                  className="font-bold text-base text-base-content hover:text-primary cursor-pointer transition-colors"
                  title={`Xem hồ sơ của ${author.name}`}
                >
                  {author.name}
                </h4>
                <p className="text-xs text-base-content/60">{author.bio}</p>
              </div>
              {currentUser?.id !== author.id && (
                <button
                  onClick={handleFollow}
                  className={`btn btn-xs rounded-full font-semibold px-4 self-center sm:self-start ${
                    isFollowingAuthor
                      ? "btn-outline border-base-300 text-base-content/80 hover:bg-base-200"
                      : "btn-primary text-white"
                  }`}
                >
                  {isFollowingAuthor ? "✓ Đang theo dõi" : "+ Theo dõi tác giả"}
                </button>
              )}
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-base-content/60">
              <span>👥 {Array.isArray(author.followers) ? author.followers.length : (typeof author.followers === "number" ? author.followers : (author.followers_count || 0))} người theo dõi</span>
              <span>📝 {posts.filter((p) => p.authorId === author.id).length} bài viết</span>
            </div>
          </div>
        </div>
      </article>

      {/* Bài viết liên quan */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
            <span>📚 Bài viết cùng chuyên mục</span>
            <span className="badge badge-primary badge-outline text-xs">{post.category}</span>
          </h3>
          <button
            onClick={() => onNavigate("home")}
            className="text-xs text-primary hover:underline font-semibold"
          >
            Xem tất cả →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {posts
            .filter((p) => p.id !== post.id && p.category === post.category)
            .slice(0, 3)
            .map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (onNavigate) {
                    onNavigate("post_detail", { postId: item.id });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="card bg-base-100 border border-base-300 rounded-2xl overflow-hidden hover:shadow-md transition-all cursor-pointer group"
              >
                <figure className="h-32 overflow-hidden bg-base-200">
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80";
                    }}
                  />
                </figure>
                <div className="p-4 space-y-2">
                  <span className="badge badge-xs badge-ghost text-[10px] font-semibold">
                    {item.category}
                  </span>
                  <h4 className="font-bold text-xs line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-base-content/50 pt-1">
                    <span>{item.readTime}</span>
                    <span>❤️ {Array.isArray(item.likes) ? item.likes.length : (typeof item.likes === "number" ? item.likes : 0)}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Quảng cáo công nghệ tài trợ (IT Developer Ads) */}
      <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-base-200 via-primary/5 to-base-200 border border-base-300 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
            {sponsoredAd?.category === "DevOps" ? "☁️" : sponsoredAd?.category === "AI" ? "🤖" : "⚡"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-xs bg-amber-400 text-amber-950 font-extrabold uppercase">Tài trợ</span>
              <span className="font-bold text-xs text-base-content">
                {sponsoredAd?.title || "Nhận $200 Cloud Server Credits cho Lập Trình Viên"}
              </span>
            </div>
            <p className="text-xs text-base-content/70 mt-0.5 line-clamp-1">
              {sponsoredAd?.description || "Hạ tầng đám mây tối ưu cho ứng dụng FastAPI, Node.js, PostgreSQL và Docker với độ trễ thấp."}
            </p>
          </div>
        </div>
        <button
          onClick={() => handleAdClick(sponsoredAd || { target_url: "https://cloud.google.com" })}
          className="btn btn-sm btn-primary text-white font-bold text-xs shrink-0 px-4"
        >
          {sponsoredAd?.call_to_action || "Trải nghiệm ngay →"}
        </button>
      </div>

      {/* Video bài giảng kỹ thuật liên quan (Related Tech Videos) */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
            <span>🎬 Video bài giảng kỹ thuật liên quan</span>
            <span className="badge badge-outline text-xs">Thực chiến</span>
          </h3>
          <span className="text-xs text-base-content/50">Cập nhật từ các kênh công nghệ</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(relatedVideos.length > 0
            ? relatedVideos
            : [
                {
                  id: "v1",
                  title: `Thực hành xây dựng hệ thống với ${post.category || "Công nghệ"}`,
                  channel: "Tech Architecture VN",
                  duration: "32:15",
                  thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&q=80",
                  url: "https://youtube.com",
                  views: "18.5K"
                },
                {
                  id: "v2",
                  title: "Tối ưu hóa hiệu năng & bảo mật RESTful API",
                  channel: "DevOps & Backend Lab",
                  duration: "25:40",
                  thumbnail: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=600&q=80",
                  url: "https://youtube.com",
                  views: "12.3K"
                },
                {
                  id: "v3",
                  title: "Clean Architecture & Design Patterns trong dự án lớn",
                  channel: "Senior Engineering",
                  duration: "41:00",
                  thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&q=80",
                  url: "https://youtube.com",
                  views: "24.1K"
                }
              ]
          ).slice(0, 3).map((video) => (
            <a
              key={video.id}
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="card bg-base-100 border border-base-300 rounded-2xl overflow-hidden hover:shadow-md transition-all group"
            >
              <div className="relative h-32 bg-base-200 overflow-hidden">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80";
                  }}
                />
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-bold">
                  {video.duration}
                </span>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg shadow-lg">
                    ▶
                  </span>
                </div>
              </div>
              <div className="p-3 space-y-1">
                <h4 className="font-bold text-xs line-clamp-2 group-hover:text-primary transition-colors">
                  {video.title}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-base-content/50 pt-1">
                  <span>{video.channel}</span>
                  <span>👁️ {video.views}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Khu vực Bài viết cùng chủ đề liên quan (Related Posts) */}
      {relatedPosts.length > 0 && (
        <section className="mt-8 bg-base-100 rounded-2xl border border-base-300 p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-base-content flex items-center gap-2">
              <span>📚 Bài viết cùng chủ đề liên quan</span>
            </h3>
            <span className="text-xs text-base-content/50">Gợi ý thông minh</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedPosts.slice(0, 3).map((rPost) => (
              <div
                key={rPost.id}
                onClick={() => {
                  if (onNavigate) {
                    onNavigate("post_detail", { postId: rPost.id });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="p-3.5 rounded-xl bg-base-200/40 border border-base-200 hover:border-primary/40 hover:bg-base-200/80 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-full h-28 rounded-lg overflow-hidden mb-2.5 bg-base-300">
                    <img
                      src={rPost.coverImage || rPost.cover_image || "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80"}
                      alt={rPost.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80";
                      }}
                    />
                  </div>
                  <span className="badge badge-xs badge-primary font-semibold mb-1">
                    {rPost.category?.name || rPost.category_name || rPost.category || "Công nghệ"}
                  </span>
                  <h4 className="font-bold text-xs text-base-content group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {rPost.title}
                  </h4>
                </div>
                <div className="flex items-center justify-between text-[11px] text-base-content/50 pt-2.5 mt-2 border-t border-base-300/40">
                  <span>⏱️ {rPost.readTime || rPost.read_time || "5 phút"}</span>
                  <span className="font-bold text-primary group-hover:underline">Đọc tiếp →</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Khu vực Bình luận */}
      <section className="mt-10 bg-base-100 rounded-2xl border border-base-300 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h3 className="text-xl font-bold text-base-content flex items-center gap-2">
            <span>Thảo luận & Bình luận</span>
            <span className="badge badge-neutral">{post.comments?.length || 0}</span>
          </h3>

          <button
            type="button"
            onClick={handleTriggerBotComment}
            disabled={botLoading}
            className="btn btn-xs btn-outline btn-primary gap-1.5 font-bold"
            title="Nhờ AI TechBot tự động tham gia phân tích kỹ thuật và đặt câu hỏi mở"
          >
            {botLoading ? <span className="loading loading-spinner loading-xs"></span> : <span>🤖</span>}
            Nhờ AI TechBot phân tích bài viết
          </button>
        </div>

        {/* Form viết bình luận */}
        <form onSubmit={handleCommentSubmit} className="mb-8">
          <div className="relative">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                currentUser
                  ? `Viết bình luận với tư cách ${currentUser.name}...`
                  : "Nhập bình luận của bạn (Hệ thống sẽ yêu cầu đăng nhập trước khi gửi và giữ nguyên nội dung)..."
              }
              rows={3}
              className="textarea textarea-bordered w-full text-sm focus:textarea-primary transition-all p-3"
              required
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-base-content/50">
                Hãy thảo luận văn minh và tôn trọng quan điểm của người khác.
              </p>
              <button
                type="submit"
                className="btn btn-sm btn-primary text-white font-semibold"
              >
                Gửi bình luận
              </button>
            </div>
          </div>
        </form>

        {/* Header danh sách bình luận, Tìm kiếm, Sắp xếp & Xuất Markdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-2 border-b border-base-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-base-content">
              💬 Thảo luận cộng đồng ({post.comments?.length || 0})
            </span>
            {commentSearch && (
              <span className="badge badge-sm badge-primary text-white font-semibold">
                Đang lọc: &quot;{commentSearch}&quot;
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Thanh tìm kiếm nhanh trong bình luận */}
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm trong thảo luận..."
                value={commentSearch}
                onChange={(e) => setCommentSearch(e.target.value)}
                className="input input-xs input-bordered rounded-lg pl-6 pr-6 w-36 sm:w-44 focus:input-primary text-xs"
              />
              <span className="absolute left-2 top-1.5 text-[11px] text-base-content/40">🔍</span>
              {commentSearch && (
                <button
                  type="button"
                  onClick={() => setCommentSearch("")}
                  className="absolute right-2 top-1 text-[11px] text-base-content/50 hover:text-base-content"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sắp xếp */}
            <div className="flex items-center gap-1">
              <span className="text-base-content/60 font-semibold hidden md:inline">Sắp xếp:</span>
              <select
                value={commentSortOrder}
                onChange={(e) => setCommentSortOrder(e.target.value)}
                className="select select-bordered select-xs rounded-lg text-xs font-medium focus:select-primary"
              >
                <option value="newest">⚡ Mới nhất</option>
                <option value="top">🔥 Nhiều thích nhất</option>
                <option value="oldest">⏳ Cũ nhất</option>
              </select>
            </div>

            {/* Nút xuất thảo luận ra Markdown */}
            {isAdmin && post.comments && post.comments.length > 0 && (
              <button
                type="button"
                onClick={handleExportDiscussionMd}
                className="btn btn-xs btn-outline border-base-300 rounded-lg font-bold gap-1 hover:border-primary hover:text-primary transition-all shadow-2xs"
                title="Xuất toàn bộ luồng thảo luận bài viết ra tài liệu Markdown (.md)"
              >
                <span>📥</span>
                <span>Xuất .md</span>
              </button>
            )}
          </div>
        </div>

        {/* Danh sách bình luận & Trả lời đa cấp */}
        <div className="space-y-4">
          {post?.comments && post.comments.length > 0 ? (
            post.comments
              .filter((c) => !c.parentId && !c.parent_id)
              .filter((c) => {
                if (!commentSearch.trim()) return true;
                const q = commentSearch.toLowerCase().trim();
                const contentMatch = (c.content || c.text || "").toLowerCase().includes(q);
                const userMatch = (c.userName || c.user_name || "").toLowerCase().includes(q);
                if (contentMatch || userMatch) return true;
                const replies = (post.comments || []).filter(
                  (r) => String(r.parentId) === String(c.id) || String(r.parent_id) === String(c.id)
                );
                return replies.some((r) =>
                  (r.content || r.text || "").toLowerCase().includes(q) ||
                  (r.userName || r.user_name || "").toLowerCase().includes(q)
                );
              })
              .map((c) => ({
                ...c,
                isPinned: pinnedComments[c.id] !== undefined ? pinnedComments[c.id] : Boolean(c.isPinned || c.is_pinned),
                isAccepted: acceptedComments[c.id] !== undefined ? acceptedComments[c.id] : Boolean(c.isAccepted || c.is_accepted_answer)
              }))
              .sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                if (a.isAccepted && !b.isAccepted) return -1;
                if (!a.isAccepted && b.isAccepted) return 1;
                if (commentSortOrder === "top") {
                  const likesA = commentLikes[a.id]?.count ?? (a.likes_count ?? (Array.isArray(a.likes) ? a.likes.length : 0));
                  const likesB = commentLikes[b.id]?.count ?? (b.likes_count ?? (Array.isArray(b.likes) ? b.likes.length : 0));
                  if (likesB !== likesA) return likesB - likesA;
                } else if (commentSortOrder === "oldest") {
                  return new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0);
                }
                return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0);
              })
              .map((comment) => {
                const canDeleteComment = Boolean(currentUser && (currentUser.id === comment.userId || isAdmin));
                const canManageComment =
                  currentUser && (currentUser.id === post.authorId || currentUser.role === "admin");

                const replies = (post.comments || []).filter(
                  (r) => String(r.parentId) === String(comment.id) || String(r.parent_id) === String(comment.id)
                ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                const likeInfo = commentLikes[comment.id] || {
                  count: comment.likes_count ?? (Array.isArray(comment.likes) ? comment.likes.length : 0),
                  isLiked: Boolean(comment.is_liked)
                };

                return (
                  <div
                    key={comment.id}
                    className={`flex flex-col gap-2 p-4 rounded-2xl transition-all ${
                      comment.isAccepted
                        ? "bg-success/10 border-2 border-success/40 shadow-xs"
                        : comment.isPinned
                        ? "bg-primary/5 border border-primary/30"
                        : "bg-base-200/50 border border-base-200"
                    }`}
                  >
                    <div className="flex gap-3">
                      <img
                        src={comment.userAvatar}
                        alt={comment.userName}
                        className="w-9 h-9 rounded-full bg-base-300 shrink-0 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(comment.userName || "user")}`;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-2 mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-base-content">
                              {comment.userName}
                            </span>
                            {comment.isPinned && (
                              <span className="badge badge-xs badge-neutral gap-1 text-[10px]">
                                📌 Đã ghim
                              </span>
                            )}
                            {comment.isAccepted && (
                              <span className="badge badge-xs badge-success text-white gap-1 text-[10px] font-bold">
                                🎯 Câu trả lời được chấp nhận
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-base-content/50">
                              {(() => {
                                const cDate = comment.createdAt || comment.created_at;
                                const parsed = cDate ? new Date(cDate) : null;
                                return parsed && !isNaN(parsed.getTime())
                                  ? parsed.toLocaleDateString("vi-VN", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      day: "2-digit",
                                      month: "2-digit"
                                    })
                                  : "Vừa xong";
                              })()}
                            </span>

                            {/* Hành động Tác giả / Admin: Ghim & Chấp nhận câu trả lời */}
                            {canManageComment && (
                              <div className="flex items-center gap-1.5 ml-1">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePinComment(comment.id)}
                                  className={`text-[11px] font-semibold hover:underline ${
                                    comment.isPinned ? "text-primary" : "text-base-content/60"
                                  }`}
                                  title={comment.isPinned ? "Bỏ ghim bình luận" : "Ghim lên đầu"}
                                >
                                  📌 {comment.isPinned ? "Bỏ ghim" : "Ghim"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAcceptComment(comment.id)}
                                  className={`text-[11px] font-semibold hover:underline ${
                                    comment.isAccepted ? "text-success font-bold" : "text-base-content/60"
                                  }`}
                                  title={comment.isAccepted ? "Hủy chấp nhận" : "Chấp nhận câu trả lời"}
                                >
                                  🎯 {comment.isAccepted ? "Đã duyệt" : "Chấp nhận"}
                                </button>
                              </div>
                            )}

                            {canDeleteComment && (
                              <button
                                onClick={() => deleteComment(post.id, comment.id)}
                                className="text-xs text-error hover:underline ml-1"
                                title="Xóa bình luận này"
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-base-content/80 whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>

                        {/* Thanh tương tác bình luận: Like & Reply */}
                        <div className="flex items-center gap-3 pt-2.5 mt-1 border-t border-base-200/60">
                          <button
                            type="button"
                            onClick={() => handleToggleCommentLike(comment.id)}
                            className={`btn btn-xs rounded-lg gap-1 transition-all ${
                              likeInfo.isLiked
                                ? "btn-error text-white font-bold"
                                : "btn-ghost text-base-content/70 hover:text-error"
                            }`}
                            title="Thích bình luận này"
                          >
                            <span>❤️</span>
                            <span className="text-[11px]">{likeInfo.count}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId((curr) => (curr === comment.id ? null : comment.id));
                              setReplyText("");
                            }}
                            className="btn btn-xs btn-ghost text-base-content/70 hover:text-primary rounded-lg text-[11px] font-semibold gap-1"
                          >
                            <span>💬</span>
                            <span>{replyingToId === comment.id ? "Đóng trả lời" : "Trả lời"}</span>
                            {replies.length > 0 && <span className="badge badge-xs badge-neutral text-[10px]">{replies.length}</span>}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Inline Reply Form */}
                    {replyingToId === comment.id && (
                      <div className="mt-2 pl-3 sm:pl-10 pr-2 py-2 space-y-2 animate-fade-in">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Viết phản hồi gửi tới @${comment.userName}...`}
                          rows={2}
                          className="textarea textarea-bordered w-full text-xs focus:textarea-primary rounded-xl"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(null);
                              setReplyText("");
                            }}
                            className="btn btn-xs btn-ghost rounded-lg"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendReply(comment.id)}
                            disabled={!replyText.trim()}
                            className="btn btn-xs btn-primary text-white font-bold px-3 rounded-lg"
                          >
                            Gửi phản hồi
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Danh sách phản hồi lồng cấp (Nested Replies) */}
                    {replies.length > 0 && (
                      <div className="pl-3 sm:pl-8 border-l-2 border-primary/20 space-y-2.5 mt-2 pt-2">
                        {replies.map((reply) => {
                          const canDeleteReply = Boolean(currentUser && (currentUser.id === reply.userId || isAdmin));
                          const replyLike = commentLikes[reply.id] || {
                            count: reply.likes_count ?? (Array.isArray(reply.likes) ? reply.likes.length : 0),
                            isLiked: Boolean(reply.is_liked)
                          };

                          return (
                            <div
                              key={reply.id}
                              className="p-3 rounded-xl bg-base-100 border border-base-200 text-xs flex gap-2.5"
                            >
                              <img
                                src={reply.userAvatar}
                                alt={reply.userName}
                                className="w-7 h-7 rounded-full bg-base-300 object-cover shrink-0"
                                onError={(e) => {
                                  e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(reply.userName || "user")}`;
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-2 mb-0.5">
                                  <span className="font-bold text-base-content">{reply.userName}</span>
                                  <div className="flex items-center gap-2 text-[10px] text-base-content/50">
                                    <span>
                                      {(() => {
                                        const rDate = reply.createdAt || reply.created_at;
                                        const parsed = rDate ? new Date(rDate) : null;
                                        return parsed && !isNaN(parsed.getTime())
                                          ? parsed.toLocaleDateString("vi-VN", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                              day: "2-digit",
                                              month: "2-digit"
                                            })
                                          : "Vừa xong";
                                      })()}
                                    </span>
                                    {canDeleteReply && (
                                      <button
                                        type="button"
                                        onClick={() => deleteComment(post.id, reply.id)}
                                        className="text-error hover:underline"
                                      >
                                        Xóa
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-base-content/80 whitespace-pre-wrap break-words leading-relaxed">
                                  {reply.content}
                                </p>
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCommentLike(reply.id)}
                                    className={`btn btn-xs btn-ghost gap-1 px-1.5 h-6 min-h-6 ${
                                      replyLike.isLiked ? "text-error font-bold" : "text-base-content/50 hover:text-error"
                                    }`}
                                  >
                                    <span>❤️</span>
                                    <span className="text-[10px]">{replyLike.count}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
          ) : (
            <div className="text-center py-8 bg-base-200/30 rounded-xl border border-dashed border-base-300">
              <p className="text-sm text-base-content/60">
                Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ suy nghĩ của bạn!
              </p>
            </div>
          )}
        </div>
      </section>
        </div>

        {/* Cột phải: MỤC LỤC & TIỆN ÍCH BÀI VIẾT (Sticky ngoài thẻ bài viết) */}
        <aside className="order-2 lg:order-2 lg:sticky lg:top-20 space-y-4">
          <TableOfContents content={post.content} headingIdPrefix={"post-" + post.id + "-"} />

          {/* Trắc nghiệm bài viết */}
          <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm text-center">
            <span className="text-2xl mb-1 block">📝</span>
            <p className="text-sm font-bold text-base-content mb-1">Trắc nghiệm kiến thức</p>
            <p className="text-xs text-base-content/60 mb-3">Kiểm tra mức độ hiểu bài qua các câu hỏi trắc nghiệm!</p>
            <button
              onClick={() => onNavigate("quiz", { quizParams: { postId: post.id, title: post.title } })}
              className="btn btn-sm btn-primary w-full text-white font-bold gap-1 shadow-2xs"
            >
              Làm bài trắc nghiệm
            </button>
          </div>

          {post.tags?.length > 0 && (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-base-content/60 mb-2">
                Chủ đề liên quan
              </p>
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="badge badge-sm border border-base-300 bg-base-200/60 text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Banner cơ hội và công cụ tài trợ cho Developer */}
          <DeveloperAdCard category={post.category} />
        </aside>
      </div>

      {/* Nút nổi Trợ lý AI ở góc phải màn hình */}
      <button
        onClick={() => {
          setAiModalOpen(true);
          if (!aiSummary) handleAiSummarize();
        }}
        className="fixed bottom-6 right-6 z-30 btn btn-primary btn-circle shadow-2xl hover:scale-110 active:scale-95 transition-all text-xl text-white"
        title="Trợ lý AI Đọc hiểu & Hỏi đáp"
      >
        🤖
      </button>

      {/* AI Assistant Modal */}
      {aiModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setAiModalOpen(false); }}
        >
          <div className="bg-base-100 rounded-3xl border border-base-300 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-base-200 flex items-center justify-between bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-lg font-bold shadow-xs">
                  🤖
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-base-content">Trợ lý AI Đọc hiểu IT</h3>
                  <p className="text-[11px] text-base-content/60">Tóm tắt, Hỏi đáp kỹ thuật và Giải thích mã nguồn bằng AI</p>
                </div>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="btn btn-sm btn-ghost btn-circle"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-base-200 bg-base-200/40 p-1.5 gap-1">
              <button
                onClick={() => {
                  setAiTab("summary");
                  if (!aiSummary) handleAiSummarize();
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  aiTab === "summary" ? "bg-base-100 text-primary shadow-xs" : "text-base-content/70 hover:text-base-content"
                }`}
              >
                📝 Tóm tắt nhanh
              </button>
              <button
                onClick={() => setAiTab("qa")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  aiTab === "qa" ? "bg-base-100 text-primary shadow-xs" : "text-base-content/70 hover:text-base-content"
                }`}
              >
                💬 Hỏi đáp bài viết
              </button>
              <button
                onClick={() => setAiTab("code")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  aiTab === "code" ? "bg-base-100 text-primary shadow-xs" : "text-base-content/70 hover:text-base-content"
                }`}
              >
                💻 Giải thích Code
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Tab 1: Summary */}
              {aiTab === "summary" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-base-content/70">Tóm tắt ý chính từ bài viết:</span>
                    <button
                      onClick={handleAiSummarize}
                      disabled={aiLoading}
                      className="btn btn-xs btn-outline btn-primary gap-1"
                    >
                      {aiLoading ? <span className="loading loading-spinner loading-xs"></span> : "🔄 Làm mới"}
                    </button>
                  </div>
                  {aiLoading ? (
                    <div className="p-8 text-center space-y-2">
                      <span className="loading loading-spinner loading-md text-primary"></span>
                      <p className="text-xs text-base-content/60">AI đang phân tích và đúc kết nội dung bài viết...</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300 text-sm leading-relaxed text-base-content">
                      {aiSummary || "Bấm 'Làm mới' hoặc chờ giây lát để AI tóm tắt nội dung bài viết này."}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Q&A */}
              {aiTab === "qa" && (
                <div className="space-y-4">
                  <form onSubmit={handleAiAsk} className="flex gap-2">
                    <input
                      type="text"
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      placeholder="Đặt câu hỏi về bài viết (VD: Giải pháp này có áp dụng được cho microservices?)..."
                      className="input input-sm input-bordered flex-1 text-xs focus:input-primary"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiQuestion.trim()}
                      className="btn btn-sm btn-primary text-white text-xs font-bold shrink-0"
                    >
                      {aiLoading ? <span className="loading loading-spinner loading-xs"></span> : "Hỏi AI"}
                    </button>
                  </form>

                  {aiAnswer && (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/30 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary">
                        <span>🤖 Trả lời từ AI:</span>
                      </div>
                      <p className="text-xs sm:text-sm text-base-content/90 leading-relaxed whitespace-pre-wrap break-words">
                        {aiAnswer}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Code Explainer */}
              {aiTab === "code" && (
                <div className="space-y-4">
                  <form onSubmit={handleAiExplainCode} className="space-y-3">
                    <textarea
                      value={aiCodeInput}
                      onChange={(e) => setAiCodeInput(e.target.value)}
                      placeholder="Dán đoạn code cần giải thích vào đây..."
                      rows={4}
                      className="textarea textarea-bordered w-full text-xs font-mono focus:textarea-primary"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={aiLoading || !aiCodeInput.trim()}
                        className="btn btn-sm btn-primary text-white text-xs font-bold"
                      >
                        {aiLoading ? <span className="loading loading-spinner loading-xs"></span> : "Giải thích Code"}
                      </button>
                    </div>
                  </form>

                  {aiCodeExplanation && (
                    <div className="p-4 rounded-2xl bg-base-200/60 border border-base-300 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-base-content">
                        <span>💡 Phân tích kỹ thuật:</span>
                      </div>
                      <p className="text-xs sm:text-sm text-base-content/90 leading-relaxed whitespace-pre-wrap break-words">
                        {aiCodeExplanation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-base-200 bg-base-100 flex justify-between items-center text-xs text-base-content/50">
              <span>Được hỗ trợ bởi AI Assistant Module</span>
              <button onClick={() => setAiModalOpen(false)} className="btn btn-xs btn-ghost">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lịch Sử Chỉnh Sửa Bài Viết (Section 3) */}
      {showRevisions && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRevisions(false); }}
        >
          <div className="modal-box max-w-2xl rounded-3xl p-6 bg-base-100 border border-base-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-base-300">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🕒</span>
                <div>
                  <h3 className="text-lg font-bold text-base-content">Lịch Sử Chỉnh Sửa Bài Viết</h3>
                  <p className="text-xs text-base-content/60">Theo dõi các phiên bản nội dung đã được lưu vết</p>
                </div>
              </div>
              <button onClick={() => setShowRevisions(false)} className="btn btn-sm btn-circle btn-ghost">✕</button>
            </div>

            <div className="my-4 max-h-96 overflow-y-auto space-y-3">
              {loadingRevisions ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                </div>
              ) : revisions.length === 0 ? (
                <div className="text-center py-8 text-sm text-base-content/60">
                  <span className="text-3xl block mb-2">✨</span>
                  Bài viết này đang ở phiên bản đầu tiên, chưa có lần chỉnh sửa nào.
                </div>
              ) : (
                revisions.map((rev, idx) => (
                  <div key={rev.id || idx} className="p-4 rounded-2xl bg-base-200/60 border border-base-300 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-primary">Phiên bản #{revisions.length - idx}</span>
                      <span className="text-base-content/50">
                        {rev.created_at && !isNaN(new Date(rev.created_at).getTime()) ? new Date(rev.created_at).toLocaleString("vi-VN") : "Gần đây"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-base-content">{rev.title}</p>
                    {rev.change_summary && (
                      <p className="text-xs italic text-base-content/70">
                        📝 Ghi chú: {rev.change_summary}
                      </p>
                    )}
                    <div className="p-3 rounded-xl bg-base-100 text-xs text-base-content/80 line-clamp-3 font-mono">
                      {rev.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="modal-action">
              <button onClick={() => setShowRevisions(false)} className="btn btn-sm btn-ghost rounded-xl">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Báo Cáo Vi Phạm (Section 5: Content Moderation) */}
      {showReportModal && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowReportModal(false); }}
        >
          <div className="modal-box max-w-lg rounded-3xl p-6 bg-base-100 border border-base-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-base-300">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚩</span>
                <div>
                  <h3 className="text-lg font-bold text-base-content">Báo Cáo Bài Viết</h3>
                  <p className="text-xs text-base-content/60">Gửi phản ánh đến ban kiểm duyệt cộng đồng IT Blog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4 my-4">
              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Lý do báo cáo vi phạm <span className="text-error">*</span>
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="select select-bordered w-full text-xs font-semibold focus:select-primary"
                  required
                >
                  <option value="spam">Quảng cáo rác, Spammer hoặc nội dung lặp lại</option>
                  <option value="misleading">Thông tin kỹ thuật sai lệch, mã độc (Malware/Phishing)</option>
                  <option value="toxic">Nội dung xúc phạm, đả kích cá nhân hoặc công kích cá nhân</option>
                  <option value="copyright">Vi phạm bản quyền hoặc sao chép mã nguồn không ghi nguồn</option>
                  <option value="other">Lý do khác...</option>
                </select>
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Mô tả chi tiết vi phạm (Tùy chọn)
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Vui lòng cung cấp thêm ngữ cảnh hoặc trích dẫn đoạn vi phạm để ban kiểm duyệt xử lý nhanh chóng..."
                  rows={4}
                  className="textarea textarea-bordered w-full text-xs focus:textarea-primary leading-relaxed"
                />
              </div>

              <div className="modal-action border-t border-base-200 pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="btn btn-sm btn-ghost rounded-xl"
                  disabled={submittingReport}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="btn btn-sm btn-error text-white font-bold rounded-xl px-5"
                >
                  {submittingReport ? "Đang gửi báo cáo..." : "Gửi báo cáo vi phạm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

