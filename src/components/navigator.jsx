import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";
import ThemeToggle from "./ThemeToggle";

export default function Navbar({ onNavigate, currentPage = "home" }) {
  const { currentUser, logout, requireAuth } = useAuth();
  const { searchQuery, setSearchQuery, pendingPosts } = useBlog();

  const handleCreatePost = () => {
    requireAuth(
      () => onNavigate && onNavigate("create_post"),
      "Vui lòng đăng nhập để đăng bài viết mới!"
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-base-100/90 backdrop-blur-md border-b border-base-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Logo & Navigation */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Mobile Navigation Dropdown (chỉ hiển thị khi màn hình < md) */}
          <div className="dropdown dropdown-bottom md:hidden">
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-sm btn-circle text-base-content/80 hover:text-base-content"
              aria-label="Menu điều hướng"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu menu-sm bg-base-100 rounded-2xl z-50 w-52 p-2 shadow-2xl border border-base-300 mt-2 space-y-1"
            >
              <li>
                <button
                  onClick={() => onNavigate && onNavigate("home")}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "home" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <span>🏠</span>
                  <span>Trang chủ</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate && onNavigate("moderation")}
                  className={`flex items-center justify-between py-2 font-semibold ${currentPage === "moderation" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span>📋</span>
                    <span>Duyệt bài</span>
                  </div>
                  {pendingPosts?.length > 0 && (
                    <span className="badge badge-xs bg-amber-400 text-amber-950 font-bold">{pendingPosts.length}</span>
                  )}
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleCreatePost()}
                  className={`flex items-center gap-2 py-2 font-semibold ${currentPage === "create_post" ? "active text-white bg-primary font-bold" : ""}`}
                >
                  <span>✍️</span>
                  <span>Viết bài mới</span>
                </button>
              </li>
            </ul>
          </div>

          <button
            onClick={() => onNavigate && onNavigate("home")}
            className="btn btn-ghost px-1.5 sm:px-2 normal-case flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl font-black tracking-tight"
          >
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary text-white flex items-center justify-center font-extrabold text-sm sm:text-base shadow-sm">
              IT
            </span>
            <span className="text-base-content">Blog</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onNavigate && onNavigate("home")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all ${
                currentPage === "home"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              Trang chủ
            </button>
            <button
              onClick={() => onNavigate && onNavigate("moderation")}
              className={`btn btn-sm text-xs font-semibold rounded-lg transition-all gap-1.5 ${
                currentPage === "moderation"
                  ? "bg-primary/10 text-primary font-bold shadow-2xs"
                  : "btn-ghost text-base-content/80 hover:text-base-content"
              }`}
            >
              <span>Duyệt bài</span>
              {pendingPosts?.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-extrabold text-amber-950 bg-amber-400 rounded-full shadow-xs leading-none shrink-0">
                  {pendingPosts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="flex-1 max-w-lg hidden sm:block">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài viết, công nghệ, tác giả..."
              className="input input-sm input-bordered w-full pl-9 pr-8 bg-base-200/50 focus:bg-base-100 transition-all rounded-full"
            />
            <svg
              className="w-4 h-4 text-base-content/50 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-base-content/40 hover:text-base-content"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          {/* Nút Viết bài mới */}
          <button
            onClick={handleCreatePost}
            className="btn btn-sm btn-primary text-white rounded-lg flex items-center gap-1.5 shadow-sm font-semibold px-2 sm:px-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Viết bài</span>
          </button>

          {/* Theme Toggle Sáng / Tối */}
          <ThemeToggle />

          {/* Phân biệt Guest vs Authenticated User */}
          {currentUser ? (
            /* Đã đăng nhập: Avatar & Dropdown menu */
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-circle avatar ring-1 ring-base-300 ring-offset-2 ring-offset-base-100"
              >
                <div className="w-8 sm:w-9 rounded-full">
                  <img src={currentUser.avatar} alt={currentUser.name} />
                </div>
              </div>
              <ul
                tabIndex={-1}
                className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-56 p-2 shadow-xl border border-base-300"
              >
                {/* Thông tin user tóm tắt */}
                <li className="menu-title px-3 py-2 border-b border-base-200">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm text-base-content truncate">
                      {currentUser.name}
                    </span>
                    <span className="text-[11px] text-base-content/60 truncate font-normal">
                      {currentUser.email}
                    </span>
                  </div>
                </li>

                <li>
                  <button
                    onClick={() => onNavigate && onNavigate("profile")}
                    className="flex items-center gap-2 py-2"
                  >
                    <svg className="w-4 h-4 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Trang cá nhân</span>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => {
                      if (onNavigate) onNavigate("profile");
                    }}
                    className="flex items-center gap-2 py-2"
                  >
                    <svg className="w-4 h-4 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span>Bài viết đã lưu</span>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => onNavigate && onNavigate("moderation")}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-base-content/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span>Duyệt bài viết</span>
                    </div>
                    {pendingPosts?.length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-extrabold text-amber-950 bg-amber-400 rounded-full shadow-xs leading-none shrink-0">
                        {pendingPosts.length}
                      </span>
                    )}
                  </button>
                </li>

                <div className="divider my-1"></div>

                <li>
                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-2 py-2 text-error hover:bg-error/10 font-semibold"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Đăng xuất</span>
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            /* Chưa đăng nhập: Nút Đăng nhập & Đăng ký */
            <div className="flex items-center gap-1">
              <button
                onClick={() => onNavigate && onNavigate("login")}
                className="btn btn-sm btn-ghost font-semibold text-base-content text-xs sm:text-sm px-2 sm:px-3"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => onNavigate && onNavigate("logup")}
                className="btn btn-sm btn-outline btn-primary font-semibold hidden sm:inline-flex text-xs sm:text-sm"
              >
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}