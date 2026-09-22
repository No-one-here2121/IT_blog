/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from "react";
import { resolveLocalImage, isLocalImageRef, localIdFromSrc } from "../utils/imageStore";

/**
 * Anh nguoi dung tai len tu may: noi dung bai viet chi luu ![alt](local:img_xxx),
 * blob nam trong IndexedDB nen khong lam tran o soan thao.
 */
export function LocalImage({ imageId, alt, className, onZoom }) {
  const [src, setSrc] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    resolveLocalImage(imageId)
      .then((url) => {
        if (!alive) return;
        if (url) setSrc(url);
        else setMissing(true);
      })
      .catch(() => {
        if (alive) setMissing(true);
      });
    return () => {
      alive = false;
    };
  }, [imageId]);

  if (missing) {
    return (
      <span className="inline-block my-3 px-3 py-2 rounded-xl border border-dashed border-warning/50 bg-warning/10 text-xs text-base-content/70">
        Ảnh &quot;{alt || imageId}&quot; được tải lên ở máy khác nên không hiển thị được.
        Hãy tải lại ảnh hoặc dùng nút Ảnh (dán URL) để chia sẻ cho mọi người.
      </span>
    );
  }
  if (!src) {
    return (
      <span className="inline-block my-3 px-3 py-2 rounded-xl border border-dashed border-base-300 bg-base-200/40 text-xs text-base-content/50">
        Đang tải ảnh...
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt || "Anh minh hoa"}
      loading="lazy"
      className={className + (onZoom ? " cursor-zoom-in" : "")}
      onClick={onZoom ? () => onZoom({ src, alt }) : undefined}
    />
  );
}

/**
 * Render 1 anh: tu dong chon LocalImage (anh upload) hay <img> (anh URL).
 */
export function MarkdownImage({ src, alt, className, onZoom }) {
  if (isLocalImageRef(src)) {
    return (
      <LocalImage
        imageId={localIdFromSrc(src)}
        alt={alt}
        className={className}
        onZoom={onZoom}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt || "Anh minh hoa"}
      loading="lazy"
      className={className + (onZoom ? " cursor-zoom-in" : "")}
      onClick={onZoom ? () => onZoom({ src, alt }) : undefined}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80";
      }}
    />
  );
}

/**
 * Trich muc luc (TOC) tu noi dung Markdown.
 * Chi lay cac dong heading: # H1, ## H2, ### H3.
 * Tra ve: [{ level: 1|2|3, text: string, id: string }]
 */
export function extractHeadings(content, idPrefix) {
  idPrefix = idPrefix || "";
  if (!content) return [];
  const lines = String(content).split("\n");
  const out = [];
  const used = {};
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.*)$/);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/[*_`[\]()!#]/g, "").trim();
    if (!text) continue;
    let slug = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);
    if (!slug) slug = "muc";
    if (used[slug] != null) {
      used[slug] += 1;
      slug = slug + "-" + used[slug];
    } else {
      used[slug] = 0;
    }
    out.push({ level, text, id: idPrefix + "toc-" + slug });
  }
  return out;
}

/**
 * Component render Markdown nhe cho IT Blog
 * Ho tro: Code blocks, Headings (co id neo cho muc luc), Inline code,
 * Lists, Blockquotes, Bold, Italic, Links, Images, Video.
 */
export default function MarkdownRenderer({ content, className = "", headingIdPrefix = "" }) {
  // Lightbox: bam vao anh de xem toan man hinh
  const [zoom, setZoom] = useState(null);

  // Đóng lightbox khi nhấn phím Escape
  useEffect(() => {
    if (!zoom) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoom]);

  if (!content) return null;

  // Tách nội dung thành các khối: Code blocks / Video blocks vs Text
  const blocks = [];
  const lines = content.split("\n");
  let inCodeBlock = false;
  let codeLang = "";
  let codeContent = [];
  let textContent = [];
  let inVideoBlock = false;
  let videoSource = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Khoi video: :::video <source> ... :::
    if (trimmed.startsWith(":::video")) {
      if (textContent.length > 0) {
        blocks.push({ type: "text", content: textContent.join("\n") });
        textContent = [];
      }
      videoSource = trimmed.replace(/^:::video\s*/, "").trim();
      inVideoBlock = true;
      continue;
    }
    if (inVideoBlock && trimmed === ":::") {
      blocks.push({ type: "video", source: videoSource });
      videoSource = "";
      inVideoBlock = false;
      continue;
    }
    if (inVideoBlock) {
      if (trimmed) videoSource = videoSource || trimmed;
      continue;
    }

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
    <div className={`markdown-content space-y-4 text-base-content/90 leading-relaxed break-words [overflow-wrap:anywhere] ${className}`}>
      {blocks.map((block, bIdx) => {
        if (block.type === "code") {
          return <CodeBlock key={bIdx} lang={block.lang} code={block.content} />;
        }
        if (block.type === "video") {
          return <VideoBlock key={bIdx} source={block.source} />;
        }
        return (
          <TextBlock
            key={bIdx}
            text={block.content}
            prefix={headingIdPrefix}
            onZoom={setZoom}
          />
        );
      })}

      {zoom && (
        <div
          className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoom(null)}
        >
          <img
            src={zoom.src}
            alt={zoom.alt || "Ảnh minh họa"}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
          <span className="absolute bottom-5 text-xs text-white/70">
            Bấm ra ngoài để đóng ảnh
          </span>
        </div>
      )}
    </div>
  );
}

// Khối Code Block có thanh tiêu đề hiển thị ngôn ngữ, nút Copy và nút Chạy thử nghiệm trực tiếp
function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [executionTime, setExecutionTime] = useState(null);
  const [runStatus, setRunStatus] = useState("idle"); // 'idle' | 'success' | 'error'
  const [wordWrap, setWordWrap] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);

  const normalizedLang = String(lang || "").toLowerCase().trim();
  const isJsLike = ["js", "javascript", "ts", "typescript", "jsx", "tsx", "node", "es6"].includes(normalizedLang);
  const isPython = ["py", "python"].includes(normalizedLang);
  const isRunnable = isJsLike || isPython;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleRunCode = () => {
    setShowConsole(true);
    setRunStatus("idle");
    const logs = [];
    const t0 = performance.now();

    if (isJsLike) {
      // Capture console methods
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;
      const originalInfo = console.info;

      const formatArg = (arg) => {
        if (typeof arg === "object" && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      };

      console.log = (...args) => {
        logs.push({ type: "log", text: args.map(formatArg).join(" ") });
        originalLog(...args);
      };
      console.info = (...args) => {
        logs.push({ type: "info", text: args.map(formatArg).join(" ") });
        originalInfo(...args);
      };
      console.warn = (...args) => {
        logs.push({ type: "warn", text: args.map(formatArg).join(" ") });
        originalWarn(...args);
      };
      console.error = (...args) => {
        logs.push({ type: "error", text: args.map(formatArg).join(" ") });
        originalError(...args);
      };

      try {
        const cleanCode = code
          .replace(/^\s*import\s+.*$/gm, "// [import]")
          .replace(/^\s*export\s+default\s+/gm, "")
          .replace(/^\s*export\s+/gm, "");

        const fn = new Function(cleanCode);
        const result = fn();
        if (result !== undefined) {
          logs.push({ type: "return", text: `↪ Kết quả trả về: ${formatArg(result)}` });
        }
        const t1 = performance.now();
        setExecutionTime(Math.max(0.1, +(t1 - t0).toFixed(2)));
        setRunStatus("success");
      } catch (err) {
        logs.push({ type: "error", text: `✕ Lỗi thực thi: ${err.message}` });
        const t1 = performance.now();
        setExecutionTime(Math.max(0.1, +(t1 - t0).toFixed(2)));
        setRunStatus("error");
      } finally {
        console.log = originalLog;
        console.info = originalInfo;
        console.warn = originalWarn;
        console.error = originalError;
      }
    } else if (isPython) {
      logs.push({ type: "info", text: "⚡ [Môi trường giả lập Python 3.11 Runtime]" });
      const printMatches = [...code.matchAll(/print\s*\((.*?)\)/g)];
      if (printMatches.length > 0) {
        printMatches.forEach((m) => {
          const raw = m[1].trim().replace(/^["']|["']$/g, "");
          logs.push({ type: "log", text: raw });
        });
      } else {
        logs.push({ type: "log", text: "Chương trình thực thi hoàn tất mà không có lệnh xuất màn hình (stdout)." });
      }
      const t1 = performance.now();
      setExecutionTime(Math.max(0.1, +(t1 - t0).toFixed(2)));
      setRunStatus("success");
    }

    if (logs.length === 0) {
      logs.push({ type: "log", text: "✓ Mã nguồn đã chạy thành công (không có đầu ra console)." });
    }
    setConsoleLogs(logs);
  };

  return (
    <div className="my-5 rounded-2xl overflow-hidden border border-slate-700/60 shadow-md bg-[#0d1117] text-slate-100 max-w-full">
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
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Bật/Tắt tự động bọc dòng */}
          <button
            type="button"
            onClick={() => setWordWrap((prev) => !prev)}
            className={`btn btn-ghost btn-xs text-[11px] font-sans transition-colors ${
              wordWrap ? "text-emerald-400 hover:text-emerald-300 bg-emerald-950/40" : "text-slate-400 hover:text-slate-200"
            }`}
            title={wordWrap ? "Tắt tự động bọc dòng (chuyển sang cuộn ngang)" : "Bật tự động bọc dòng (không cần cuộn ngang)"}
          >
            <span>{wordWrap ? "↩️ Bọc dòng" : "➡️ Tràn"}</span>
          </button>

          {/* Bật/Tắt hiển thị số dòng */}
          <button
            type="button"
            onClick={() => setShowLineNumbers((prev) => !prev)}
            className={`btn btn-ghost btn-xs text-[11px] font-sans transition-colors ${
              showLineNumbers ? "text-emerald-400 hover:text-emerald-300 bg-emerald-950/40" : "text-slate-400 hover:text-slate-200"
            }`}
            title={showLineNumbers ? "Ẩn số dòng code" : "Hiển thị số dòng code"}
          >
            <span># Dòng</span>
          </button>

          {isRunnable && (
            <button
              type="button"
              onClick={handleRunCode}
              className="btn btn-ghost btn-xs text-[11px] font-sans text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 gap-1 transition-colors"
              title="Chạy thử nghiệm mã nguồn này trực tiếp trong trình duyệt"
            >
              <span>▶️</span>
              <span>Chạy code</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-ghost btn-xs text-[11px] font-sans text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            {copied ? "✓ Đã chép" : "📋 Sao chép"}
          </button>
        </div>
      </div>
      <pre className={`p-4 text-xs sm:text-sm font-mono overflow-x-auto max-w-full leading-relaxed bg-[#0d1117] text-slate-100 selection:bg-primary/30 ${
        wordWrap ? "!whitespace-pre-wrap break-words" : "!whitespace-pre"
      }`}>
        {showLineNumbers ? (
          <div className="flex">
            <div className="select-none pr-3 text-right text-slate-600 font-mono text-xs border-r border-slate-800 shrink-0">
              {(code || "").split("\n").map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <code className="!bg-transparent !p-0 !text-slate-100 font-mono block pl-3 flex-1 overflow-x-auto">
              {code}
            </code>
          </div>
        ) : (
          <code className="!bg-transparent !p-0 !text-slate-100 font-mono block">{code}</code>
        )}
      </pre>

      {/* Terminal Console Output Panel */}
      {showConsole && (
        <div className="bg-[#080b10] border-t border-slate-700/80 p-3 text-xs font-mono animate-fade-in">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200">🖥️ Terminal Console:</span>
              <span className={`badge badge-xs font-bold ${
                runStatus === "success"
                  ? "badge-success text-white"
                  : runStatus === "error"
                  ? "badge-error text-white"
                  : "badge-ghost"
              }`}>
                {runStatus === "success" ? "✓ Thành công" : "⚠️ Ngoại lệ"}
              </span>
              {executionTime !== null && (
                <span className="text-[10px] text-slate-500">({executionTime}ms)</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRunCode}
                className="btn btn-ghost btn-xs text-slate-300 hover:text-emerald-400 gap-1 text-[10px]"
                title="Chạy lại mã nguồn"
              >
                🔄 Chạy lại
              </button>
              <button
                type="button"
                onClick={() => setConsoleLogs([])}
                className="btn btn-ghost btn-xs text-slate-400 hover:text-amber-400 gap-1 text-[10px]"
                title="Xóa màn hình console"
              >
                🗑️ Xóa
              </button>
              <button
                type="button"
                onClick={() => setShowConsole(false)}
                className="btn btn-ghost btn-xs text-slate-400 hover:text-rose-400 text-[11px]"
                title="Đóng bảng điều khiển"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {consoleLogs.length === 0 ? (
              <span className="text-slate-500 italic">Màn hình console trống.</span>
            ) : (
              consoleLogs.map((log, lIdx) => (
                <div
                  key={lIdx}
                  className={`flex items-start gap-1.5 font-mono leading-relaxed ${
                    log.type === "error"
                      ? "text-rose-400 bg-rose-950/20 px-1.5 py-0.5 rounded"
                      : log.type === "warn"
                      ? "text-amber-300"
                      : log.type === "return"
                      ? "text-cyan-300 font-semibold"
                      : log.type === "info"
                      ? "text-blue-300"
                      : "text-emerald-300"
                  }`}
                >
                  <span className="select-none text-slate-600">&gt;</span>
                  <span className="whitespace-pre-wrap break-all">{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Khoi Video 16:9 — nhan youtube:<id>, URL youtube hoac MP4 truc tiep
function VideoBlock({ source }) {
  const raw = String(source || "").trim();
  if (!raw) return null;
  const yt = raw.startsWith("youtube:")
    ? raw.replace("youtube:", "").trim()
    : (raw.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/)?.[1] || "");
  if (yt) {
    return (
      <div className="my-5 rounded-2xl overflow-hidden border border-base-300 bg-black shadow-md">
        <div className="aspect-video w-full">
          <iframe
            src={"https://www.youtube.com/embed/" + yt}
            title="Video minh họa bài viết"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }
  return (
    <div className="my-5 rounded-2xl overflow-hidden border border-base-300 bg-black shadow-md">
      <video src={raw} controls preload="metadata" className="w-full aspect-video bg-black" />
    </div>
  );
}

// Khoi Text xu ly Headings, Images, Lists, Blockquotes, Paragraphs
function TextBlock({ text, prefix, onZoom }) {
  prefix = prefix || "";
  const lines = text.split("\n");
  const elements = [];
  let currentList = null;

  const flushList = (key) => {
    if (currentList) {
      if (currentList.type === "ul") {
        elements.push(
          <ul key={key} className="space-y-1 my-2 pl-2">
            {currentList.items.map((it, idx) => (
              <li key={idx} className="flex items-baseline gap-2 text-sm sm:text-base">
                <span className="text-primary font-bold text-xs sm:text-sm shrink-0">•</span>
                <div>{renderInline(it, onZoom)}</div>
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={key} className="space-y-1 my-2 pl-2">
            {currentList.items.map((it, idx) => {
              // Mac dinh: hien so thu tu tu dong (1., 2., ...)
              // Ngoai le: dong da co so rieng ("5. xxx", "(3) xxx") thi giu
              // nguyen so do; dong co moc thoi gian ("0:00 ...") thi bo so
              // da luu va dung so thu tu tu dong cho dung thu tu hien tai.
              const t0 = it.trim();
              const hasTimestamp = /^(\d+[.)]\s+)?\d{1,2}:\d{2}(:\d{2})?\s+/.test(t0);
              const hasOwnNum = !hasTimestamp && /^(\(\d+\)|\d+[.)])\s+/.test(t0);
              const itemText = hasTimestamp ? it.replace(/^(\s*)\d+[.)]\s+/, "$1") : it;
              return (
                <li key={idx} className="flex items-baseline gap-2 text-sm sm:text-base">
                  {hasOwnNum ? (
                    <div>{renderInline(it, onZoom)}</div>
                  ) : (
                    <>
                      <span className="font-bold text-primary text-xs sm:text-sm shrink-0">
                        {idx + 1}.
                      </span>
                      <div>{renderInline(itemText, onZoom)}</div>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        );
      }
      currentList = null;
    }
  };

  let currentTable = null;

  const flushTable = (key) => {
    if (currentTable) {
      if (currentTable.rows.length > 0) {
        elements.push(
          <div key={key} className="my-5 overflow-x-auto rounded-2xl border border-base-300 shadow-2xs max-w-full">
            <table className="table table-sm table-zebra w-full text-xs sm:text-sm">
              {currentTable.headers.length > 0 && (
                <thead className="bg-base-200/80 text-base-content font-bold border-b border-base-300">
                  <tr>
                    {currentTable.headers.map((h, hIdx) => (
                      <th key={hIdx} className="px-3.5 py-2.5">
                        {renderInline(h, onZoom)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {currentTable.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-base-200/50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2.5">
                        {renderInline(cell, onZoom)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      } else if (currentTable.rawHeader) {
        elements.push(
          <p key={key} className="text-sm sm:text-base text-base-content/90 leading-relaxed my-2">
            {renderInline(currentTable.rawHeader, onZoom)}
          </p>
        );
      }
      currentTable = null;
    }
  };

  const flushAll = (key) => {
    flushList(key);
    flushTable(key);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll(`empty-${i}`);
      continue;
    }

    // Markdown Table: | Header 1 | Header 2 |
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.split("|").length >= 3) {
      flushList(`list-${i}`);
      const rawCells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
      const isDivider = rawCells.every((c) => /^:?-+:?$/.test(c));

      if (isDivider) {
        if (currentTable && !currentTable.hasDivider) {
          currentTable.hasDivider = true;
          continue;
        }
      }

      if (!currentTable) {
        currentTable = {
          headers: rawCells,
          rawHeader: trimmed,
          hasDivider: false,
          rows: []
        };
        continue;
      } else if (currentTable.hasDivider) {
        currentTable.rows.push(rawCells);
        continue;
      } else {
        flushTable(`table-${i}`);
        currentTable = {
          headers: rawCells,
          rawHeader: trimmed,
          hasDivider: false,
          rows: []
        };
        continue;
      }
    } else {
      flushTable(`table-${i}`);
    }

    // Headings — gan id neo de muc luc nhay toi (dong bo voi extractHeadings)
    if (trimmed.startsWith("### ")) {
      flushAll(`h3-${i}`);
      const hText = trimmed.replace(/^###\s+/, "");
      const items = extractHeadings(trimmed);
      const hid = items[0] ? prefix + items[0].id : undefined;
      elements.push(
        <h3 key={i} id={hid} className="text-lg sm:text-xl font-bold text-base-content mt-6 mb-2 flex items-center gap-2 scroll-mt-24">
          {renderInline(hText, onZoom)}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushAll(`h2-${i}`);
      const hText = trimmed.replace(/^##\s+/, "");
      const items = extractHeadings(trimmed);
      const hid = items[0] ? prefix + items[0].id : undefined;
      elements.push(
        <h2 key={i} id={hid} className="text-xl sm:text-2xl font-black text-base-content mt-7 mb-3 border-b border-base-200 pb-2 scroll-mt-24">
          {renderInline(hText, onZoom)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushAll(`h1-${i}`);
      const hText = trimmed.replace(/^#\s+/, "");
      const items = extractHeadings(trimmed);
      const hid = items[0] ? prefix + items[0].id : undefined;
      elements.push(
        <h1 key={i} id={hid} className="text-2xl sm:text-3xl font-black text-base-content mt-8 mb-4 scroll-mt-24">
          {renderInline(hText, onZoom)}
        </h1>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushAll(`quote-${i}`);
      elements.push(
        <blockquote
          key={i}
          className="border-l-4 border-primary pl-4 py-2 italic bg-base-200/40 rounded-r-xl my-3 text-sm sm:text-base text-base-content/80"
        >
          {renderInline(trimmed.replace(/^>\s+/, ""), onZoom)}
        </blockquote>
      );
      continue;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushAll(`hr-${i}`);
      elements.push(<hr key={i} className="my-6 border-base-300" />);
      continue;
    }

    // Image tren 1 dong rieng: ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      flushAll(`img-${i}`);
      elements.push(
        <figure key={i} className="my-5 text-center">
          <MarkdownImage
            src={imgMatch[2]}
            alt={imgMatch[1]}
            onZoom={onZoom}
            className="mx-auto max-w-full max-h-[520px] w-auto rounded-2xl border border-base-300 object-contain bg-base-200/30 shadow-sm"
          />
          {imgMatch[1] && (
            <figcaption className="mt-2 text-center text-xs italic text-base-content/60">
              {imgMatch[1]}
            </figcaption>
          )}
        </figure>
      );
      continue;
    }

    // Unordered List
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushTable(`table-${i}`);
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
      flushTable(`table-${i}`);
      if (!currentList || currentList.type !== "ol") {
        flushList(`list-${i}`);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numMatch[2]);
      continue;
    }

    // Paragraph
    flushAll(`p-${i}`);
    elements.push(
      <p key={i} className="text-sm sm:text-base text-base-content/90 leading-relaxed my-2 break-words">
        {renderInline(trimmed, onZoom)}
      </p>
    );
  }

  flushAll("final");

  return <>{elements}</>;
}

// Xử lý định dạng nội dòng: **bold**, `code`, *italic*, [link](url), ![alt](url)
function renderInline(text, onZoom) {
  if (!text) return "";

  // Tách image inline trước: ![alt](url)
  const imgParts = text.split(/(!\[[^\]]*\]\([^)]+\))/g);

  return imgParts.map((imgPart, imgIdx) => {
    const m = imgPart.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (m) {
      return (
        <MarkdownImage
          key={`img-${imgIdx}`}
          src={m[2]}
          alt={m[1]}
          onZoom={onZoom}
          className="my-3 mx-auto block max-w-full max-h-[420px] w-auto rounded-xl border border-base-300 object-contain bg-base-200/30"
        />
      );
    }

    // Tách theo code blocks trước: `...`
    const codeParts = imgPart.split(/(`[^`]+`)/g);

    return codeParts.map((part, idx) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
        return (
          <code
            key={`${imgIdx}-${idx}`}
            className="px-1.5 py-0.5 text-xs font-mono rounded-md bg-base-300/80 text-primary font-bold mx-0.5 border border-base-300 break-words [word-break:break-word]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Tách link: [text](url)
      const linkParts = part.split(/(\[[^\]]+\]\([^)]+\))/g);
      return linkParts.map((lPart, lIdx) => {
        const lm = lPart.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (lm) {
          return (
            <a
              key={`${imgIdx}-${idx}-${lIdx}`}
              href={lm[2]}
              target="_blank"
              rel="noreferrer"
              className="text-primary font-semibold underline underline-offset-2 hover:opacity-80 break-words [word-break:break-word]"
            >
              {lm[1]}
            </a>
          );
        }

        // Tách gạch ngang (strikethrough): ~~...~~
        const strikeParts = lPart.split(/(~~[^~]+~~)/g);
        return strikeParts.map((sPart, sIdx) => {
          if (sPart.startsWith("~~") && sPart.endsWith("~~") && sPart.length > 4) {
            return (
              <del key={`${imgIdx}-${idx}-${lIdx}-${sIdx}`} className="line-through opacity-70">
                {sPart.slice(2, -2)}
              </del>
            );
          }

          // Tách bold: **...** hoặc __...__
          const boldParts = sPart.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
          return boldParts.map((bPart, bIdx) => {
            if (
              (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length > 3) ||
              (bPart.startsWith("__") && bPart.endsWith("__") && bPart.length > 3)
            ) {
              return (
                <strong key={`${imgIdx}-${idx}-${lIdx}-${sIdx}-${bIdx}`} className="font-bold text-base-content">
                  {bPart.slice(2, -2)}
                </strong>
              );
            }
            // Italic don: *...* (khong trung voi **)
            const itParts = bPart.split(/(\*[^*]+\*)/g);
            return itParts.map((it, itIdx) =>
              it.startsWith("*") && it.endsWith("*") && it.length > 2 ? (
                <em key={`${imgIdx}-${idx}-${lIdx}-${sIdx}-${bIdx}-${itIdx}`}>{it.slice(1, -1)}</em>
              ) : (
                it
              )
            );
          });
        });
      });
    });
  });
}
