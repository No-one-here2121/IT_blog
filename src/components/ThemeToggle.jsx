import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "./icons";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`btn btn-sm btn-circle btn-ghost border border-base-300 shadow-sm transition-all hover:scale-105 active:scale-95 hover:bg-base-200 ${className}`}
      title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun size={18} className="text-amber-400 fill-amber-400/25 transition-transform duration-300 hover:rotate-90" />
      ) : (
        <Moon size={18} className="text-indigo-600 dark:text-indigo-400 fill-indigo-500/20 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
