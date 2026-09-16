import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";
import PostCard from "../components/PostCard";

export default function ProfilePage({ onNavigate, onSelectPost, onEditPost }) {
  const { currentUser, updateProfile, users, toggleFollow } = useAuth();
  const { posts, deletePost } = useBlog();

  const [activeTab, setActiveTab] = useState("my_posts"); // 'my_posts' | 'bookmarks' | 'following'
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Form edit profile state
  const [name, setName] = useState(currentUser?.name || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [avatar, setAvatar] = useState(currentUser?.avatar || "");

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

  // Lọc bài viết user đã lưu (bookmark)
  const bookmarkedPosts = posts.filter((p) => p.bookmarks?.includes(currentUser.id));

  // Danh sách tác giả đang theo dõi
  const followingAuthors = users.filter((u) => currentUser.following?.includes(u.id));

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
              <div className="flex items-center justify-center sm:justify-start gap-4 pt-2 text-xs font-semibold text-base-content/70">
                <span>
                  <strong className="text-primary font-bold">{myPosts.length}</strong> bài viết
                </span>
                <span>•</span>
                <span>
                  <strong className="text-secondary font-bold">{bookmarkedPosts.length}</strong> đã lưu
                </span>
                <span>•</span>
                <span>
                  <strong className="text-accent font-bold">{currentUser.following?.length || 0}</strong> đang theo dõi
                </span>
              </div>
            </div>
          </div>

          {/* Nút Chỉnh sửa profile */}
          <div>
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
                <label className="label text-xs font-semibold">Tên hiển thị</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-sm input-bordered w-full"
                  required
                />
              </div>
              <div>
                <label className="label text-xs font-semibold">URL Avatar</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="input input-sm input-bordered w-full"
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

      {/* Tabs điều hướng nội dung */}
      <div className="tabs tabs-boxed p-1 bg-base-200 mb-6 max-w-md">
        <button
          onClick={() => setActiveTab("my_posts")}
          className={`tab flex-1 text-xs sm:text-sm font-medium ${
            activeTab === "my_posts" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          Bài viết của tôi ({myPosts.length})
        </button>
        <button
          onClick={() => setActiveTab("bookmarks")}
          className={`tab flex-1 text-xs sm:text-sm font-medium ${
            activeTab === "bookmarks" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          Đã lưu ({bookmarkedPosts.length})
        </button>
        <button
          onClick={() => setActiveTab("following")}
          className={`tab flex-1 text-xs sm:text-sm font-medium ${
            activeTab === "following" ? "tab-active bg-primary text-white font-bold" : ""
          }`}
        >
          Đang theo dõi ({followingAuthors.length})
        </button>
      </div>

      {/* Tab 1: Bài viết của tôi */}
      {activeTab === "my_posts" && (
        <div>
          {myPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onNavigate={onNavigate}
                  onSelectPost={onSelectPost}
                  onEdit={(p) => {
                    if (onEditPost) onEditPost(p);
                    onNavigate("edit_post");
                  }}
                  onDelete={(id) => handleDeletePost(id)}
                />
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
        <div>
          {bookmarkedPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarkedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onNavigate={onNavigate}
                  onSelectPost={onSelectPost}
                />
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
    </div>
  );
}
