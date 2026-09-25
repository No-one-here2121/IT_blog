import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { BrandIcon } from "./icons";

export default function AuthModal() {
  const { authModalOpen, modalMessage, closeAuthModal, login, loginDemo, register, loginWithGoogle, loginWithGithub } = useAuth();
  const [tab, setTab] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [prevAuthModalOpen, setPrevAuthModalOpen] = useState(authModalOpen);
  if (authModalOpen !== prevAuthModalOpen) {
    setPrevAuthModalOpen(authModalOpen);
    if (authModalOpen) {
      setTab("login");
      setShowPassword(false);
    }
  }

  if (!authModalOpen) return null;

  const handleTabSwitch = (newTab) => {
    setTab(newTab);
    setPassword("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (tab === "login") {
      if (!email.trim() || !password) return;
      login(email, password);
    } else {
      if (!name.trim() || !email.trim() || !password) return;
      register({ name, email, password });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) closeAuthModal(); }}
    >
      {/* Modal Dialog Box */}
      <div className="relative w-full max-w-md bg-base-100 rounded-2xl shadow-2xl border border-base-300 p-6 max-h-[90vh] overflow-y-auto">
        {/* Nút đóng Modal */}
        <button
          onClick={closeAuthModal}
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 text-base-content/70 hover:text-base-content"
          aria-label="Đóng"
        >
          ✕
        </button>

        {/* Thông báo lý do yêu cầu đăng nhập */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-base-content">
            {tab === "login" ? "Yêu cầu đăng nhập" : "Tạo tài khoản mới"}
          </h3>
          {modalMessage && (
            <p className="text-xs text-primary font-medium mt-1 bg-primary/10 py-1 px-3 rounded-full inline-block">
              {modalMessage}
            </p>
          )}
        </div>

                {/* Nút Đăng nhập mạng xã hội: Google & GitHub */}
        <div className="mb-3 space-y-1.5">
          <p className="text-[11px] font-bold text-base-content/60 flex items-center gap-1">
            <span>🌐</span>
            <span>Đăng nhập / Đăng ký trực tiếp qua:</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={loginWithGoogle}
              className="btn btn-xs btn-outline border-base-300 hover:bg-base-200 font-semibold py-1.5 h-auto flex items-center justify-center gap-1.5 cursor-pointer rounded-lg"
              title="Chuyển đến trang đăng nhập chính thức của Google"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span className="text-[11px] font-bold">Google</span>
            </button>
            <button
              type="button"
              onClick={loginWithGithub}
              className="btn btn-xs btn-outline border-base-300 hover:bg-base-200 font-semibold py-1.5 h-auto flex items-center justify-center gap-1.5 cursor-pointer rounded-lg"
              title="Chuyển đến trang đăng nhập chính thức của GitHub"
            >
              <BrandIcon name="github" size={15} colored={false} className="text-base-content" />
              <span className="text-[11px] font-bold">GitHub</span>
            </button>
          </div>
        </div>

        {/* Nút Đăng nhập Nhanh Demo theo từng vai trò */}
        <div className="space-y-1.5 mb-3">
          <p className="text-[11px] font-bold text-base-content/60 flex items-center gap-1">
            <span>⚡</span>
            <span>Đăng nhập trải nghiệm theo vai trò:</span>
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => loginDemo("admin")}
              className="btn btn-xs btn-outline btn-primary font-bold py-1.5 h-auto flex flex-col gap-0.5 cursor-pointer"
              title="Quản trị viên toàn quyền & Xuất Markdown"
            >
              <span className="text-xs">👑</span>
              <span className="text-[10px]">Admin</span>
            </button>
            <button
              type="button"
              onClick={() => loginDemo("moderator")}
              className="btn btn-xs btn-outline btn-secondary font-bold py-1.5 h-auto flex flex-col gap-0.5 cursor-pointer"
              title="Kiểm duyệt viên nội dung"
            >
              <span className="text-xs">🛡️</span>
              <span className="text-[10px]">Moderator</span>
            </button>
            <button
              type="button"
              onClick={() => loginDemo("user")}
              className="btn btn-xs btn-outline font-bold py-1.5 h-auto flex flex-col gap-0.5 cursor-pointer"
              title="Thành viên / Tác giả thông thường"
            >
              <span className="text-xs">👤</span>
              <span className="text-[10px]">Member</span>
            </button>
          </div>
        </div>

        <div className="divider text-xs text-base-content/40 my-2">HOẶC</div>

        {/* Tab Đăng nhập / Đăng ký */}
        <div className="tabs tabs-boxed mb-4 p-1 bg-base-200">
          <button
            onClick={() => handleTabSwitch("login")}
            className={`tab flex-1 font-medium transition-all ${tab === "login" ? "tab-active bg-primary text-white font-bold" : ""}`}
          >
            Đăng nhập
          </button>
          <button
            onClick={() => handleTabSwitch("register")}
            className={`tab flex-1 font-medium transition-all ${tab === "register" ? "tab-active bg-primary text-white font-bold" : ""}`}
          >
            Đăng ký mới
          </button>
        </div>

        {/* Form nhập */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === "register" && (
            <div>
              <div className="flex rounded-lg overflow-hidden border border-base-300 focus-within:border-primary transition-all">
                <div className="bg-base-200 px-3 flex items-center justify-center text-base-content/60 border-r border-base-300 shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Họ và tên của bạn"
                  className="w-full text-xs h-9 focus:outline-none px-3 bg-transparent text-base-content placeholder:text-base-content/40"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex rounded-lg overflow-hidden border border-base-300 focus-within:border-primary transition-all">
              <div className="bg-base-200 px-3 flex items-center justify-center text-base-content/60 border-r border-base-300 shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email của bạn"
                className="w-full text-xs h-9 focus:outline-none px-3 bg-transparent text-base-content placeholder:text-base-content/40"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex rounded-lg overflow-hidden border border-base-300 focus-within:border-primary transition-all relative">
              <div className="bg-base-200 px-3 flex items-center justify-center text-base-content/60 border-r border-base-300 shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                required
                minLength={tab === "register" ? 6 : undefined}
                className="w-full text-xs h-9 focus:outline-none px-3 pr-8 bg-transparent text-base-content placeholder:text-base-content/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-base-content/40 hover:text-base-content"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-sm w-full mt-4 font-bold text-white shadow-md">
            {tab === "login" ? "Đăng nhập ngay" : "Tạo tài khoản & Tiếp tục"}
          </button>
        </form>

        <p className="text-center text-[11px] text-base-content/50 mt-4">
          Hệ thống sẽ tự động hoàn thành hành động bạn vừa chọn sau khi đăng nhập.
        </p>
      </div>
    </div>
  );
}
