import { useState } from "react";

/**
 * Component render Markdown nhẹ và tối ưu cho IT Blog
 * Hỗ trợ: Code blocks (với copy & tag ngôn ngữ), Headings, Inline code,
 * Lists (đánh số & gạch đầu dòng), Blockquotes, Bold, Italic
 */
export default function MarkdownRenderer({ content, className = "" }) {
  if (!content) return null;

  // Tách nội dung thành các khối: Code blocks vs Text thông thường
  const blocks = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeLang = "";
  let codeContent = [];
  let textContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // Kết thúc code block
        blocks.push({
          type: "code",
          lang: codeLang || "code",
          content: codeContent.join("\n"),
        });
        codeContent = [];
        codeLang = "";
        inCodeBlock = false;
      } else {
        // Bắt đầu code block, flush text trước đó
        if (textContent.length > 0) {
          blocks.push({ type: "text", content: textContent.join("\n") });
          textContent = [];
        }
        codeLang = trimmed.replace("```", "").trim();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
    } else {
      textContent.push(line);
    }
  }

  // Flush block còn sót
  if (inCodeBlock && codeContent.length > 0) {
    blocks.push({ type: "code", lang: codeLang || "code", content: codeContent.join("\n") });
  } else if (textContent.length > 0) {
    blocks.push({ type: "text", content: textContent.join("\n") });
  }

  return (
    <div className={`markdown-content space-y-4 text-base-content/90 leading-relaxed ${className}`}>
      {blocks.map((block, bIdx) => {
        if (block.type === "code") {
          return <CodeBlock key={bIdx} lang={block.lang} code={block.content} />;
        }
        return <TextBlock key={bIdx} text={block.content} />;
      })}
    </div>
  );
}

// Khối Code Block có thanh tiêu đề hiển thị ngôn ngữ và nút Copy
function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="my-5 rounded-2xl overflow-hidden border border-slate-700/60 shadow-md bg-[#0d1117] text-slate-100">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/90 border-b border-slate-700/60 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-2xs"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-2xs"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-2xs"></span>
          </div>
          <span className="font-bold uppercase tracking-wider text-slate-300 ml-2 text-[11px]">
            {lang || "CODE"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-ghost btn-xs text-[11px] font-sans text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
        >
          {copied ? "✓ Đã chép" : "📋 Sao chép"}
        </button>
      </div>
      <pre className="p-4 text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed bg-[#0d1117] text-slate-100 selection:bg-primary/30">
        <code className="!bg-transparent !p-0 !text-slate-100 font-mono block">{code}</code>
      </pre>
    </div>
  );
}

// Khối Text xử lý Headings, Lists, Blockquotes, Paragraphs
function TextBlock({ text }) {
  const lines = text.split("\n");
  const elements = [];
  let currentList = null;

  const flushList = (key) => {
    if (currentList) {
      if (currentList.type === "ul") {
        elements.push(
          <ul key={key} className="space-y-1 my-2 pl-2">
            {currentList.items.map((it, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm sm:text-base">
                <span className="text-primary mt-1 font-bold text-xs shrink-0">•</span>
                <div>{renderInline(it)}</div>
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={key} className="space-y-1 my-2 pl-2">
            {currentList.items.map((it, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm sm:text-base">
                <span className="font-bold text-primary text-xs shrink-0 mt-0.5">{idx + 1}.</span>
                <div>{renderInline(it)}</div>
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(`list-${i}`);
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList(`list-${i}`);
      elements.push(
        <h3 key={i} className="text-lg sm:text-xl font-bold text-base-content mt-6 mb-2 flex items-center gap-2">
          {renderInline(trimmed.replace(/^###\s+/, ""))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList(`list-${i}`);
      elements.push(
        <h2 key={i} className="text-xl sm:text-2xl font-black text-base-content mt-7 mb-3 border-b border-base-200 pb-2">
          {renderInline(trimmed.replace(/^##\s+/, ""))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList(`list-${i}`);
      elements.push(
        <h1 key={i} className="text-2xl sm:text-3xl font-black text-base-content mt-8 mb-4">
          {renderInline(trimmed.replace(/^#\s+/, ""))}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList(`list-${i}`);
      elements.push(
        <blockquote
          key={i}
          className="border-l-4 border-primary pl-4 py-2 italic bg-base-200/40 rounded-r-xl my-3 text-sm sm:text-base text-base-content/80"
        >
          {renderInline(trimmed.replace(/^>\s+/, ""))}
        </blockquote>
      );
      continue;
    }

    // Unordered List
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!currentList || currentList.type !== "ul") {
        flushList(`list-${i}`);
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }

    // Ordered List
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList(`list-${i}`);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numMatch[2]);
      continue;
    }

    // Paragraph
    flushList(`list-${i}`);
    elements.push(
      <p key={i} className="text-sm sm:text-base text-base-content/90 leading-relaxed my-2">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList("list-final");

  return <>{elements}</>;
}

// Xử lý định dạng nội dòng: **bold**, `code`, *italic*
function renderInline(text) {
  if (!text) return "";

  // Tách theo code blocks trước: `...`
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 text-xs font-mono rounded-md bg-base-300/80 text-primary font-bold mx-0.5 border border-base-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Tách bold: **...**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length > 3) {
        return (
          <strong key={`${idx}-${bIdx}`} className="font-bold text-base-content">
            {bPart.slice(2, -2)}
          </strong>
        );
      }
      return bPart;
    });
  });
}
