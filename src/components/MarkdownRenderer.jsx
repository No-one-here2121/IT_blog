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
        Anh &quot;{alt || imageId}&quot; duoc tai len o may khac nen khong hien thi duoc.
        Hay tai lai anh hoac dung nut Anh (dan URL) de chia se cho moi nguoi.
      </span>
    );
  }
  if (!src) {
    return (
      <span className="inline-block my-3 px-3 py-2 rounded-xl border border-dashed border-base-300 bg-base-200/40 text-xs text-base-content/50">
        Dang tai anh...
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
    <div className={`markdown-content space-y-4 text-base-content/90 leading-relaxed ${className}`}>
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
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoom(null)}
        >
          <img
            src={zoom.src}
            alt={zoom.alt || "Anh minh hoa"}
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
          <span className="absolute bottom-5 text-xs text-white/70">
            Bam ra ngoai de dong anh
          </span>
        </div>
      )}
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
            title="Video minh hoa bai viet"
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(`list-${i}`);
      continue;
    }

    // Headings — gan id neo de muc luc nhay toi (dong bo voi extractHeadings)
    // Luu y: TextBlock render rieng tung khoi text nen can cong so thu tu khoi
    // de id khong bi trung khi bai viet co nhieu heading giong nhau.
    if (trimmed.startsWith("### ")) {
      flushList(`list-${i}`);
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
      flushList(`list-${i}`);
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
      flushList(`list-${i}`);
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
      flushList(`list-${i}`);
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
      flushList(`list-${i}`);
      elements.push(<hr key={i} className="my-6 border-base-300" />);
      continue;
    }

    // Image tren 1 dong rieng: ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      flushList(`list-${i}`);
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
        {renderInline(trimmed, onZoom)}
      </p>
    );
  }

  flushList("list-final");

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
            className="px-1.5 py-0.5 text-xs font-mono rounded-md bg-base-300/80 text-primary font-bold mx-0.5 border border-base-300"
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
              className="text-primary font-semibold underline underline-offset-2 hover:opacity-80"
            >
              {lm[1]}
            </a>
          );
        }

        // Tách bold: **...**
        const boldParts = lPart.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((bPart, bIdx) => {
          if (bPart.startsWith("**") && bPart.endsWith("**") && bPart.length > 3) {
            return (
              <strong key={`${imgIdx}-${idx}-${lIdx}-${bIdx}`} className="font-bold text-base-content">
                {bPart.slice(2, -2)}
              </strong>
            );
          }
          // Italic don: *...* (khong trung voi **)
          const itParts = bPart.split(/(\*[^*]+\*)/g);
          return itParts.map((it, itIdx) =>
            it.startsWith("*") && it.endsWith("*") && it.length > 2 ? (
              <em key={`${imgIdx}-${idx}-${lIdx}-${bIdx}-${itIdx}`}>{it.slice(1, -1)}</em>
            ) : (
              it
            )
          );
        });
      });
    });
  });
}
