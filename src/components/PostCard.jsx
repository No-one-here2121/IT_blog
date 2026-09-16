import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";

// Thumbnail mặc định theo từng chủ đề
const CATEGORY_THUMBNAILS = {
  Frontend: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=600&q=80",
  Backend: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
  "AI & LLM": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80",
  DevOps: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=600&q=80",
  Database: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80",
  "System Design": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
  Career: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80"
};

export default function PostCard({ post, onNavigate, onSelectPost, onEdit, onDelete }) {
  const { currentUser, requireAuth } = useAuth();
  const { getAuthor, toggleLike, toggleBookmark } = useBlog();

  const author = getAuthor(post.authorId);
  const isLiked = currentUser && post.likes?.includes(currentUser.id);
  const isBookmarked = currentUser && post.bookmarks?.includes(currentUser.id);

  const thumbnailUrl =
    post.coverImage ||
    CATEGORY_THUMBNAILS[post.category] ||
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80";

  // Định dạng ngày tháng
  const formattedDate = new Date(post.createdAt).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  const handleOpenDetail = () => {
    if (onSelectPost) onSelectPost(post.id);
    if (onNavigate) onNavigate("post_detail");
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

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden group">
      {/* Thumbnail ảnh minh họa chất lượng cao */}
      <div
        onClick={handleOpenDetail}
        className="relative w-full h-44 sm:h-48 overflow-hidden cursor-pointer bg-base-200"
      >
        <img
          src={thumbnailUrl}
          alt={post.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3">
          <span className="badge badge-primary text-white font-bold text-xs uppercase shadow-md">
            {post.category}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          {/* Nút bookmark nhanh trên ảnh */}
          <button
            onClick={handleBookmark}
            type="button"
            className={`btn btn-circle btn-xs backdrop-blur-md transition-all shadow-md ${
              isBookmarked
                ? "bg-amber-400 text-amber-950 border-amber-300 hover:bg-amber-500"
                : "bg-black/40 text-white/90 hover:bg-black/70 border-white/20"
            }`}
            title={isBookmarked ? "Đã lưu bài viết" : "Lưu bài viết"}
          >
            <svg
              className={`w-3.5 h-3.5 ${isBookmarked ? "fill-current" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="card-body p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header tác giả & Ngày đăng */}
          <div className="flex items-center gap-2.5 mb-3">
            <img
              src={author.avatar}
              alt={author.name}
              className="w-8 h-8 rounded-full bg-base-200 border border-base-300 object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-base-content truncate hover:text-primary transition-colors">
                {author.name}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-base-content/60">
                <span>{formattedDate}</span>
                <span>•</span>
                <span>{post.readTime || "5 phút đọc"}</span>
              </div>
            </div>
          </div>

          {/* Tiêu đề bài viết */}
          <h2
            onClick={handleOpenDetail}
            className="text-base sm:text-lg font-bold text-base-content hover:text-primary cursor-pointer line-clamp-2 leading-snug transition-colors mb-2"
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
              className="badge badge-xs bg-base-200 text-base-content/70 hover:bg-base-300 transition-colors"
            >
              #{tag}
            </span>
          ))}
          {post.tags && post.tags.length > 3 && (
            <span className="badge badge-xs bg-base-200 text-base-content/50">
              +{post.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Footer Card: Like, Comment, Lượt xem, Đọc tiếp */}
      <div className="border-t border-base-200 px-5 py-3 flex items-center justify-between bg-base-200/30 text-xs text-base-content/70">
        <div className="flex items-center gap-3.5">
          {/* Nút Like */}
          <button
            onClick={handleLike}
            type="button"
            className={`flex items-center gap-1.5 hover:text-error transition-colors ${
              isLiked ? "text-error font-bold" : ""
            }`}
            title={isLiked ? "Bỏ thích" : "Thích bài viết"}
          >
            <svg
              className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{post.likes?.length || 0}</span>
          </button>

          {/* Nút Bình luận */}
          <button
            onClick={handleOpenDetail}
            type="button"
            className="flex items-center gap-1.5 hover:text-primary transition-colors"
            title="Xem bình luận"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>{post.comments?.length || 0}</span>
          </button>

          {/* Lượt xem */}
          <div className="flex items-center gap-1 text-base-content/50">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>{post.views || 0}</span>
          </div>
        </div>

        {/* Nút Xem chi tiết & Thao tác quản lý bài viết */}
        <div className="flex items-center gap-1.5">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(post);
              }}
              className="btn btn-xs btn-ghost text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1 font-semibold"
              title="Chỉnh sửa bài viết"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Sửa</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(post.id);
              }}
              className="btn btn-xs btn-ghost text-error hover:bg-error/10 p-1"
              title="Xóa bài viết"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          <button
            onClick={handleOpenDetail}
            className="btn btn-xs btn-primary btn-outline font-semibold"
          >
            Đọc bài
          </button>
        </div>
      </div>
    </div>
  );
}
