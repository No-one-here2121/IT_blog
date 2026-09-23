import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ThemeToggle from "../components/ThemeToggle";
import { api } from "../services/api";

export default function Login_page({ onNavigate }) {
  const { login, loginDemo } = useAuth();
  const { addToast } = useToast();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot / Reset Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: Token & New Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isProcessingReset, setIsProcessingReset] = useState(false);

  // Validate errors
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!identifier.trim()) {
      errs.identifier = "Tên người dùng hoặc email là bắt buộc";
    }

    if (!password) {
      errs.password = "Mật khẩu là bắt buộc";
    } else if (password.length < 6) {
      errs.password = "Mật khẩu phải từ 6 ký tự";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const success = await login(identifier, password);
      setIsSubmitting(false);
      if (success && onNavigate) {
        onNavigate("home");
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleSocialClick = () => {
    loginDemo();
    if (onNavigate) onNavigate("home");
  };

  const handleOpenForgotModal = () => {
    setForgotStep(1);
    setForgotEmail(identifier.includes("@") ? identifier : "");
    setResetToken("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowForgotModal(true);
  };

  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      addToast("Vui lòng nhập địa chỉ email hợp lệ!", "warning");
      return;
    }

    setIsProcessingReset(true);
    try {
      const res = await api.auth.forgotPassword(forgotEmail.trim());
      addToast(res.message || "Đã tạo mã xác nhận khôi phục mật khẩu.", "info");
      if (res?.reset_token) {
        setResetToken(res.reset_token);
      }
      setForgotStep(2);
    } catch (err) {
      addToast(`Lỗi: ${err.message}`, "error");
    } finally {
      setIsProcessingReset(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetToken.trim()) {
      addToast("Vui lòng nhập mã Token xác nhận!", "warning");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      addToast("Mật khẩu mới phải từ 6 ký tự trở lên!", "warning");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      addToast("Mật khẩu xác nhận không khớp!", "warning");
      return;
    }

    setIsProcessingReset(true);
    try {
      await api.auth.resetPassword(resetToken.trim(), newPassword);
      addToast("Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay. 🎉", "success");
      setPassword(newPassword);
      if (forgotEmail) setIdentifier(forgotEmail);
      setShowForgotModal(false);
    } catch (err) {
      addToast(`Không thể đặt lại mật khẩu: ${err.message}`, "error");
    } finally {
      setIsProcessingReset(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-base-200/40">
      {/* Top Header bar căn chỉnh theo chiều rộng max-w-md của card */}
      <div className="w-full max-w-md flex items-center justify-between mb-3 px-1">
        <button
          onClick={() => onNavigate && onNavigate("home")}
          className="btn btn-sm btn-ghost text-xs font-semibold gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Trang chủ
        </button>
        <ThemeToggle />
      </div>

      {/* Brand Logo phía trên thẻ */}
      <div className="mb-4 text-center">
        <button
          onClick={() => onNavigate && onNavigate("home")}
          className="inline-flex items-center gap-2 group cursor-pointer"
        >
          <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
            IT
          </span>
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-primary">
            IT<span className="text-base-content">BLOG</span>
          </span>
        </button>
      </div>

      {/* Card Đăng nhập trung tâm */}
      <div className="w-full max-w-md bg-base-100 rounded-2xl shadow-xl border border-base-300 p-5 sm:p-8">
        {/* Tiêu đề */}
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-base-content">
            Đăng nhập vào IT Blog
          </h1>
        </div>

        {/* Biểu mẫu đăng nhập */}
        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          {/* Ô nhập 1: Tên người dùng hoặc email */}
          <div>
            <div className={`flex rounded-lg overflow-hidden border ${
              errors.identifier ? "border-error" : "border-base-300 focus-within:border-primary"
            } transition-all`}>
              <div className="bg-base-200 px-3.5 flex items-center justify-center text-base-content/60 border-r border-base-300 shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: "" }));
                }}
                placeholder="Tên người dùng hoặc email"
                className="w-full text-sm h-11 focus:outline-none px-3.5 bg-transparent text-base-content placeholder:text-base-content/40"
                disabled={isSubmitting}
              />
            </div>
            {errors.identifier && (
              <p className="text-error text-xs mt-1 font-medium">{errors.identifier}</p>
            )}
          </div>

          {/* Ô nhập 2: Mật khẩu */}
          <div>
            <div className={`flex rounded-lg overflow-hidden border ${
              errors.password ? "border-error" : "border-base-300 focus-within:border-primary"
            } transition-all relative`}>
              <div className="bg-base-200 px-3.5 flex items-center justify-center text-base-content/60 border-r border-base-300 shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="Mật khẩu"
                className="w-full text-sm h-11 focus:outline-none px-3.5 pr-10 bg-transparent text-base-content placeholder:text-base-content/40"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-base-content/40 hover:text-base-content"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-error text-xs mt-1 font-medium">{errors.password}</p>
            )}
          </div>

          {/* Nút Đăng nhập xanh dương chuẩn Viblo */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full text-white font-bold text-sm h-11 rounded-lg shadow-sm hover:opacity-95 transition-all mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="loading loading-spinner loading-sm"></span>
                Đang xác thực...
              </span>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>

        {/* Hàng liên kết: Quên mật khẩu? (trái) - Tạo tài khoản (phải) */}
        <div className="flex items-center justify-between mt-3 text-xs">
          <button
            type="button"
            onClick={handleOpenForgotModal}
            className="text-primary hover:underline font-medium"
          >
            Quên mật khẩu?
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate("logup")}
            className="text-primary hover:underline font-medium"
          >
            Tạo tài khoản
          </button>
        </div>

        {/* Divider Đăng nhập bằng */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-base-300"></div>
          </div>
          <span className="relative px-4 bg-base-100 text-xs text-base-content/60 font-medium">
            Đăng nhập bằng
          </span>
        </div>

        {/* 3 Nút Đăng nhập Mạng xã hội với icon hài hòa (Facebook, Google, Github) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Facebook */}
          <button
            type="button"
            onClick={() => handleSocialClick("facebook")}
            className="btn btn-sm btn-outline border-base-300 hover:bg-[#1877F2]/10 hover:border-[#1877F2] hover:text-[#1877F2] normal-case text-[11px] sm:text-xs font-semibold gap-1 px-1 sm:px-3 h-10 rounded-lg transition-colors min-w-0"
          >
            <svg className="w-4 h-4 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span className="truncate">Facebook</span>
          </button>

          {/* Google */}
          <button
            type="button"
            onClick={() => handleSocialClick("google")}
            className="btn btn-sm btn-outline border-base-300 hover:bg-base-200 normal-case text-[11px] sm:text-xs font-semibold gap-1 px-1 sm:px-3 h-10 rounded-lg transition-colors min-w-0"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span className="truncate">Google</span>
          </button>

          {/* Github */}
          <button
            type="button"
            onClick={() => handleSocialClick("github")}
            className="btn btn-sm btn-outline border-base-300 hover:bg-base-200 normal-case text-[11px] sm:text-xs font-semibold gap-1 px-1 sm:px-3 h-10 rounded-lg transition-colors min-w-0"
          >
            <svg className="w-4 h-4 text-base-content shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="truncate">Github</span>
          </button>
        </div>

        {/* Lựa chọn Đăng nhập Demo theo từng vai trò cụ thể */}
        <div className="mt-4 pt-3.5 border-t border-base-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-base-content/60">
            <span className="flex items-center gap-1.5 text-primary">
              <span>⚡</span>
              <span>DÙNG THỬ NHANH THEO VAI TRÒ (DEMO ROLES):</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Vai trò 1: Admin */}
            <button
              type="button"
              onClick={async () => {
                await loginDemo("admin");
                if (onNavigate) onNavigate("home");
              }}
              className="btn btn-sm btn-outline btn-primary flex flex-col items-center justify-center h-auto py-2.5 px-2 rounded-xl text-left border-primary/40 hover:border-primary transition-all group shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-1 font-black text-xs text-primary group-hover:text-white">
                <span>👑</span>
                <span>Admin</span>
              </div>
              <span className="text-[10px] text-base-content/60 group-hover:text-white/80 font-normal leading-tight text-center mt-0.5">
                Toàn quyền & Xuất .md
              </span>
            </button>

            {/* Vai trò 2: Moderator */}
            <button
              type="button"
              onClick={async () => {
                await loginDemo("moderator");
                if (onNavigate) onNavigate("home");
              }}
              className="btn btn-sm btn-outline btn-secondary flex flex-col items-center justify-center h-auto py-2.5 px-2 rounded-xl text-left border-secondary/40 hover:border-secondary transition-all group shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-1 font-black text-xs text-secondary group-hover:text-white">
                <span>🛡️</span>
                <span>Moderator</span>
              </div>
              <span className="text-[10px] text-base-content/60 group-hover:text-white/80 font-normal leading-tight text-center mt-0.5">
                Kiểm duyệt bài viết
              </span>
            </button>

            {/* Vai trò 3: User */}
            <button
              type="button"
              onClick={async () => {
                await loginDemo("user");
                if (onNavigate) onNavigate("home");
              }}
              className="btn btn-sm btn-outline btn-neutral flex flex-col items-center justify-center h-auto py-2.5 px-2 rounded-xl text-left border-base-300 hover:border-base-content/40 transition-all group shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-1 font-black text-xs text-base-content group-hover:text-white">
                <span>👤</span>
                <span>Thành viên</span>
              </div>
              <span className="text-[10px] text-base-content/60 group-hover:text-white/80 font-normal leading-tight text-center mt-0.5">
                Độc giả & Viết bài
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Quên mật khẩu & Đặt lại mật khẩu */}
      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForgotModal(false); }}
        >
          <div className="relative w-full max-w-md bg-base-100 rounded-3xl shadow-2xl border border-base-300 p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-base-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔐</span>
                <h3 className="font-bold text-base text-base-content">
                  {forgotStep === 1 ? "Khôi phục mật khẩu" : "Đặt lại mật khẩu mới"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="btn btn-xs btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <p className="text-xs text-base-content/70">
                  Nhập địa chỉ email đăng ký tài khoản của bạn. Hệ thống sẽ tạo mã xác nhận để bạn đặt lại mật khẩu mới.
                </p>
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Địa chỉ email:
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="dev@itblog.vn"
                    className="input input-bordered input-sm w-full text-xs focus:input-primary"
                    required
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(2)}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Đã có mã xác nhận? Bấm vào đây
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingReset}
                    className="btn btn-sm btn-primary text-white font-bold text-xs rounded-xl"
                  >
                    {isProcessingReset ? <span className="loading loading-spinner loading-xs"></span> : "Gửi mã xác nhận"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                <p className="text-xs text-base-content/70">
                  Nhập mã Token xác nhận và mật khẩu mới để hoàn tất việc đổi mật khẩu.
                </p>
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Mã xác nhận (Reset Token):
                  </label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Dán mã Token vào đây..."
                    className="input input-bordered input-sm w-full font-mono text-xs focus:input-primary"
                    required
                  />
                </div>

                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Mật khẩu mới:
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                    className="input input-bordered input-sm w-full text-xs focus:input-primary"
                    required
                  />
                </div>

                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Xác nhận mật khẩu mới:
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="input input-bordered input-sm w-full text-xs focus:input-primary"
                    required
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="btn btn-sm btn-ghost text-xs"
                  >
                    ← Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingReset}
                    className="btn btn-sm btn-primary text-white font-bold text-xs rounded-xl"
                  >
                    {isProcessingReset ? <span className="loading loading-spinner loading-xs"></span> : "Đặt lại mật khẩu"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}