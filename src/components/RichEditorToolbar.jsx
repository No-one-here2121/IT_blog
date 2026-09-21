/* eslint-disable react-refresh/only-export-components */
import { useRef, useState } from "react";
import { saveLocalImage } from "../utils/imageStore";

/**
 * Thanh cong cu soan thao kieu Word cho IT Blog.
 * Khong cai them lib ngoai — thao tac truc tiep len textarea qua ref.
 */
const TOOLS = [
  { id: "bold", icon: "B", label: "Boi den chu roi bam: in dam", cls: "font-black" },
  { id: "italic", icon: "I", label: "Boi den chu roi bam: in nghieng", cls: "italic font-serif" },
  { id: "h1", icon: "H1", label: "Boi den dong roi bam: thanh tieu de H1 (len muc luc)" },
  { id: "h2", icon: "H2", label: "Boi den dong roi bam: thanh tieu de H2 (len muc luc)" },
  { id: "h3", icon: "H3", label: "Boi den dong roi bam: thanh tieu de H3 (len muc luc)" },
  { id: "link", icon: "Lien ket", label: "Chen lien ket" },
  { id: "image", icon: "Anh", label: "Chen anh tu URL" },
  { id: "video", icon: "Video", label: "Chen video (YouTube / MP4)" },
  { id: "code", icon: "Code", label: "Chen code block" },
  { id: "quote", icon: "Trích", label: "Trich dan" },
  { id: "ul", icon: "List", label: "Boi den nhieu dong roi bam: thanh list gach dau dong" },
  { id: "ol", icon: "1,2,3", label: "Boi den nhieu dong roi bam: tu danh so 1,2,3 (giu so cu)" },
  { id: "hr", icon: "---", label: "Duong ke ngang" },
  { id: "step", icon: "Buoc HD", label: "Chen khoi Buoc huong dan" }
];

function getYouTubeId(url) {
  const m = String(url || "").match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/
  );
  return m ? m[1] : "";
}

export function toVideoMarkdown(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return "";
  const yt = getYouTubeId(url);
  if (yt) return ":::video youtube:" + yt + "\n:::";
  return ":::video " + url + "\n:::";
}

export default function RichEditorToolbar({ textareaRef, value, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const safeValue = value || "";

  const refocusSelect = (ls, le) => {
    const ta = textareaRef?.current;
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      try {
        ta.setSelectionRange(ls, le);
      } catch { /* bo qua */ }
    });
  };

  const applyAtCursor = (before, after, placeholder) => {
    after = after || "";
    placeholder = placeholder || "";
    const ta = textareaRef?.current;
    const cur = safeValue;
    const start = ta ? (ta.selectionStart ?? cur.length) : cur.length;
    const end = ta ? (ta.selectionEnd ?? cur.length) : cur.length;
    const selected = cur.slice(start, end) || placeholder;
    const next = cur.slice(0, start) + before + selected + after + cur.slice(end);
    onChange(next);
    const pos = start + before.length + selected.length + after.length;
    refocusSelect(pos, pos);
  };

  const insertBlock = (snippet) => {
    const ta = textareaRef?.current;
    const cur = safeValue;
    const pos = ta ? (ta.selectionStart ?? cur.length) : cur.length;
    const head = cur.slice(0, pos);
    const prefix = pos === 0 ? "" : head.endsWith("\n") ? "\n" : "\n\n";
    onChange(head + prefix + snippet + "\n" + cur.slice(pos));
    const at = head.length + prefix.length + snippet.length + 1;
    refocusSelect(at, at);
  };

  const handleImageUrl = () => {
    const url = window.prompt("Dan URL anh (https://...):");
    if (!url || !url.trim()) return;
    const alt = window.prompt("Mo ta anh (alt text):", "Minh hoa bai viet") || "Minh hoa bai viet";
    insertBlock("![" + alt.trim() + "](" + url.trim() + ")");
  };

  // Nen anh + luu blob vao IndexedDB, content chi giu placeholder ngan
  // dang ![alt](local:img_xxx) — khong nhet base64 vao textarea nua.
  const fileToLocalRef = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = async () => {
          try {
            const maxW = 1280;
            const scale = img.width > maxW ? maxW / img.width : 1;
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d").drawImage(img, 0, 0, w, h);
            const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.82));
            if (!blob) throw new Error("Khong nen duoc anh");
            const id =
              "img_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
            await saveLocalImage(id, blob);
            const alt = ((file.name || "anh-minh-hoa").replace(/\.[^.]+$/, "") || "anh-minh-hoa").slice(0, 60);
            resolve("![" + alt + "](local:" + id + ")");
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => reject(new Error("Khong doc duoc file anh"));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Khong doc duoc file anh"));
      reader.readAsDataURL(file);
    });

  const handleImageFile = async (file) => {
    if (!file || uploading) return;
    if (!file.type.startsWith("image/")) {
      alert("Vui long chon file anh (png, jpg, gif, webp).");
      return;
    }
    setUploading(true);
    try {
      const md = await fileToLocalRef(file);
      insertBlock(md);
    } catch {
      alert("Khong doc duoc file anh, vui long chon file khac.");
    } finally {
      setUploading(false);
    }
  };

  const handleVideo = () => {
    const url = window.prompt("Dan link YouTube hoac file MP4 (https://...):");
    if (!url || !url.trim()) return;
    insertBlock(toVideoMarkdown(url));
  };

  const handleLink = () => {
    const url = window.prompt("Dan URL lien ket (https://...):");
    if (!url || !url.trim()) return;
    const ta = textareaRef?.current;
    let selected = "";
    if (ta && ta.selectionStart !== ta.selectionEnd) {
      selected = safeValue.slice(ta.selectionStart, ta.selectionEnd);
    }
    const text = selected || window.prompt("Chu hien thi:", "Xem tai lieu") || "Xem tai lieu";
    applyAtCursor("[", "](" + url.trim() + ")", text);
  };

  // Dung cho nut List / Numbered List / Trich dan khi nguoi dung BOI DEN
  // nhieu dong da copy san: ap tien to cho TUNG DONG, giu so thu tu cu.
  const applyListPrefix = (kind) => {
    const ta = textareaRef?.current;
    const cur = safeValue;
    const start = ta ? (ta.selectionStart ?? cur.length) : cur.length;
    const end = ta ? (ta.selectionEnd ?? cur.length) : cur.length;
    // Mo rong ra ca dong (giong Word) — neu khong boi den thi chen mau
    let ls = start;
    while (ls > 0 && cur[ls - 1] !== "\n") ls -= 1;
    let le = end;
    while (le < cur.length && cur[le] !== "\n") le += 1;
    if (ls === le) {
      if (kind === "ul") insertBlock("- Y chinh thu nhat\n- Y chinh thu hai\n- Luu y quan trong");
      else if (kind === "ol") insertBlock("1. Mo cong cu can dung\n2. Thuc hien thao tac chinh\n3. Kiem tra ket qua");
      else insertBlock("> Meo hay: viet 1 cau chot lai y chinh cua doan o day.");
      return;
    }
    const lines = cur.slice(ls, le).split("\n");
    let n = 1;
    const out = lines.map((ln) => {
      const t = ln.replace(/^\s+/, "");
      if (t === "") return "";
      if (kind === "ol") {
        // Dong da co so san (vd "5. xxx" hoac "(3) xxx"): giu nguyen so do,
        // khong danh lai tu 1 de so chi muc khong bi sai so voi chu da paste.
        const num = t.match(/^(\d+)[.)]\s+(.*)$/);
        if (num) {
          n = parseInt(num[1], 10) + 1;
          if (!Number.isFinite(n) || n < 1) n = 1;
          return num[1] + ". " + num[2];
        }
        const paren = t.match(/^\((\d+)\)\s+(.*)$/);
        if (paren) {
          n = parseInt(paren[1], 10) + 1;
          if (!Number.isFinite(n) || n < 1) n = 1;
          return paren[1] + ". " + paren[2];
        }
        // Dong co moc thoi gian "0:00", "12:34" (muc luc video): van danh so
        // thu tu 1,2,3... va GIU NGUYEN moc thoi gian phia truoc.
        return n++ + ". " + t;
      }
      // Bo tien to cu de khong bi chong chat khi bam 2 lan
      const clean = t
        .replace(/^#{1,3}\s+/, "")
        .replace(/^>\s?/, "")
        .replace(/^[-*]\s+/, "")
        .replace(/^\d+\.\s+/, "");
      if (kind === "ul") return "- " + clean;
      if (kind === "quote") return "> " + clean;
      // Numbered list: so thu tu tiep tuc tu so cua dong gan nhat
      return n++ + ". " + clean;
    });
    const next = cur.slice(0, ls) + out.join("\n") + cur.slice(le);
    onChange(next);
    refocusSelect(ls, ls + out.join("\n").length);
  };

  const applyLinePrefix = (prefix) => {
    const ta = textareaRef?.current;
    const cur = value || "";
    const start = ta?.selectionStart ?? cur.length;
    const end = ta?.selectionEnd ?? cur.length;
    // Mo rong vung chon ra ca dong de ap dinh dang cho toan bo dong (giong Word)
    let ls = start;
    while (ls > 0 && cur[ls - 1] !== "\n") ls -= 1;
    let le = end;
    while (le < cur.length && cur[le] !== "\n") le += 1;
    const chunk = cur.slice(ls, le) || "Tieu de muc";
    const lines = chunk.split("\n").map((ln) => {
      const t = ln.replace(/^\s+/, "");
      if (/^#{1,3}\s/.test(t)) return prefix + " " + t.replace(/^#{1,3}\s+/, "");
      if (/^[-*]\s+/.test(t) || /^\d+\.\s+/.test(t) || t === "") return t;
      return prefix + " " + t;
    });
    const next = cur.slice(0, ls) + lines.join("\n") + cur.slice(le);
    onChange(next);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(ls, ls + lines.join("\n").length);
    });
  };

  const handleTool = (id) => {
    if (id === "bold") applyAtCursor("**", "**", "chu in dam");
    else if (id === "italic") applyAtCursor("*", "*", "chu in nghieng");
    else if (id === "h1") applyLinePrefix("#");
    else if (id === "h2") applyLinePrefix("##");
    else if (id === "h3") applyLinePrefix("###");
    else if (id === "link") handleLink();
    else if (id === "image") handleImageUrl();
    else if (id === "video") handleVideo();
    else if (id === "code") insertBlock("```js\n// Viet code mau o day\nconsole.log(\"Hello IT Blog\");\n```");
    else if (id === "quote") applyListPrefix("quote");
    else if (id === "ul") applyListPrefix("ul");
    else if (id === "ol") applyListPrefix("ol");
    else if (id === "hr") insertBlock("---");
    else if (id === "step") insertBlock("## Buoc 1: ghi ten buoc o day\n\nMo ta ngan gon viec can lam (1-2 cau).\n\n![Minh hoa buoc 1](https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80)\n\n> Meo: ghi loi khuyen giup nguoi doc tranh loi sai pho bien.");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-t-xl border border-b-0 border-base-300 bg-base-200/70">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            onClick={() => handleTool(t.id)}
            className="btn btn-xs sm:btn-sm btn-ghost border border-transparent hover:border-primary/40 hover:bg-primary/10 font-bold min-w-9"
          >
            <span className={t.cls || ""}>{t.icon}</span>
          </button>
        ))}
        <button
          type="button"
          title="Tai anh tu may tinh (luu gon trong trinh duyet, khong tran chu)"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn btn-xs sm:btn-sm btn-outline btn-primary gap-1 ml-auto"
        >
          {uploading ? "Dang tai..." : "Tai anh"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleImageFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <div className="px-3 py-1.5 border border-x border-base-300 bg-base-200/40 text-[11px] text-base-content/60">
        Boi den nhieu dong roi bam 1,2,3 de danh so tu 1 — dong co moc thoi gian (0:00...) van duoc giu nguyen. H1-H3 len Muc luc.
      </div>
    </div>
  );
}

