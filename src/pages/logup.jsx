import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ThemeToggle from "../components/ThemeToggle";

export default function Logup_page({ onNavigate }) {
  const { currentUser, register, loginDemo, loginWithGoogle, loginWithGithub } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const [errors, setErrors] = useState({});

  // Nếu người dùng đã đăng nhập -> Chặn truy cập trang đăng ký và tự động chuyển về trang chủ
  useEffect(() => {
    if (currentUser) {
      addToast(`Bạn đã có tài khoản và đang đăng nhập (${currentUser.name || currentUser.username})!`, "info");
      if (onNavigate) onNavigate("home");
    }
  }, [currentUser, onNavigate, addToast]);

  if (currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
        <div className="card bg-base-100 p-8 rounded-3xl shadow-xl text-center max-w-md w-full space-y-4 animate-fade-in border border-base-300">
          <div className="w-16 h-16 rounded-full bg-success/15 text-success mx-auto flex items-center justify-center text-3xl font-bold">
            ✓
          </div>
          <h2 className="text-xl font-black text-base-content">Bạn đã đăng nhập!</h2>
          <p className="text-sm text-base-content/70">
            Tài khoản hiện tại: <strong className="text-primary">{currentUser.name || currentUser.username}</strong>
          </p>
          <p className="text-xs text-base-content/50">
            Trang đăng ký chỉ dành cho khách chưa có tài khoản. Đang tự động chuyển hướng về trang chủ...
          </p>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate("home")}
            className="btn btn-primary btn-sm text-white font-bold rounded-xl w-full"
          >
            Quay lại trang chủ ngay
          </button>
        </div>
      </div>
    );
  }

  const validate = () => {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name.trim()) {
      errs.name = "Tên là bắt buộc";
    }

    if (!email.trim()) {
      errs.email = "Email là bắt buộc";
    } else if (!emailRegex.test(email.trim())) {
      errs.email = "Email không đúng định dạng";
    }

    if (!username.trim()) {
      errs.username = "Tên tài khoản là bắt buộc";
    } else if (username.trim().length < 3) {
      errs.username = "Tối thiểu 3 ký tự";
    }

    if (!password) {
      errs.password = "Mật khẩu là bắt buộc";
    } else if (password.length < 6) {
      errs.password = "Mật khẩu phải từ 6 ký tự";
    }

    if (!confirmPassword) {
      errs.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (confirmPassword !== password) {
      errs.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    if (!agreeTerms) {
      errs.agreeTerms = "Bạn cần đồng ý với Điều khoản dịch vụ để tiếp tục";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setAccountExists(false);
    try {
      const success = await register({ name, email, username, password });
      setIsSubmitting(false);
      if (success && onNavigate) {
        onNavigate("home");
      } else if (!success) {
        setAccountExists(true);
      }
    } catch {
      setIsSubmitting(false);
      setAccountExists(true);
    }
  };


  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-base-200/40">
      {/* Top Header bar căn chỉnh cùng độ rộng với card */}
      <div className="w-full max-w-lg flex items-center justify-between mb-3 px-1">
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

      {/* Khung Card Đăng ký trung tâm */}
      <div className="w-full max-w-lg bg-base-100 rounded-2xl shadow-xl border border-base-300 p-5 sm:p-8">
        {/* Tiêu đề & Giới thiệu theo phong cách Viblo */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-base-content">
            Đăng ký tài khoản cho IT Blog
          </h1>
          <p className="text-xs text-base-content/70 mt-2 leading-relaxed">
            Chào mừng bạn đến <span className="font-semibold text-base-content">Nền tảng IT Blog</span>!
            Tham gia cùng chúng tôi để tìm kiếm thông tin hữu ích cần thiết để cải thiện kỹ năng IT của bạn.
            Vui lòng điền thông tin của bạn vào biểu mẫu bên dưới để tiếp tục.
          </p>
        </div>

        {/* Biểu mẫu đăng ký */}
        {accountExists && (
          <div className="mb-4 alert alert-error text-xs py-2.5 rounded-xl shadow-xs text-white">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Tài khoản hoặc email này đã tồn tại trong hệ thống. Vui lòng đăng nhập hoặc dùng email khác.</span>
          </div>
        )}
        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          {/* Hàng 1: Tên của bạn */}
          <div>
            <div className={`flex rounded-lg overflow-hidden border ${
              errors.name ? "border-error" : "border-base-300 focus-within:border-primary"
            } transition-all relative`}>
              <div className="bg-base-200 px-3.5 flex items-center justify-center text-base-content/60 border-r border-base-300 shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="Tên của bạn (Họ và tên)"
                className="w-full text-sm h-11 focus:outline-none px-3.5 bg-transparent text-base-content placeholder:text-base-content/40"
                disabled={isSubmitting}
              />
            </div>
            {errors.name && (
              <p className="text-error text-xs mt-1 font-medium">{errors.name}</p>
            )}
          </div>

          {/* Hàng 2: Địa chỉ email của bạn & Tên tài khoản (2 Cột) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className={`flex rounded-lg overflow-hidden border ${
                errors.email ? "border-error" : "border-base-300 focus-within:border-primary"
              } transition-all relative`}>
                <div className="bg-base-200 px-3.5 flex items-center justify-center text-base-content/60 border-r border-base-300 shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  placeholder="Địa chỉ email của bạn"
                  className="w-full text-sm h-11 focus:outline-none px-3.5 bg-transparent text-base-content placeholder:text-base-content/40"
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <p className="text-error text-xs mt-1 font-medium">{errors.email}</p>
              )}
            </div>

            <div>
              <div className={`flex rounded-lg overflow-hidden border ${
                errors.username ? "border-error" : "border-base-300 focus-within:border-primary"
              } transition-all relative`}>
                <div className="bg-base-200 px-3.5 flex items-center justify-center text-base-content/60 border-r border-base-300 shrink-0 font-bold text-xs">
                  @
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.replace(/\s+/g, "").toLowerCase());
                    if (errors.username) setErrors((prev) => ({ ...prev, username: "" }));
                  }}
                  placeholder="Tên tài khoản"
                  className="w-full text-sm h-11 focus:outline-none px-3.5 bg-transparent text-base-content placeholder:text-base-content/40"
                  disabled={isSubmitting}
                />
              </div>
              {errors.username && (
                <p className="text-error text-xs mt-1 font-medium">{errors.username}</p>
              )}
            </div>
          </div>

          {/* Hàng 3: Mật khẩu */}
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

          {/* Hàng 4: Xác nhận mật khẩu của bạn */}
          <div>
            <div className={`flex rounded-lg overflow-hidden border ${
              errors.confirmPassword ? "border-error" : "border-base-300 focus-within:border-primary"
            } transition-all relative`}>
              <div className="bg-base-200 px-3.5 flex items-center justify-center text-base-content/60 border-r border-base-300 shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                placeholder="Xác nhận mật khẩu của bạn"
                className="w-full text-sm h-11 focus:outline-none px-3.5 pr-10 bg-transparent text-base-content placeholder:text-base-content/40"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-base-content/40 hover:text-base-content"
                title={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showConfirmPassword ? (
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
            {errors.confirmPassword && (
              <p className="text-error text-xs mt-1 font-medium">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Hàng 5: Chấp nhận điều khoản dịch vụ (Viblo Style) */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (errors.agreeTerms) setErrors((prev) => ({ ...prev, agreeTerms: "" }));
                }}
                className={`checkbox checkbox-sm checkbox-primary rounded mt-0.5 border border-base-300 ${
                  errors.agreeTerms ? "checkbox-error" : ""
                }`}
              />
              <span className="text-base-content/80 leading-snug">
                Tôi đồng ý{" "}
                <span className="text-primary hover:underline font-semibold cursor-pointer">
                  Điều khoản dịch vụ của IT Blog
                </span>
              </span>
            </label>
            {errors.agreeTerms && (
              <p className="text-error text-xs mt-1 font-medium">{errors.agreeTerms}</p>
            )}
          </div>

          {/* Nút Đăng ký */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full text-white font-bold text-sm h-11 rounded-lg shadow-sm hover:opacity-95 transition-all mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="loading loading-spinner loading-sm"></span>
                Đang khởi tạo tài khoản...
              </span>
            ) : (
              "Đăng ký"
            )}
          </button>
        </form>

        {/* Divider Đăng nhập với */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-base-300"></div>
          </div>
          <span className="relative px-4 bg-base-100 text-xs text-base-content/60 font-medium">
            Đăng nhập với
          </span>
        </div>

        {/* 2 Nút Đăng nhập Mạng xã hội: Google & GitHub */}
        <div className="grid grid-cols-2 gap-3">
          {/* Google - Chuyen huong truc tiep toi Google OAuth */}
          <button
            type="button"
            onClick={loginWithGoogle}
            className="btn btn-sm btn-outline border-base-300 hover:bg-base-200 normal-case text-xs font-semibold gap-2 px-3 h-10 rounded-xl transition-all shadow-xs hover:border-primary/50"
            title="Đăng nhập trực tiếp bằng tài khoản Google"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span className="font-bold">Google</span>
          </button>

          {/* Github - Chuyen huong truc tiep toi GitHub OAuth */}
          <button
            type="button"
            onClick={loginWithGithub}
            className="btn btn-sm btn-outline border-base-300 hover:bg-base-200 normal-case text-xs font-semibold gap-2 px-3 h-10 rounded-xl transition-all shadow-xs hover:border-primary/50"
            title="Đăng nhập trực tiếp bằng tài khoản GitHub"
          >
            <svg className="w-4 h-4 text-base-content shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="font-bold">GitHub</span>
          </button>
        </div>

        {/* Nút đăng nhập Demo 1-chạm */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => {
              loginDemo();
              if (onNavigate) onNavigate("home");
            }}
            className="btn btn-sm btn-ghost w-full border border-dashed border-primary/40 text-primary hover:bg-primary/10 text-xs font-bold rounded-lg"
          >
            ⚡ Đăng nhập dùng thử ngay (Tài khoản Demo)
          </button>
        </div>

        {/* Chuyển sang Đăng nhập */}
        <div className="text-center mt-6 text-xs text-base-content/70">
          Đã có tài khoản?{" "}
          <button
            onClick={() => onNavigate && onNavigate("login")}
            className="font-bold text-primary hover:underline ml-1"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    </div>
  );
}