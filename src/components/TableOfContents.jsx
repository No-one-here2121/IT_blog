import { extractHeadings } from "./MarkdownRenderer";

export default function TableOfContents({ content, headingIdPrefix }) {
  headingIdPrefix = headingIdPrefix || "";
  const items = extractHeadings(content, headingIdPrefix);
  if (!items.length) return null;
  const go = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <nav className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wider text-base-content/60 mb-2">
        Muc luc bai viet
      </p>
      <ul className="space-y-1 max-h-72 overflow-auto pr-1">
        {items.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => go(h.id)}
              className={
                "w-full text-left text-xs sm:text-sm rounded-lg px-2 py-1.5 hover:bg-primary/10 hover:text-primary transition-colors " +
                (h.level === 1 ? "font-black" : h.level === 2 ? "font-bold ml-1" : "ml-4 text-base-content/80")
              }
            >
              <span className="text-primary font-bold mr-1.5">
                {h.level === 1 ? "●" : h.level === 2 ? "◆" : "○"}
              </span>
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
