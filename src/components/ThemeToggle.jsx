import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`btn btn-sm btn-circle btn-ghost border border-base-300 shadow-sm transition-all hover:scale-105 active:scale-95 ${className}`}
      title={theme === "light" ? "Chuyển sang giao diện tối" : "Chuyển sang giao diện sáng"}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        // Icon Mặt Trời (Sun) màu vàng khi đang ở chế độ tối
        <svg
          className="w-5 h-5 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-90"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        // Icon Mặt Trăng (Moon) khi đang ở chế độ sáng
        <svg
          className="w-5 h-5 text-slate-700 transition-transform duration-300 hover:-rotate-12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}
