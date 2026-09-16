import { useState } from "react";

export default function Log_table({ log_what, onNavigate }) {
  const isSignUp = log_what === "Log up" || log_what === "Đăng ký";
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = "Vui lòng nhập email.";
    if (!password) errs.password = "Vui lòng nhập mật khẩu.";
    if (isSignUp) {
      if (!username.trim()) errs.username = "Vui lòng nhập username.";
      if (confirmPassword !== password) errs.confirmPassword = "Mật khẩu không khớp.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate() && onNavigate) {
      onNavigate("main_menu");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-base-100 border border-base-300 rounded-2xl w-full max-w-sm p-6 shadow-md space-y-3">
      <h3 className="text-lg font-black text-center text-base-content mb-2">{log_what}</h3>

      {isSignUp && (
        <div>
          <label className="label text-xs font-semibold text-base-content/80 pb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input input-sm input-bordered w-full text-xs"
            placeholder="Username của bạn"
          />
          {errors.username && <p className="text-[11px] text-error mt-0.5">{errors.username}</p>}
        </div>
      )}

      <div>
        <label className="label text-xs font-semibold text-base-content/80 pb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input input-sm input-bordered w-full text-xs"
          placeholder="Email của bạn"
        />
        {errors.email && <p className="text-[11px] text-error mt-0.5">{errors.email}</p>}
      </div>

      <div>
        <label className="label text-xs font-semibold text-base-content/80 pb-1">Password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input input-sm input-bordered w-full pr-8 text-xs"
            placeholder="Mật khẩu"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-2 text-base-content/50 hover:text-base-content text-xs"
          >
            {showPassword ? "Ẩn" : "Hiện"}
          </button>
        </div>
        {errors.password && <p className="text-[11px] text-error mt-0.5">{errors.password}</p>}
      </div>

      {isSignUp && (
        <div>
          <label className="label text-xs font-semibold text-base-content/80 pb-1">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input input-sm input-bordered w-full text-xs"
            placeholder="Xác nhận lại mật khẩu"
          />
          {errors.confirmPassword && <p className="text-[11px] text-error mt-0.5">{errors.confirmPassword}</p>}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-sm w-full text-white font-bold tracking-wide shadow-md mt-4 hover:scale-[1.01] active:scale-[0.98] transition-all"
      >
        {log_what}
      </button>
    </form>
  );
}