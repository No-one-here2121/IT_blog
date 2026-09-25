import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";
import { useToast } from "../context/ToastContext";
import { BrandIcon, Heart, MessageSquare, Eye, Bookmark, Pin, Trash2, Edit3, Clock, BadgeCheck, AlertTriangle, X } from "./icons";

// Thumbnail mặc định theo từng chủ đề
const CATEGORY_THUMBNAILS = {
  Frontend: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=600&q=80",
  Backend: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
  "AI & LLM": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80",
  "AI & Data": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80",
  DevOps: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=600&q=80",
  Database: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80",
  "System Design": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
  System: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
  Mobile: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80",
  Career: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80"
};

export default function PostCard({ post, onNavigate, onSelectPost, onEdit, onDelete }) {
  const { currentUser, requireAuth, isAdmin: authIsAdmin, isModerator } = useAuth();
  const { getAuthor, toggleLike, toggleBookmark, deletePost, togglePinPost, deleteComment, addComment } = useBlog();
  const { addToast } = useToast();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  const author = getAuthor(post.authorId || post.author_id);
  const isLiked = Boolean(currentUser && Array.isArray(post.likes) && post.likes.includes(currentUser.id));
  const isBookmarked = Boolean(currentUser && Array.isArray(post.bookmarks) && post.bookmarks.includes(currentUser.id));

  // Kiểm tra quyền Quản trị viên Admin / Moderator
  const isAdmin = Boolean(
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

  const isAuthor = Boolean(
    currentUser && (
      String(currentUser.id) === String(post.authorId) ||
      String(currentUser.id) === String(post.author_id)
    )
  );

  const isSupervisor = Boolean(isAdmin || authIsAdmin || isModerator);
  const canEdit = isSupervisor || isAuthor;
  const canDeleteDirect = isSupervisor || isAuthor;

  const thumbnailUrl =
    post.coverImage ||
    CATEGORY_THUMBNAILS[post.category] ||
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80";

  // Định dạng ngày tháng an toàn
  const rawDate = post.createdAt || post.created_at || post.date;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const formattedDate = parsedDate && !isNaN(parsedDate.getTime())
    ? parsedDate.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    : (typeof post.date === "string" ? post.date : "Hôm nay");

  const handleOpenDetail = () => {
    if (onSelectPost) onSelectPost(post.id);
    if (onNavigate) onNavigate("post_detail", { postId: post.id });
  };

  const handleAuthorClick = (e) => {
    e.stopPropagation();
    const targetAuthorId = author?.id || post?.authorId || post?.author_id;
    if (onNavigate && targetAuthorId) {
      onNavigate("profile", { authorId: targetAuthorId });
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    requireAuth(
      () => toggleLike(post.id),
      "Vui lòng đăng nhập để thích bài viết này!"
    );
  };

  const handleBookmark = (e) => {
    e.stopPropagation();
    requireAuth(
      () => toggleBookmark(post.id),
      "Vui lòng đăng nhập để lưu bài viết vào mục yêu thích!"
    );
  };

  const handleDirectDelete = (e) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const confirmDeletePost = () => {
    if (onDelete) {
      onDelete(post.id);
    } else {
      deletePost(post.id);
    }
    setShowDeleteModal(false);
  };

  const handleTogglePin = (e) => {
    e.stopPropagation();
    togglePinPost(post.id);
  };

  const handleOpenCommentsModal = (e) => {
    e.stopPropagation();
    setShowCommentsModal(true);
  };

  const handleDirectDeleteComment = (commentId) => {
    deleteComment(post.id, commentId);
  };

  const handleAddQuickComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    requireAuth(() => {
      addComment(post.id, newCommentText.trim());
      setNewCommentText("");
      addToast("Đã gửi bình luận thành công!", "success");
    }, "Vui lòng đăng nhập để gửi bình luận!");
  };

  return (
    <>
      <div className={`card bg-base-100 border ${post.isPinned ? "border-amber-400/80 ring-1 ring-amber-400/50 shadow-md" : "border-base-300 shadow-sm"} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden group relative`}>
        
        {/* Thumbnail anh minh hoa */}
        <div
          onClick={handleOpenDetail}
          className="relative w-full h-44 sm:h-48 overflow-hidden cursor-pointer bg-base-200"
        >
          <img
            src={thumbnailUrl}
            alt={post.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80";
            }}
          />

          {/* Huy hiệu ghim và Chuyên mục */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
            {post.isPinned && (
              <span className="badge bg-amber-400 text-amber-950 font-black text-xs shadow-md border-amber-300 gap-1">
                <span className="flex items-center gap-1"><Pin size={12} className="text-amber-500 fill-amber-500 shrink-0" /> ĐÃ GHIM</span>
              </span>
            )}
            <span className="badge badge-primary text-white font-bold text-xs uppercase shadow-md">
              {post.category}
            </span>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {/* Thanh thao tác nhanh Admin trên Newfeed */}
            {isAdmin && (
              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-1.5 py-0.5 border border-white/20 shadow-md">
                <button
                  type="button"
                  onClick={handleTogglePin}
                  className={`btn btn-circle btn-xs ${post.isPinned ? "bg-amber-400 text-amber-950" : "bg-transparent text-white/90 hover:bg-white/20"} border-none flex items-center justify-center`}
                  title={post.isPinned ? "Bỏ ghim bài viết" : "Ghim bài viết lên đầu Newfeed"}
                >
                  <Pin size={12} className={post.isPinned ? "fill-amber-950 text-amber-950" : "text-white"} />
                </button>
                <button
                  type="button"
                  onClick={handleDirectDelete}
                  className="btn btn-circle btn-xs bg-error/80 hover:bg-error text-white border-none flex items-center justify-center"
                  title="Admin: Xóa bài viết trực tiếp"
                >
                  <Trash2 size={12} className="text-white" />
                </button>
              </div>
            )}

            {/* Nut bookmark nhanh */}
            <button
              onClick={handleBookmark}
              type="button"
              className={`btn btn-circle btn-xs backdrop-blur-md transition-all shadow-md flex items-center justify-center ${
                isBookmarked
                  ? "bg-amber-400 text-amber-950 border-amber-300 hover:bg-amber-500"
                  : "bg-black/40 text-white/90 hover:bg-black/70 border-white/20"
              }`}
              title={isBookmarked ? "Đã lưu bài viết" : "Lưu bài viết"}
            >
              <Bookmark size={13} className={isBookmarked ? "fill-amber-950 text-amber-950" : "text-white"} />
            </button>
          </div>
        </div>

        <div className="card-body p-5 flex-1 flex flex-col justify-between">
          <div>
            {/* Header tác giả & Ngày đăng */}
            <div className="flex items-center gap-2.5 mb-3">
              <img
                src={author?.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=dev"}
                alt={author?.name || "Tác giả"}
                onClick={handleAuthorClick}
                className="w-8 h-8 rounded-full bg-base-200 border border-base-300 object-cover shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                title={`Xem hồ sơ của ${author?.name || "tác giả"}`}
                onError={(e) => {
                  e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(author?.name || "dev")}`;
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p
                    onClick={handleAuthorClick}
                    className="text-xs font-bold text-base-content truncate hover:text-primary cursor-pointer transition-colors"
                    title={`Xem hồ sơ của ${author?.name || "tác giả"}`}
                  >
                    {author?.name || "Tác giả IT"}
                  </p>
                  {post.isVerified && (
                    <span className="badge badge-success badge-xs text-white text-[9px] font-bold flex items-center gap-0.5" title="Bài viết đã được kiểm duyệt chuyên môn bởi chuyên gia công nghệ">
                      <BadgeCheck size={11} className="shrink-0" />
                      <span>Chuẩn IT</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-base-content/60">
                  <span>{formattedDate}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} className="shrink-0 text-base-content/40" />
                    <span>{post.readTime || "5 phút đọc"}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Tiêu đề bài viết */}
            <h2
              onClick={handleOpenDetail}
              className="text-base sm:text-lg font-bold text-base-content hover:text-primary cursor-pointer line-clamp-2 leading-snug transition-colors mb-2 break-words"
            >
              {post.title}
            </h2>

            {/* Tóm tắt */}
            <p className="text-xs sm:text-sm text-base-content/70 line-clamp-2 leading-relaxed">
              {post.excerpt}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3 pt-2">
            {post.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="badge badge-xs bg-base-200 text-base-content/70 hover:bg-base-300 transition-colors flex items-center gap-1"
              >
                <BrandIcon name={tag} size={11} colored={true} />
                <span>#{tag}</span>
              </span>
            ))}
            {post.tags && post.tags.length > 3 && (
              <span className="badge badge-xs bg-base-200 text-base-content/50">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Footer Card: Like, Comment, Lượt xem, Đọc tiếp & Admin Actions */}
        <div className="border-t border-base-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2 bg-base-200/30 text-xs text-base-content/70">
          <div className="flex items-center gap-3.5">
            {/* Nut Like */}
            <button
              onClick={handleLike}
              type="button"
              className={`flex items-center gap-1.5 transition-colors group cursor-pointer ${
                isLiked ? "text-rose-500 font-bold" : "hover:text-rose-500 text-base-content/70"
              }`}
              title={isLiked ? "Bỏ thích" : "Thích bài viết"}
            >
              <Heart
                size={15}
                className={isLiked ? "fill-rose-500 text-rose-500" : "text-base-content/60 group-hover:text-rose-500 group-hover:scale-110 transition-transform"}
              />
              <span>{typeof post.likes_count === "number" ? post.likes_count : (Array.isArray(post.likes) ? post.likes.length : (typeof post.likes === "number" ? post.likes : 0))}</span>
            </button>

            {/* Nút Bình luận & Quản lý bình luận trên Newfeed */}
            <button
              onClick={handleOpenCommentsModal}
              type="button"
              className="flex items-center gap-1.5 text-base-content/70 hover:text-blue-500 transition-colors cursor-pointer group"
              title="Xem và quản lý bình luận trên Newfeed"
            >
              <MessageSquare size={15} className="text-blue-500/80 group-hover:text-blue-500 group-hover:scale-110 transition-transform" />
              <span>{typeof post.comments_count === "number" ? post.comments_count : (Array.isArray(post.comments) ? post.comments.length : (typeof post.comments === "number" ? post.comments : 0))}</span>
              {isSupervisor && (post.comments?.length > 0) && (
                <span className="badge badge-xs bg-primary/10 text-primary font-bold text-[10px]">Cmt</span>
              )}
            </button>

            {/* Lượt xem */}
            <div className="flex items-center gap-1 text-base-content/60" title={`${post.views || 0} lượt xem`}>
              <Eye size={14} className="text-indigo-500/80" />
              <span>{post.views || 0}</span>
            </div>
          </div>

          {/* Nút Thao tác & Quản lý bài viết trực tiếp */}
          <div className="flex items-center gap-1.5">
            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdit) onEdit(post);
                  else if (onNavigate) onNavigate("edit_post", { post });
                }}
                className="btn btn-xs btn-ghost text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1 font-semibold"
                title="Chỉnh sửa bài viết"
              >
                <Edit3 size={13} className="text-amber-500" />
                <span>Sửa</span>
              </button>
            )}

            {canDeleteDirect && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                className="btn btn-xs btn-ghost text-error hover:bg-error/10 gap-1 font-semibold"
                title="Xóa bài viết"
              >
                <Trash2 size={13} className="text-error" />
                <span>Xóa</span>
              </button>
            )}

            <button
              onClick={() => {
                if (onSelectPost) onSelectPost(post.id);
                else if (onNavigate) onNavigate("post_detail", { postId: post.id });
              }}
              className="btn btn-primary btn-xs text-white rounded-lg shadow-2xs font-semibold gap-1"
            >
              <span>Đọc tiếp</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Xác nhận Xóa bài viết Trực tiếp trên Newfeed */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-base-100 rounded-3xl max-w-md w-full p-6 border border-base-300 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-error">
              <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-2xl shrink-0">
                🗑️
              </div>
              <div>
                <h3 className="text-lg font-black text-base-content">Xác nhận xóa bài viết?</h3>
                <p className="text-xs text-base-content/60">Hành động này sẽ gỡ bài viết vĩnh viễn khỏi cộng đồng.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-base-200/70 border border-base-300 text-xs space-y-1">
              <p className="font-bold text-base-content line-clamp-2">"{post.title}"</p>
              <p className="text-base-content/60">Tác giả: {author?.name || "Tác giả IT"} • Chuyên mục: {post.category}</p>
              {isAdmin && !isAuthor && (
                <p className="text-warning font-bold flex items-center gap-1 pt-1">
                  <span className="flex items-center gap-1.5"><AlertTriangle size={14} className="text-warning shrink-0" /> Bạn đang thực hiện quyền hạn Quản trị viên (Admin).</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-sm btn-ghost font-bold text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeletePost}
                className="btn btn-sm btn-error text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem & Xóa Bình luận Trực tiếp trên Newfeed */}
      {showCommentsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-base-100 rounded-3xl max-w-xl w-full p-6 border border-base-300 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-base-200">
              <div className="flex items-center gap-2">
                <MessageSquare size={20} className="text-primary shrink-0" />
                <div>
                  <h3 className="text-base font-black text-base-content">
                    Bình luận ({post.comments?.length || 0})
                  </h3>
                  <p className="text-[11px] text-base-content/60 truncate max-w-sm">{post.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCommentsModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            {/* Danh sách bình luận */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
              {!post.comments || post.comments.length === 0 ? (
                <div className="text-center py-10 text-base-content/50 text-xs">
                  Chưa có bình luận nào cho bài viết này. Hãy là người đầu tiên thảo luận!
                </div>
              ) : (
                post.comments.map((cmt) => {
                  const commentAuthorId = cmt.userId ?? cmt.user_id ?? cmt.user?.id;
                  const commentAuthorUsername = cmt.userName ?? cmt.username ?? cmt.user?.username;
                  const isCommentOwner = Boolean(
                    currentUser && (
                      (currentUser.id != null && commentAuthorId != null && String(currentUser.id) === String(commentAuthorId)) ||
                      (currentUser.username && commentAuthorUsername && currentUser.username.toLowerCase() === String(commentAuthorUsername).toLowerCase())
                    )
                  );
                  const canDeleteCmt = isAdmin || isCommentOwner;
                  return (
                    <div
                      key={cmt.id}
                      className="p-3.5 rounded-2xl bg-base-200/60 border border-base-300 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <img
                          src={cmt.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cmt.userName || "dev")}`}
                          alt={cmt.userName}
                          className="w-7 h-7 rounded-full bg-base-300 object-cover shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base-content">{cmt.userName || "Thành viên IT"}</span>
                            <span className="text-[10px] text-base-content/50">
                              {cmt.createdAt ? new Date(cmt.createdAt).toLocaleDateString("vi-VN") : "Gần đây"}
                            </span>
                          </div>
                          <p className="text-base-content/85 whitespace-pre-wrap mt-1 leading-relaxed break-words">
                            {cmt.content}
                          </p>
                        </div>
                      </div>

                      {/* Nút xóa comment trực tiếp */}
                      {canDeleteCmt && (
                        <button
                          type="button"
                          onClick={() => handleDirectDeleteComment(cmt.id)}
                          className="btn btn-xs btn-ghost text-error hover:bg-error/10 shrink-0 font-bold gap-1"
                          title={isAdmin ? "Admin: Xóa bình luận vi phạm này" : "Xóa bình luận của bạn"}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Form gửi bình luận nhanh trực tiếp trên Newfeed */}
            <form onSubmit={handleAddQuickComment} className="pt-3 border-t border-base-200 flex gap-2">
              <input
                type="text"
                placeholder={currentUser ? "Viết phản hồi kỹ thuật nhanh..." : "Đăng nhập để gửi bình luận..."}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="input input-sm input-bordered flex-1 text-xs rounded-xl bg-base-100"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="btn btn-sm btn-primary text-white font-bold text-xs rounded-xl"
              >
                Gửi
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
