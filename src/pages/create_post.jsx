import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";
import { CATEGORIES } from "../data/seedData";
import MarkdownRenderer from "../components/MarkdownRenderer";

export default function CreatePostPage({ editPostData, onNavigate, onPostCreated }) {
  const { currentUser } = useAuth();
  const { createPost, updatePost } = useBlog();

  const isEditing = !!editPostData;

  const [activeTab, setActiveTab] = useState("editor"); // 'editor' | 'preview'
  const [title, setTitle] = useState(editPostData?.title || "");
  const [category, setCategory] = useState(editPostData?.category || "Frontend");
  const [tagsString, setTagsString] = useState(editPostData?.tags ? editPostData.tags.join(", ") : "");
  const [coverImage, setCoverImage] = useState(editPostData?.coverImage || "");
  const [excerpt, setExcerpt] = useState(editPostData?.excerpt || "");
  const [content, setContent] = useState(editPostData?.content || "");

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-base-100 rounded-3xl border border-base-300 shadow-lg text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl">
          ✍️
        </div>
        <h2 className="text-2xl font-black text-base-content">Đăng nhập để tạo bài viết</h2>
        <p className="text-sm text-base-content/70">
          Bạn cần có tài khoản để đăng tải bài viết chia sẻ kiến thức trên IT Blog.
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

  const handleSubmit = (submitStatus = "approved") => {
    if (!title.trim() || !content.trim()) return;

    // Chuẩn hóa tags
    const tags = tagsString
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const postData = {
      title: title.trim(),
      category,
      tags: tags.length > 0 ? tags : ["IT"],
      coverImage: coverImage.trim() || undefined,
      excerpt: excerpt.trim() || title.trim(),
      content: content.trim(),
      status: submitStatus
    };

    if (isEditing) {
      updatePost(editPostData.id, postData);
      if (onPostCreated) onPostCreated(editPostData.id);
      onNavigate("post_detail");
    } else {
      const newPost = createPost(postData);
      if (submitStatus === "pending") {
        onNavigate("moderation");
      } else if (newPost && onPostCreated) {
        onPostCreated(newPost.id);
        onNavigate("post_detail");
      } else {
        onNavigate("home");
      }
    }
  };

  const parsedTags = tagsString
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onNavigate("home")}
            className="btn btn-sm btn-ghost gap-1 text-xs"
          >
            ← Về trang chủ
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-base-content !my-0">
            {isEditing ? "Chỉnh sửa bài viết" : "Tạo & Quản lý bài viết"}
          </h1>
        </div>

        {/* Tab chuyển đổi Soạn thảo / Xem trước */}
        <div className="tabs tabs-boxed p-1 bg-base-200">
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`tab tab-sm font-semibold transition-all ${
              activeTab === "editor" ? "tab-active bg-primary text-white font-bold" : ""
            }`}
          >
            ✏️ Soạn thảo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`tab tab-sm font-semibold transition-all ${
              activeTab === "preview" ? "tab-active bg-primary text-white font-bold" : ""
            }`}
          >
            👁️ Xem trước
          </button>
        </div>
      </div>

      {activeTab === "editor" ? (
        /* Tab 1: Form Soạn thảo */
        <div className="bg-base-100 rounded-3xl border border-base-300 p-6 sm:p-10 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit("approved");
            }}
            className="space-y-5"
          >
            {/* Tiêu đề */}
            <div>
              <label className="label font-bold text-xs text-base-content/80 pb-1">
                Tiêu đề bài viết <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Tối ưu hiệu năng React 19 với Compiler mới"
                className="input input-bordered w-full text-base font-bold focus:input-primary"
                required
              />
            </div>

            {/* Hàng 2 cột: Chuyên mục & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Chuyên mục <span className="text-error">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="select select-bordered w-full text-sm font-semibold focus:select-primary"
                >
                  {CATEGORIES.filter((c) => c !== "Tất cả").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Thẻ tags (cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={tagsString}
                  onChange={(e) => setTagsString(e.target.value)}
                  placeholder="React, Frontend, Web..."
                  className="input input-bordered w-full text-sm focus:input-primary"
                />
              </div>
            </div>

            {/* URL Ảnh bìa */}
            <div>
              <label className="label font-bold text-xs text-base-content/80 pb-1">
                URL Ảnh bìa (Tùy chọn)
              </label>
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://images.unsplash.com/... (để trống sẽ dùng ảnh mặc định theo danh mục)"
                className="input input-bordered w-full text-xs focus:input-primary"
              />
            </div>

            {/* Tóm tắt */}
            <div>
              <label className="label font-bold text-xs text-base-content/80 pb-1">
                Tóm tắt ngắn (Excerpt)
              </label>
              <input
                type="text"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="1 - 2 câu tóm tắt nội dung chính để hiển thị trên thẻ bài viết..."
                className="input input-bordered w-full text-sm focus:input-primary"
              />
            </div>

            {/* Nội dung chi tiết */}
            <div>
              <div className="flex items-center justify-between pb-1">
                <label className="label font-bold text-xs text-base-content/80 p-0">
                  Nội dung bài viết <span className="text-error">*</span>
                </label>
                <span className="text-[11px] text-base-content/50">Hỗ trợ Markdown cơ bản</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Soạn thảo nội dung bài viết... Bạn có thể dùng Markdown, tiêu đề ###, danh sách gạch đầu dòng, code block..."
                rows={12}
                className="textarea textarea-bordered w-full text-sm font-mono focus:textarea-primary leading-relaxed"
                required
              />
            </div>

            {/* Hàng nút hành động: Hủy, Xem trước, Gửi duyệt, Xuất bản ngay */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-base-200">
              <button
                type="button"
                onClick={() => onNavigate("home")}
                className="btn btn-sm btn-ghost text-xs"
              >
                Hủy bỏ
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className="btn btn-sm btn-outline gap-1 text-xs"
                >
                  👁️ Xem trước
                </button>

                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => handleSubmit("pending")}
                    className="btn btn-sm border border-amber-400/80 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 gap-1 text-xs font-bold transition-colors"
                  >
                    ⏳ Gửi chờ duyệt
                  </button>
                )}

                <button
                  type="submit"
                  className="btn btn-sm btn-primary text-white font-bold px-5 shadow-md hover:scale-105 active:scale-95 transition-all text-xs"
                >
                  {isEditing ? "Lưu thay đổi" : "✓ Xuất bản ngay"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* Tab 2: Chế độ Xem trước (Live Preview) */
        <div className="bg-base-100 rounded-3xl border border-base-300 p-6 sm:p-10 shadow-sm space-y-6 animate-fade-in">
          <div className="p-3 bg-primary/10 rounded-xl flex items-center justify-between text-xs text-primary font-medium">
            <span>👁️ Bạn đang ở chế độ Xem trước bài viết</span>
            <button
              onClick={() => setActiveTab("editor")}
              className="btn btn-xs btn-primary text-white font-bold"
            >
              Quay lại chỉnh sửa
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="badge badge-primary font-bold text-xs">{category}</span>
            {parsedTags.map((t) => (
              <span
                key={t}
                className="badge badge-sm border border-base-300 bg-base-200/60 text-base-content/80 text-xs font-medium"
              >
                #{t}
              </span>
            ))}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-base-content !my-2">
            {title || "Tiêu đề bài viết sẽ hiển thị ở đây"}
          </h1>

          <div className="flex items-center gap-3 py-3 border-y border-base-200 text-xs text-base-content/60">
            <img
              src={currentUser?.avatar}
              alt={currentUser?.name}
              className="w-8 h-8 rounded-full border border-base-300"
            />
            <div>
              <span className="font-bold text-base-content">{currentUser?.name}</span>
              <p className="text-[11px]">Vừa xong • 4 phút đọc</p>
            </div>
          </div>

          {excerpt && (
            <p className="text-sm italic text-base-content/70 border-l-4 border-primary pl-4 py-1 bg-base-200/40 rounded-r-lg">
              {excerpt}
            </p>
          )}

          <div className="py-2">
            {content ? (
              <MarkdownRenderer content={content} />
            ) : (
              <p className="text-sm italic text-base-content/50">
                Nội dung bài viết sẽ hiển thị tại đây khi bạn soạn thảo...
              </p>
            )}
          </div>

          <div className="pt-6 border-t border-base-200 flex justify-end gap-3">
            <button
              onClick={() => setActiveTab("editor")}
              className="btn btn-sm btn-outline text-xs"
            >
              ← Quay lại soạn thảo
            </button>
            <button
              onClick={() => handleSubmit("approved")}
              className="btn btn-sm btn-primary text-white font-bold text-xs"
            >
              ✓ Xác nhận xuất bản
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
