import { useState } from "react";
import { useBlog } from "../context/BlogContext";
import { useAuth } from "../context/AuthContext";
import MarkdownRenderer from "../components/MarkdownRenderer";

export default function ModerationPage({ onNavigate, onSelectPost }) {
  const { pendingPosts, approvedPosts, rejectedPosts, approvePost, rejectPost, deletePost, getAuthor } = useBlog();
  const { currentUser } = useAuth();
  const canModerate = ["admin", "manager"].includes(currentUser?.role);

  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'approved' | 'rejected'
  const [previewPost, setPreviewPost] = useState(null);

  const currentList =
    activeTab === "pending"
      ? pendingPosts
      : activeTab === "approved"
      ? approvedPosts
      : rejectedPosts;

  const handleApprove = (id) => {
    approvePost(id);
    if (previewPost?.id === id) setPreviewPost(null);
  };

  const handleReject = (id) => {
    rejectPost(id);
    if (previewPost?.id === id) setPreviewPost(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
      deletePost(id);
      if (previewPost?.id === id) setPreviewPost(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
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
            Duyệt & Quản lý bài viết
          </h1>
          <p className="text-xs sm:text-sm text-base-content/60 mt-1">
            Xem xét, phê duyệt hoặc từ chối các bài viết được gửi lên cộng đồng IT Blog.
          </p>
        </div>

        <button
          onClick={() => onNavigate("create_post")}
          className="btn btn-sm btn-primary text-white font-bold gap-1.5 shadow-sm"
        >
          <span>+</span> Viết bài mới
        </button>
      </div>

      {/* Tabs chuyển đổi trạng thái */}
      <div className="tabs tabs-boxed p-1 bg-base-200 mb-6 max-w-lg">
        <button
          type="button"
          onClick={() => setActiveTab("pending")}
          className={`tab flex-1 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "pending" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          <span>Chờ duyệt</span>
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-extrabold text-amber-950 bg-amber-400 rounded-full leading-none ml-1.5 shrink-0">
            {pendingPosts.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("approved")}
          className={`tab flex-1 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "approved" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          <span>Đã xuất bản</span>
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold text-base-content/70 bg-base-300 rounded-full leading-none ml-1.5 shrink-0">
            {approvedPosts.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rejected")}
          className={`tab flex-1 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "rejected" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          <span>Bị từ chối</span>
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold text-base-content/70 bg-base-300 rounded-full leading-none ml-1.5 shrink-0">
            {rejectedPosts.length}
          </span>
        </button>
      </div>

      {/* Danh sách bài viết */}
      {currentList.length > 0 ? (
        <div className="space-y-4 animate-fade-in">
          {currentList.map((post) => {
            const author = getAuthor(post.authorId);
            const isMine = currentUser && currentUser.id === post.authorId;

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
                      {new Date(post.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                      })}
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
                      className="w-5 h-5 rounded-full border border-base-300"
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

                  {(canModerate || isMine) && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="btn btn-xs btn-ghost text-error/80 hover:text-error hover:bg-error/10 p-1"
                      title="Xóa bài viết"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
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
              <h2 className="text-xl font-black text-base-content">
                {previewPost.title}
              </h2>

              <div className="flex items-center gap-2.5 text-xs text-base-content/60 pb-3 border-b border-base-200">
                <img
                  src={getAuthor(previewPost.authorId).avatar}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full border border-base-300 object-cover"
                />
                <span>Tác giả: <strong>{getAuthor(previewPost.authorId).name}</strong></span>
              </div>

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
            <div className="p-4 bg-base-200/40 border-t border-base-200 flex items-center justify-between">
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
