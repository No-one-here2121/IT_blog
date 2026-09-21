import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";
import { useToast } from "../context/ToastContext";
import MarkdownRenderer from "../components/MarkdownRenderer";
import TableOfContents from "../components/TableOfContents";

export default function PostDetailPage({ postId, onNavigate, onEditPost }) {
  const { currentUser, requireAuth, toggleFollow } = useAuth();
  const { posts, getAuthor, toggleLike, toggleBookmark, addComment, deleteComment, deletePost, incrementViews } = useBlog();
  const { addToast } = useToast();

  const [commentText, setCommentText] = useState("");

  const post = posts.find((p) => p.id === postId);

  // Tăng lượt xem khi vào đọc & hỗ trợ cuộn theo param
  useEffect(() => {
    if (postId) {
      incrementViews(postId);
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const scrollY = parseInt(params.get("scroll") || "0", 10);
      if (scrollY > 0) {
        setTimeout(() => window.scrollTo({ top: scrollY, behavior: "instant" }), 100);
      }
    } catch (e) {
      console.error(e);
    }
  }, [postId, incrementViews]);

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

  const author = getAuthor(post.authorId);
  const isLiked = currentUser && post.likes?.includes(currentUser.id);
  const isBookmarked = currentUser && post.bookmarks?.includes(currentUser.id);
  const isFollowingAuthor = currentUser?.following?.includes(author.id);
  const canModifyPost = currentUser && currentUser.id === post.authorId;

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

  // Xử lý Xóa bài viết
  const handleDeletePost = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
      deletePost(post.id);
      onNavigate("home");
    }
  };

  // Xử lý Chia sẻ liên kết
  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    addToast("Đã sao chép liên kết bài viết vào bộ nhớ tạm! 📋", "info");
  };

  const formattedDate = new Date(post.createdAt).toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Nút quay lại & Hành động tác giả */}
      <div className="flex items-center justify-between gap-4 mb-6">
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

      {/* Bo cuc chuan: noi dung bai viet o cot trai, MUC LUC nam ngoai the bai viet */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        {/* Cot trai: the bai viet + bai lien quan + binh luan */}
        <div className="min-w-0 order-2 lg:order-1">
          {/* Bài viết chính */}
          <article className="bg-base-100 rounded-2xl border border-base-300 p-6 sm:p-10 shadow-sm">
        {/* Category & Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="badge badge-primary font-bold text-xs">{post.category}</span>
          {post.tags?.map((tag) => (
            <span
              key={tag}
              className="badge badge-sm border border-base-300 bg-base-200/60 text-base-content/80 text-xs font-medium hover:border-primary/50 transition-colors"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Tiêu đề */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-base-content !my-3 leading-snug">
          {post.title}
        </h1>

        {/* Thông tin tác giả & Ngày đăng */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 my-4 border-y border-base-200">
          <div className="flex items-center gap-3">
            <img
              src={author.avatar}
              alt={author.name}
              className="w-12 h-12 rounded-full border border-base-300 object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base-content text-sm sm:text-base">
                  {author.name}
                </span>
                {currentUser?.id !== author.id && (
                  <button
                    onClick={handleFollow}
                    className={`btn btn-xs rounded-full ${
                      isFollowingAuthor
                        ? "btn-soft"
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

          {/* Thanh tương tác nhanh: Like, Bookmark, Chia sẻ */}
          <div className="flex items-center gap-2">
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
              <span>{post.likes?.length || 0}</span>
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
              className="btn btn-sm btn-circle btn-outline btn-ghost"
              title="Sao chép liên kết chia sẻ"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Noi dung bai viet (muc luc da tach ra ngoai the, xem cot phai) */}
        <div className="py-4">
          <MarkdownRenderer content={post.content} headingIdPrefix={"post-" + post.id + "-"} />
        </div>

        {/* Khung thông tin tác giả ở cuối bài */}
        <div className="mt-8 p-6 bg-base-200/50 rounded-2xl border border-base-200 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <img
            src={author.avatar}
            alt={author.name}
            className="w-16 h-16 rounded-full ring-2 ring-primary/20 object-cover"
          />
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-base text-base-content">{author.name}</h4>
                <p className="text-xs text-base-content/60">{author.bio}</p>
              </div>
              {currentUser?.id !== author.id && (
                <button
                  onClick={handleFollow}
                  className={`btn btn-xs rounded-full font-semibold px-4 self-center sm:self-start ${
                    isFollowingAuthor
                      ? "btn-soft"
                      : "btn-primary text-white"
                  }`}
                >
                  {isFollowingAuthor ? "✓ Đang theo dõi" : "+ Theo dõi tác giả"}
                </button>
              )}
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-base-content/60">
              <span>👥 {author.followers?.length || 0} người theo dõi</span>
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
                      e.target.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80";
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
                    <span>❤️ {item.likes?.length || 0}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Khu vực Bình luận */}
      <section className="mt-10 bg-base-100 rounded-2xl border border-base-300 p-6 sm:p-8 shadow-sm">
        <h3 className="text-xl font-bold text-base-content mb-6 flex items-center gap-2">
          <span>Thảo luận & Bình luận</span>
          <span className="badge badge-neutral">{post.comments?.length || 0}</span>
        </h3>

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

        {/* Danh sách bình luận */}
        <div className="space-y-4">
          {post.comments && post.comments.length > 0 ? (
            post.comments.map((comment) => {
              const canDeleteComment =
                currentUser && currentUser.id === comment.userId;

              return (
                <div
                  key={comment.id}
                  className="flex gap-3 p-4 rounded-xl bg-base-200/50 border border-base-200"
                >
                  <img
                    src={comment.userAvatar}
                    alt={comment.userName}
                    className="w-9 h-9 rounded-full bg-base-300 shrink-0 object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-base-content">
                        {comment.userName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-base-content/50">
                          {new Date(comment.createdAt).toLocaleDateString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit"
                          })}
                        </span>
                        {canDeleteComment && (
                          <button
                            onClick={() => deleteComment(post.id, comment.id)}
                            className="text-xs text-error hover:underline"
                            title="Xóa bình luận này"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-base-content/80 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
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

        {/* Cot phai: MUC LUC nam NGOAI the bai viet, dinh vi sticky theo trang */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-20 space-y-4">
          <TableOfContents content={post.content} headingIdPrefix={"post-" + post.id + "-"} />

          {post.tags?.length > 0 && (
            <div className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-base-content/60 mb-2">
                The tags
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
        </aside>
      </div>
    </div>
  );
}
