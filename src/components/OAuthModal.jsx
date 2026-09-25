import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export default function OAuthModal({ isOpen, onClose, provider = "google", onSuccess }) {
  const { loginOAuth, setAuthenticatedSession } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [providerConfig, setProviderConfig] = useState(null);

  const [prevOpenState, setPrevOpenState] = useState({ isOpen, provider });
  if (isOpen !== prevOpenState.isOpen || provider !== prevOpenState.provider) {
    setPrevOpenState({ isOpen, provider });
    if (isOpen) {
      if (provider === "google") {
        setEmail("user.google@gmail.com");
        setName("Google Member");
      } else if (provider === "github") {
        setEmail("developer@github.com");
        setName("GitHub Octocat");
      } 
      setLoading(false);
    }
  }

  // Lay authorize url tu backend
  useEffect(() => {
    if (isOpen) {
      api.auth.getOAuthAuthorizeUrl(provider)
        .then((res) => {
          if (res) setProviderConfig(res);
        })
        .catch(() => {});
    }
  }, [isOpen, provider]);

  if (!isOpen) return null;

  const providerMeta = {
    google: {
      name: "Google",
      color: "bg-white text-gray-800 border-gray-300 hover:bg-gray-50",
      accent: "text-red-500",
      badgeColor: "bg-red-50 text-red-700 border-red-200",
      icon: (
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>
      ),
      note: "Xác thực tài khoản Google Account bảo mật qua OAuth 2.0"
    },
    github: {
      name: "GitHub",
      color: "bg-[#24292F] text-white border-transparent hover:bg-[#1b1f23]",
      accent: "text-gray-900 dark:text-white",
      badgeColor: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200",
      icon: (
        <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
      ),
      note: "Xác thực danh tính lập trình viên & đồng bộ kho mã nguồn GitHub"
    },
  }[provider] || {
    name: provider,
    color: "bg-primary text-white",
    accent: "text-primary",
    badgeColor: "bg-base-200",
    icon: <span>🔐</span>,
    note: "Đăng nhập an toàn qua OAuth 2.0"
  };

  const handleOpenOAuthWindow = () => {
    if (!providerConfig?.authorize_url) return;
    const width = 560;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      providerConfig.authorize_url,
      `oauth_${provider}`,
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );

    if (popup && popup.focus) popup.focus();

    // Lang nghe thong bao tu popup callback
    const handleMessage = async (event) => {
      if (event.data && event.data.type === "OAUTH_AUTH_SUCCESS") {
        window.removeEventListener("message", handleMessage);
        if (event.data.access_token && event.data.user) {
          setAuthenticatedSession(event.data.access_token, event.data.refresh_token, event.data.user);
          onClose();
          if (onSuccess) onSuccess();
        } else if (event.data.code) {
          const ok = await loginOAuth(provider, { provider, code: event.data.code });
          if (ok) {
            onClose();
            if (onSuccess) onSuccess();
          }
        }
      }
    };
    window.addEventListener("message", handleMessage);
  };

  const handleConfirmOAuthLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      addToast("Vui lòng nhập địa chỉ email hợp lệ!", "warning");
      return;
    }
    if (!name.trim()) {
      addToast("Vui lòng nhập họ và tên của bạn!", "warning");
      return;
    }

    setLoading(true);
    try {
      const ok = await loginOAuth(provider, {
        provider,
        email: email.trim(),
        name: name.trim(),
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email.trim())}`
      });

      if (ok) {
        onClose();
        if (onSuccess) onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-base-100 rounded-2xl shadow-2xl border border-base-300 p-6 overflow-hidden">
        {/* Nut dong */}
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 text-base-content/70 hover:text-base-content"
          aria-label="Đóng"
        >
          ✕
        </button>

        {/* Header Dialog */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-base-200 border border-base-300 shadow-sm mb-3">
            {providerMeta.icon}
          </div>
          <h3 className="text-lg font-bold text-base-content">
            Đăng nhập bằng {providerMeta.name}
          </h3>
          <p className="text-xs text-base-content/65 mt-1 max-w-xs mx-auto">
            {providerMeta.note}
          </p>
        </div>

        {/* Nut mo cua so OAuth tieu chuan */}
        <button
          type="button"
          onClick={handleOpenOAuthWindow}
          className={`btn w-full gap-2 font-bold shadow-sm rounded-xl border mb-3 flex items-center justify-center transition-transform hover:scale-[1.01] ${providerMeta.color}`}
        >
          {providerMeta.icon}
          <span>Mở cửa sổ ủy quyền {providerMeta.name}</span>
        </button>

        <div className="divider text-xs text-base-content/40 my-3">
          HOẶC XÁC THỰC NHANH VỚI TÀI KHOẢN
        </div>

        {/* Form xac thuc thuc te vao Database backend */}
        <form onSubmit={handleConfirmOAuthLogin} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-base-content/70 block mb-1">
              Email tài khoản {providerMeta.name} của bạn:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`vidu@${provider === "google" ? "gmail.com" : provider === "github" ? "github.com" : "gmail.com"}`}
              className="input input-sm input-bordered w-full rounded-lg text-xs"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-base-content/70 block mb-1">
              Họ và tên hiển thị:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="input input-sm input-bordered w-full rounded-lg text-xs"
              required
            />
          </div>

          <div className="p-3 bg-base-200/60 rounded-xl border border-base-300 text-[11px] text-base-content/75 flex items-start gap-2">
            <span className="text-emerald-500 font-bold shrink-0">🛡️</span>
            <span>
              Hệ thống sẽ tự động tạo tài khoản hoặc đăng nhập trực tiếp vào hệ thống IT Blog với Access Token JWT thật.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-sm w-full text-white font-bold rounded-xl shadow-md mt-2"
          >
            {loading ? "Đang xác thực với máy chủ..." : `Tiếp tục với ${providerMeta.name}`}
          </button>
        </form>
      </div>
    </div>
  );
}
