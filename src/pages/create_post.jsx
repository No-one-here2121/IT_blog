import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useBlog } from "../context/BlogContext";
import { CATEGORIES } from "../data/seedData";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";
import MarkdownRenderer, { MarkdownImage } from "../components/MarkdownRenderer";
import TableOfContents from "../components/TableOfContents";
import RichEditorToolbar from "../components/RichEditorToolbar";

const DRAFT_KEY = "it_blog_post_draft";

const CODE_TEMPLATES = [
  {
    name: "⚛️ React 19 Component",
    snippet: `\`\`\`tsx
import React, { useState, useEffect } from 'react';

interface Props {
  title: string;
  initialCount?: number;
}

export const CounterComponent: React.FC<Props> = ({ title, initialCount = 0 }) => {
  const [count, setCount] = useState<number>(initialCount);

  useEffect(() => {
    console.log(\`[Counter] Updated to: \${count}\`);
  }, [count]);

  return (
    <div className="p-4 rounded-xl border border-base-300 bg-base-100">
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm opacity-70">Count: {count}</p>
      <button 
        onClick={() => setCount((c) => c + 1)}
        className="btn btn-sm btn-primary mt-2"
      >
        Tăng giá trị (+)
      </button>
    </div>
  );
};

export default CounterComponent;
\`\`\`
`
  },
  {
    name: "⚡ FastAPI Async Router",
    snippet: `\`\`\`python
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import List, Optional

router = APIRouter(prefix="/api/v1/items", tags=["Items"])

class ItemCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = None
    price: float = Field(..., gt=0)

class ItemResponse(ItemCreate):
    id: int

@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(payload: ItemCreate):
    """
    Tạo mới một bản ghi Item trong hệ thống bất đồng bộ.
    """
    return {**payload.model_dump(), "id": 1}
\`\`\`
`
  },
  {
    name: "🐳 Dockerfile Multi-Stage",
    snippet: `\`\`\`dockerfile
# Stage 1: Build Application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
\`\`\`
`
  },
  {
    name: "🗄️ PostgreSQL DDL Schema",
    snippet: `\`\`\`sql
-- Tạo bảng Users và Posts chuẩn tối ưu Index
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS technical_posts (
    id SERIAL PRIMARY KEY,
    author_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    views INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON technical_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON technical_posts(created_at DESC);
\`\`\`
`
  },
  {
    name: "🚀 GitHub Actions CI/CD",
    snippet: `\`\`\`yaml
name: Continuous Integration (CI)

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run ESLint Linter
        run: npx eslint src/

      - name: Build Production Bundle
        run: npm run build
\`\`\`
`
  }
];

export default function CreatePostPage({ editPostData, onNavigate, onPostCreated }) {
  const { currentUser } = useAuth();
  const { createPost, updatePost } = useBlog();

  const isEditing = !!editPostData;

  const savedDraft = !isEditing
    ? (() => {
        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })()
    : null;

  const [activeTab, setActiveTab] = useState("editor"); // 'editor' | 'preview'
  const [title, setTitle] = useState(editPostData?.title || savedDraft?.title || "");
  const [category, setCategory] = useState(editPostData?.category || savedDraft?.category || "Frontend");
  const [tagsString, setTagsString] = useState(
    editPostData?.tags ? editPostData.tags.join(", ") : (savedDraft?.tagsString || "")
  );
  const [coverImage, setCoverImage] = useState(editPostData?.coverImage || savedDraft?.coverImage || "");
  const [excerpt, setExcerpt] = useState(editPostData?.excerpt || savedDraft?.excerpt || "");
  const [content, setContent] = useState(editPostData?.content || savedDraft?.content || "");
  const contentRef = useRef(null);
  const coverFileRef = useRef(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [techStackVersion, setTechStackVersion] = useState(
    editPostData?.techStackVersion || editPostData?.tech_stack_version || savedDraft?.techStackVersion || ""
  );
  const [scheduledAt, setScheduledAt] = useState(() => {
    const raw = editPostData?.scheduledAt || editPostData?.scheduled_at;
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 16);
    }
    return savedDraft?.scheduledAt || "";
  });
  const [changeSummary, setChangeSummary] = useState("");
  const [isDeprecated, setIsDeprecated] = useState(
    Boolean(editPostData?.isDeprecated || editPostData?.is_deprecated || savedDraft?.isDeprecated)
  );
  const [deprecatedWarning, setDeprecatedWarning] = useState(
    editPostData?.deprecatedWarning || editPostData?.deprecated_warning || savedDraft?.deprecatedWarning || ""
  );
  const [lastDraftSavedTime, setLastDraftSavedTime] = useState(() => {
    if (savedDraft?.updatedAt) {
      const d = new Date(savedDraft.updatedAt);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  });
  const { addToast } = useToast();

  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const res = await api.uploads.uploadImage(file);
      if (res?.url) {
        setCoverImage(res.url);
        addToast("Tải ảnh bìa lên máy chủ thành công! 🖼️", "success");
      }
    } catch {
      // Fallback: Read as Data URL
      const reader = new FileReader();
      reader.onload = () => {
        setCoverImage(reader.result);
        addToast("Đã nạp ảnh bìa cục bộ thành công! 🖼️", "success");
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingCover(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  const [showAiOptimizer, setShowAiOptimizer] = useState(false);
  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [aiOptimizationResult, setAiOptimizationResult] = useState(null);

  const handleAiOptimize = async () => {
    if (!title.trim() && !content.trim()) {
      addToast("Vui lòng nhập tiêu đề hoặc nội dung bài viết để AI phân tích và tối ưu!", "warning");
      return;
    }
    setShowAiOptimizer(true);
    setAiOptimizing(true);
    try {
      const res = await api.ai.optimizePost({
        title: title.trim() || "Bài viết công nghệ thông tin",
        content: content.trim() || "Nội dung kỹ thuật phần mềm và giải pháp lập trình."
      });
      setAiOptimizationResult(res);
      addToast("AI đã hoàn thành phân tích và đề xuất tối ưu bài viết! ✨", "success");
    } catch {
      // Fallback
      setAiOptimizationResult({
        suggested_titles: [
          `Hướng dẫn Thực chiến: ${title || "Kỹ thuật Lập trình"} 2026`,
          `Làm chủ ${title || "Công nghệ Mới"}: Từ Nền tảng đến Triển khai`,
          `Tối ưu hóa và Các phương pháp Tốt nhất khi áp dụng ${title || "Kiến trúc IT"}`
        ],
        seo_title: `${title || "Kỹ thuật Lập trình"} | IT Blog Developer`,
        meta_description: content ? content.slice(0, 160) + "..." : `Khám phá các phương pháp tốt nhất và kinh nghiệm thực chiến về ${title}.`,
        suggested_tags: ["Architecture", "Performance", "BestPractices", category],
        suggested_category: category || "Backend"
      });
      addToast("Đã tạo đề xuất tối ưu bài viết mẫu! ✨", "info");
    } finally {
      setAiOptimizing(false);
    }
  };

  // Tự động lưu bản nháp vào LocalStorage sau 1s ngừng gõ
  useEffect(() => {
    if (isEditing) return;
    const hasData = title.trim() || content.trim() || excerpt.trim();
    if (!hasData) return;

    const timer = setTimeout(() => {
      try {
        const draft = {
          title,
          category,
          tagsString,
          coverImage,
          excerpt,
          content,
          techStackVersion,
          scheduledAt,
          isDeprecated,
          deprecatedWarning,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setLastDraftSavedTime(new Date());
      } catch (err) {
        console.warn("Lỗi lưu nháp:", err);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, category, tagsString, coverImage, excerpt, content, techStackVersion, scheduledAt, isDeprecated, deprecatedWarning, isEditing]);

  const markdownFileRef = useRef(null);

  // Nhập tệp Markdown từ máy tính (Obsidian / VS Code / Typora)
  const handleImportMarkdownFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target.result || "");
        // Phân tích YAML Frontmatter nếu có
        const frontmatterMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
        if (frontmatterMatch) {
          const yaml = frontmatterMatch[1];
          const body = frontmatterMatch[2];

          const titleMatch = yaml.match(/^title:\s*["']?(.*?)["']?$/m);
          if (titleMatch && titleMatch[1]) setTitle(titleMatch[1].trim());

          const catMatch = yaml.match(/^category:\s*["']?(.*?)["']?$/m);
          if (catMatch && catMatch[1]) setCategory(catMatch[1].trim());

          const tagsMatch = yaml.match(/^tags:\s*\[(.*?)\]/m) || yaml.match(/^tags:\s*(.*)$/m);
          if (tagsMatch && tagsMatch[1]) {
            const rawTags = tagsMatch[1].replace(/["']/g, "").trim();
            setTagsString(rawTags);
          }

          const versionMatch = yaml.match(/^tech_stack_version:\s*["']?(.*?)["']?$/m) || yaml.match(/^techStackVersion:\s*["']?(.*?)["']?$/m);
          if (versionMatch && versionMatch[1]) setTechStackVersion(versionMatch[1].trim());

          const excerptMatch = yaml.match(/^excerpt:\s*["']?(.*?)["']?$/m);
          if (excerptMatch && excerptMatch[1]) setExcerpt(excerptMatch[1].trim());

          setContent(body.trim());
          addToast("Đã nhập bài viết và trích xuất thông tin Frontmatter thành công! 📄", "success");
        } else {
          // Nếu không có Frontmatter: lấy dòng # Heading đầu tiên làm tiêu đề
          const headingMatch = text.match(/^#\s+(.+)$/m);
          if (headingMatch && headingMatch[1]) {
            setTitle(headingMatch[1].trim());
            const restContent = text.replace(/^#\s+.+$/m, "").trim();
            setContent(restContent);
          } else {
            setContent(text);
          }
          addToast("Đã nạp toàn bộ nội dung từ tệp Markdown! 📄", "success");
        }
      } catch (err) {
        console.warn("Lỗi đọc Markdown:", err);
        addToast("Không thể đọc tệp Markdown này.", "error");
      } finally {
        if (markdownFileRef.current) markdownFileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Lưu bản nháp thủ công
  const handleSaveDraftManually = () => {
    try {
      const draft = {
        title,
        category,
        tagsString,
        coverImage,
        excerpt,
        content,
        techStackVersion,
        scheduledAt,
        isDeprecated,
        deprecatedWarning,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setLastDraftSavedTime(new Date());
      addToast("Đã lưu bản nháp thành công vào trình duyệt! 💾", "success");
    } catch {
      addToast("Không thể lưu bản nháp vào bộ nhớ cục bộ.", "error");
    }
  };

  // Xuất bản nháp ra tệp Markdown (.md) kèm Frontmatter
  const handleExportMarkdownDraft = () => {
    if (!title.trim() && !content.trim()) {
      addToast("Chưa có nội dung bài viết để xuất file Markdown! ℹ️", "info");
      return;
    }

    const tagsArray = tagsString
      ? tagsString.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const tagsYaml = tagsArray.length > 0 ? `[${tagsArray.map((t) => `"${t}"`).join(", ")}]` : "[]";

    const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
category: "${category || "Chưa phân loại"}"
tags: ${tagsYaml}
tech_stack_version: "${techStackVersion || "latest"}"
excerpt: "${(excerpt || "").replace(/"/g, '\\"')}"
created_at: "${new Date().toISOString()}"
author: "${currentUser?.name || "Tác giả IT Blog"}"
is_deprecated: ${Boolean(isDeprecated)}
---

# ${title || "Bài viết không có tiêu đề"}

${content}
`;

    const blob = new Blob([frontmatter], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = (title || "bai-viet")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40);
    a.href = url;
    a.download = `${safeTitle || "post-draft"}-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast("Đã tải xuống bài viết định dạng Markdown (.md) kèm Frontmatter! 📥", "success");
  };

  const handleClearDraft = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bản nháp và làm mới trình soạn thảo?")) {
      try {
        localStorage.removeItem(DRAFT_KEY);
        setTitle("");
        setExcerpt("");
        setContent("");
        setCoverImage("");
        setTagsString("");
        setTechStackVersion("");
        setScheduledAt("");
        setIsDeprecated(false);
        setDeprecatedWarning("");
        setLastDraftSavedTime(null);
        addToast("Đã xóa bản nháp thành công! 🗑️", "info");
      } catch {
        // ignore
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-base-100 rounded-3xl border border-base-300 shadow-lg text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl">
          ✍️
        </div>
        <h2 className="text-2xl font-black text-base-content">Đăng nhập để tạo bài viết</h2>
        <p className="text-sm text-base-content/70">
          Bạn cần có tài khoản để đăng tải bài viết chia sẻ kiến thức trên IT Blog.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => onNavigate("login")}
            className="btn btn-primary btn-sm rounded-full text-white font-bold"
          >
            Đăng nhập ngay
          </button>
          <button
            onClick={() => onNavigate("home")}
            className="btn btn-ghost btn-sm rounded-full"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (submitStatus = "approved") => {
    if (!title.trim() || !content.trim()) return;

    // Chuẩn hóa tags
    const tags = tagsString
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const postData = {
      title: title.trim(),
      category,
      tags: tags.length > 0 ? tags : ["IT"],
      coverImage: coverImage.trim() || undefined,
      excerpt: excerpt.trim() || title.trim(),
      content: content.trim(),
      status: submitStatus,
      techStackVersion: techStackVersion.trim() || undefined,
      scheduledAt: (() => {
        if (!scheduledAt) return undefined;
        const d = new Date(scheduledAt);
        return !isNaN(d.getTime()) ? d.toISOString() : undefined;
      })(),
      changeSummary: changeSummary.trim() || undefined,
      isDeprecated,
      deprecatedWarning: deprecatedWarning.trim() || undefined
    };

    if (isEditing) {
      updatePost(editPostData.id, postData);
      if (onPostCreated) onPostCreated(editPostData.id);
      onNavigate("post_detail");
    } else {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      const newPost = createPost(postData);
      if (submitStatus === "pending") {
        onNavigate("moderation");
      } else if (newPost && onPostCreated) {
        onPostCreated(newPost.id);
        onNavigate("post_detail");
      } else {
        onNavigate("home");
      }
    }
  };

  const parsedTags = tagsString
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Danh sach anh dang co trong noi dung (de hien thumbnail xem truoc nhanh)
  const bodyImages = (content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [])
    .map((raw) => {
      const m = raw.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      return m ? { alt: m[1], src: m[2] } : null;
    })
    .filter(Boolean);

  // Thống kê độ dài & thời lượng đọc trực tiếp
  const contentMetrics = (() => {
    const trimmed = (content || "").trim();
    if (!trimmed) return { words: 0, chars: 0, readingTimeMinutes: 0 };
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const chars = trimmed.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readingTimeMinutes };
  })();

  const insertImageMarkdown = (alt, url) => {
    const textarea = contentRef.current;
    const md = `![${alt}](${url})\n`;
    if (!textarea) {
      setContent((prev) => prev + "\n" + md);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    setContent(`${before}\n${md}\n${after}`);
  };

  const handleInsertTemplate = (snippet) => {
    const textarea = contentRef.current;
    if (!textarea) {
      setContent((prev) => prev + "\n\n" + snippet);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const newContent = `${before}\n\n${snippet}\n\n${after}`;
    setContent(newContent);
    addToast("Đã chèn mẫu mã nguồn thành công! 💻", "success");
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + snippet.length + 4;
    }, 50);
  };

  const handleTextareaDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length === 0) return;

    for (const file of files) {
      addToast(`Đang tải ảnh "${file.name}"...`, "info");
      try {
        const res = await api.uploads.uploadImage(file);
        const imgUrl = res?.url || URL.createObjectURL(file);
        insertImageMarkdown(file.name.replace(/\.[^/.]+$/, ""), imgUrl);
        addToast(`Đã chèn ảnh "${file.name}" vào bài viết! 🖼️`, "success");
      } catch {
        const reader = new FileReader();
        reader.onload = () => {
          insertImageMarkdown(file.name.replace(/\.[^/.]+$/, ""), reader.result);
          addToast(`Đã nạp ảnh "${file.name}" thành công! 🖼️`, "success");
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleTextareaPaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    e.preventDefault();
    addToast("Đang nạp ảnh chụp màn hình từ Clipboard...", "info");
    try {
      const res = await api.uploads.uploadImage(file);
      const imgUrl = res?.url || URL.createObjectURL(file);
      insertImageMarkdown("clipboard_image", imgUrl);
      addToast("Đã dán ảnh thành công! 🖼️", "success");
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        insertImageMarkdown("clipboard_image", reader.result);
        addToast("Đã nạp ảnh chụp màn hình thành công! 🖼️", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onNavigate("home")}
            className="btn btn-sm btn-ghost gap-1 text-xs"
          >
            ← Về trang chủ
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-base-content !my-0">
            {isEditing ? "Chỉnh sửa bài viết" : "Tạo & Quản lý bài viết"}
          </h1>
          {lastDraftSavedTime && !isEditing && (
            <div className="flex items-center gap-2 text-xs text-base-content/70 bg-base-200/90 px-3 py-1 rounded-full border border-base-300">
              <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse"></span>
              <span>Đã lưu nháp {!isNaN(lastDraftSavedTime.getTime()) ? lastDraftSavedTime.toLocaleTimeString("vi-VN") : "vừa xong"}</span>
              <button
                type="button"
                onClick={handleClearDraft}
                className="hover:text-error ml-1 font-semibold underline cursor-pointer"
                title="Xóa bản nháp này"
              >
                Xóa nháp
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Nhập tệp Markdown từ máy tính */}
          <input
            type="file"
            ref={markdownFileRef}
            accept=".md,.markdown,.txt"
            className="hidden"
            onChange={handleImportMarkdownFile}
          />
          <button
            type="button"
            onClick={() => markdownFileRef.current && markdownFileRef.current.click()}
            className="btn btn-sm btn-outline btn-ghost font-semibold gap-1.5 rounded-xl text-xs hover:text-primary hover:border-primary"
            title="Nhập tệp Markdown (.md) từ máy tính (Obsidian, VS Code...)"
          >
            <span>📂</span>
            <span className="hidden sm:inline">Nhập .md</span>
          </button>
          <button
            type="button"
            onClick={handleExportMarkdownDraft}
            className="btn btn-sm btn-outline btn-ghost font-semibold gap-1.5 rounded-xl text-xs hover:text-primary hover:border-primary"
            title="Tải bài viết về máy định dạng Markdown (.md) tương thích Obsidian / VS Code"
          >
            <span>📥</span>
            <span className="hidden sm:inline">Xuất .md</span>
          </button>

          {!isEditing && (
            <button
              type="button"
              onClick={handleSaveDraftManually}
              className="btn btn-sm btn-outline btn-ghost font-semibold gap-1.5 rounded-xl text-xs hover:text-success hover:border-success"
              title="Lưu bản nháp ngay lập tức vào trình duyệt"
            >
              <span>💾</span>
              <span className="hidden sm:inline">Lưu nháp</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAiOptimize}
            className="btn btn-sm btn-outline btn-primary font-bold gap-1.5 rounded-xl shadow-2xs text-xs"
            title="Tự động tối ưu tiêu đề, SEO, gợi ý tags và chuyên mục bằng Gemini AI"
          >
            <span>✨</span>
            <span className="hidden sm:inline">AI Tối ưu bài viết</span>
          </button>

          {/* Tab chuyển đổi Soạn thảo / Xem trước */}
          <div className="tabs tabs-boxed p-1 bg-base-200">
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`tab tab-sm font-semibold transition-all ${
                activeTab === "editor" ? "tab-active bg-primary text-white font-bold" : ""
              }`}
            >
              ✏️ Soạn thảo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`tab tab-sm font-semibold transition-all ${
                activeTab === "preview" ? "tab-active bg-primary text-white font-bold" : ""
              }`}
            >
              👁️ Xem trước
            </button>
          </div>
        </div>
      </div>

      {activeTab === "editor" ? (
        /* Tab 1: Form Soạn thảo */
        <div className="bg-base-100 rounded-3xl border border-base-300 p-6 sm:p-10 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit("approved");
            }}
            className="space-y-5"
          >
            {/* Tiêu đề */}
            <div>
              <label className="label font-bold text-xs text-base-content/80 pb-1">
                Tiêu đề bài viết <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Tối ưu hiệu năng React 19 với Compiler mới"
                className="input input-bordered w-full text-base font-bold focus:input-primary"
                required
              />
            </div>

            {/* Hàng 2 cột: Chuyên mục & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Chuyên mục <span className="text-error">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="select select-bordered w-full text-sm font-semibold focus:select-primary"
                >
                  {CATEGORIES.filter((c) => c !== "Tất cả").map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Thẻ tags (cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={tagsString}
                  onChange={(e) => setTagsString(e.target.value)}
                  placeholder="React, Frontend, Web..."
                  className="input input-bordered w-full text-sm focus:input-primary"
                />
                {parsedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {parsedTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const remaining = parsedTags.filter((_, i) => i !== idx);
                            setTagsString(remaining.join(", "));
                          }}
                          className="hover:text-error ml-0.5 text-xs font-bold leading-none cursor-pointer"
                          title={`Xóa tag ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Hàng 2 cột: Phiên bản Tech Stack & Hẹn giờ xuất bản */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Phiên bản Tech Stack (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={techStackVersion}
                  onChange={(e) => setTechStackVersion(e.target.value)}
                  placeholder="VD: React 19 / Vite 6, FastAPI 0.115 / Python 3.12..."
                  className="input input-bordered w-full text-sm focus:input-primary"
                />
              </div>

              <div>
                <label className="label font-bold text-xs text-base-content/80 pb-1">
                  Hẹn giờ xuất bản (Tùy chọn)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="input input-bordered w-full text-sm focus:input-primary"
                />
              </div>
            </div>

            {/* Chỉnh sửa nâng cao: Ghi chú bản sửa đổi & Cảnh báo lỗi thời */}
            {isEditing && (
              <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300 space-y-3">
                <div>
                  <label className="label font-bold text-xs text-base-content/80 pb-1">
                    Ghi chú bản sửa đổi (Change Summary - Lưu vào lịch sử phiên bản)
                  </label>
                  <input
                    type="text"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="VD: Cập nhật cú pháp React 19 useActionState và bổ sung mã mẫu..."
                    className="input input-bordered w-full text-xs focus:input-primary"
                  />
                  <p className="text-[11px] text-base-content/50 mt-1">
                    Ghi chú này sẽ được lưu lại trong lịch sử chỉnh sửa để độc giả theo dõi sự phát triển của bài viết.
                  </p>
                </div>

                <div className="pt-2 border-t border-base-300/60">
                  <label className="label cursor-pointer justify-start gap-2.5 p-0 mb-2">
                    <input
                      type="checkbox"
                      checked={isDeprecated}
                      onChange={(e) => setIsDeprecated(e.target.checked)}
                      className="checkbox checkbox-warning checkbox-sm"
                    />
                    <span className="label-text text-xs font-bold text-amber-700 dark:text-amber-300">
                      ⚠️ Đánh dấu bài viết này đã cũ / lỗi thời (Deprecated Warning)
                    </span>
                  </label>

                  {isDeprecated && (
                    <input
                      type="text"
                      value={deprecatedWarning}
                      onChange={(e) => setDeprecatedWarning(e.target.value)}
                      placeholder="VD: CẢNH BÁO: Bài viết này sử dụng các kỹ thuật cũ, có thể không còn tương thích..."
                      className="input input-bordered input-sm w-full text-xs text-amber-700 dark:text-amber-300 focus:input-warning"
                    />
                  )}
                </div>
              </div>
            )}

            {/* URL & Tải Ảnh bìa */}
            <div>
              <div className="flex items-center justify-between pb-1">
                <label className="label font-bold text-xs text-base-content/80 p-0">
                  Ảnh bìa bài viết (Tùy chọn)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={coverFileRef}
                    onChange={handleCoverFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverFileRef.current?.click()}
                    disabled={uploadingCover}
                    className="btn btn-xs btn-outline btn-primary font-bold gap-1 rounded-lg"
                  >
                    {uploadingCover ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <span>📁</span>
                    )}
                    <span>{uploadingCover ? "Đang tải ảnh..." : "Tải ảnh từ máy tính"}</span>
                  </button>
                  {coverImage && (
                    <button
                      type="button"
                      onClick={() => setCoverImage("")}
                      className="text-[11px] text-error font-semibold hover:underline"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>
              </div>
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="Dán link ảnh (https://...) hoặc bấm 'Tải ảnh từ máy tính'..."
                className="input input-bordered w-full text-xs focus:input-primary"
              />
              {coverImage && (
                <div className="mt-2.5 relative w-36 h-20 rounded-xl overflow-hidden border border-base-300 bg-base-200 shadow-2xs">
                  <img
                    src={coverImage}
                    alt="Xem trước ảnh bìa"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80";
                    }}
                  />
                </div>
              )}
            </div>

            {/* Tóm tắt */}
            <div>
              <label className="label font-bold text-xs text-base-content/80 pb-1">
                Tóm tắt ngắn (Excerpt)
              </label>
              <input
                type="text"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="1 - 2 câu tóm tắt nội dung chính để hiển thị trên thẻ bài viết..."
                className="input input-bordered w-full text-sm focus:input-primary"
              />
            </div>

            {/* Nội dung chi tiết */}
            <div>
              <div className="flex items-center justify-between pb-1">
                <label className="label font-bold text-xs text-base-content/80 p-0">
                  Nội dung bài viết <span className="text-error">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowGuide((v) => !v)}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  {showGuide ? "Ẩn hướng dẫn chèn ảnh / video" : "Hướng dẫn chèn ảnh / video / bước HD"}
                </button>
              </div>
              {showGuide && (
                <div className="mb-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-[11px] sm:text-xs text-base-content/80 space-y-1.5 leading-relaxed">
                  <p><b>1. Bôi đen để định dạng:</b> bôi đen chữ rồi bấm <b>B / I</b>; bôi đen cả dòng rồi bấm <b>H1 / H2 / H3</b>.</p>
                  <p><b>2. Mục lục tự động:</b> mọi tiêu đề H1-H3 đều hiển thị trên mục lục ở tab Xem trước và trang đọc bài.</p>
                  <p><b>3. Chèn ảnh:</b> bấm nút <b>Ảnh</b> rồi dán URL, hoặc bấm <b>Tải ảnh</b> để lấy ảnh từ máy tính (tự động chèn vào bài).</p>
                  <p><b>4. Chèn video:</b> bấm nút <b>Video</b> rồi dán link YouTube hoặc MP4. Ví dụ lưu trong bài:</p>
                  <code className="block font-mono bg-base-100 border border-base-300 rounded-lg px-2 py-1.5">:::video https://www.youtube.com/watch?v=abc123</code>
                  <p><b>5. Bài hướng dẫn từng bước:</b> bấm nút <b>Bước HD</b> để chèn mẫu “tiêu đề bước + mô tả + ảnh + mẹo”, rồi sửa lại nội dung.</p>
                </div>
              )}
              <RichEditorToolbar textareaRef={contentRef} value={content} onChange={setContent} />
              
              {/* Mẫu Code Kỹ Thuật (Boilerplate Code Templates) */}
              <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-base-200/40 border-x border-base-300 scrollbar-none text-xs">
                <span className="text-[11px] font-bold text-base-content/60 shrink-0">⚡ Mẫu code:</span>
                {CODE_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleInsertTemplate(tpl.snippet)}
                    className="btn btn-xs btn-outline btn-ghost hover:bg-primary hover:text-white hover:border-primary text-[11px] font-semibold rounded-lg shrink-0 whitespace-nowrap"
                    title={`Chèn mẫu mã nguồn ${tpl.name}`}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>

              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onDrop={handleTextareaDrop}
                onPaste={handleTextareaPaste}
                onDragOver={(e) => e.preventDefault()}
                placeholder="Soạn thảo nội dung bài viết... Dùng thanh công cụ phía trên để chèn ảnh, video, code, bước hướng dẫn hoặc kéo thả ảnh trực tiếp..."
                rows={12}
                className="textarea textarea-bordered w-full !rounded-none text-sm font-mono focus:textarea-primary leading-relaxed"
                required
              />

              {/* Thanh thống kê trực tiếp: Số từ, ký tự, thời lượng đọc & Hỗ trợ kéo thả ảnh */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-base-content/60 px-3 py-2 bg-base-200/60 rounded-b-xl border-x border-b border-base-300">
                <div className="flex items-center gap-2.5 flex-wrap font-medium">
                  <span>📝 <strong>{contentMetrics.words}</strong> từ</span>
                  <span>•</span>
                  <span>🔤 <strong>{contentMetrics.chars}</strong> ký tự</span>
                  <span>•</span>
                  <span>⏱️ Ước tính: <strong>~{contentMetrics.readingTimeMinutes} phút đọc</strong></span>
                </div>
                <span className="text-[10px] text-base-content/40 italic">
                  💡 Kéo thả ảnh hoặc dán (Ctrl+V) ảnh chụp màn hình vào ô soạn thảo
                </span>
              </div>

              {/* Xem trước nhanh ảnh đã chèn trong bài (ảnh tải lên hiển thị ảnh thu nhỏ) */}
              {bodyImages.length > 0 && (
                <div className="mt-2 rounded-xl border border-base-300 bg-base-200/40 p-3">
                  <p className="text-[11px] font-bold text-base-content/60 mb-2">
                    Ảnh trong bài viết ({bodyImages.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {bodyImages.map((im, idx) => (
                      <div key={idx} className="w-24">
                        <MarkdownImage
                          src={im.src}
                          alt={im.alt}
                          className="w-24 h-20 rounded-lg border border-base-300 object-cover bg-base-100"
                        />
                        <p className="text-[10px] text-base-content/50 truncate mt-1" title={im.alt}>
                          {im.alt || "anh"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hàng nút hành động: Hủy, Xem trước, Gửi duyệt, Xuất bản ngay */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-base-200">
              <button
                type="button"
                onClick={() => onNavigate("home")}
                className="btn btn-sm btn-ghost text-xs"
              >
                Hủy bỏ
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className="btn btn-sm btn-outline gap-1 text-xs"
                >
                  👁️ Xem trước
                </button>

                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => handleSubmit("pending")}
                    className="btn btn-sm border border-amber-400/80 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 gap-1 text-xs font-bold transition-colors"
                  >
                    ⏳ Gửi chờ duyệt
                  </button>
                )}

                <button
                  type="submit"
                  className="btn btn-sm btn-primary text-white font-bold px-5 shadow-md hover:scale-105 active:scale-95 transition-all text-xs"
                >
                  {isEditing ? "Lưu thay đổi" : "✓ Xuất bản ngay"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* Tab 2: Chế độ Xem trước (Live Preview) */
        <div className="bg-base-100 rounded-3xl border border-base-300 p-6 sm:p-10 shadow-sm space-y-6 animate-fade-in">
          <div className="p-3 bg-primary/10 rounded-xl flex items-center justify-between text-xs text-primary font-medium">
            <span>👁️ Bạn đang ở chế độ Xem trước bài viết</span>
            <button
              onClick={() => setActiveTab("editor")}
              className="btn btn-xs btn-primary text-white font-bold"
            >
              Quay lại chỉnh sửa
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="badge badge-primary text-white font-bold text-xs">{category}</span>
            {parsedTags.map((t) => (
              <span
                key={t}
                className="badge badge-sm border border-base-300 bg-base-200/60 text-base-content/80 text-xs font-medium"
              >
                #{t}
              </span>
            ))}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-base-content !my-2">
            {title || "Tiêu đề bài viết sẽ hiển thị ở đây"}
          </h1>

          <div className="flex items-center gap-3 py-3 border-y border-base-200 text-xs text-base-content/60">
            <img
              src={currentUser?.avatar}
              alt={currentUser?.name}
              className="w-8 h-8 rounded-full border border-base-300 object-cover"
              onError={(e) => {
                e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser?.name || "dev")}`;
              }}
            />
            <div>
              <span className="font-bold text-base-content">{currentUser?.name}</span>
              <p className="text-[11px]">Vừa xong • 4 phút đọc</p>
            </div>
          </div>

          {excerpt && (
            <p className="text-sm italic text-base-content/70 border-l-4 border-primary pl-4 py-1 bg-base-200/40 rounded-r-lg">
              {excerpt}
            </p>
          )}

          <div className="py-2">
            {content ? (
              <MarkdownRenderer content={content} headingIdPrefix="preview-" />
            ) : (
              <p className="text-sm italic text-base-content/50">
                Nội dung bài viết sẽ hiển thị tại đây khi bạn soạn thảo...
              </p>
            )}
          </div>

          <TableOfContents content={content} headingIdPrefix="preview-" />

          <div className="pt-6 border-t border-base-200 flex justify-end gap-3">
            <button
              onClick={() => setActiveTab("editor")}
              className="btn btn-sm btn-outline text-xs"
            >
              ← Quay lại soạn thảo
            </button>
            <button
              onClick={() => handleSubmit("approved")}
              className="btn btn-sm btn-primary text-white font-bold text-xs"
            >
              ✓ Xác nhận xuất bản
            </button>
          </div>
        </div>
      )}

      {/* AI Post Optimizer Modal */}
      {showAiOptimizer && (
        <div
          className="modal modal-open bg-black/50 backdrop-blur-xs z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAiOptimizer(false); }}
        >
          <div className="modal-box max-w-2xl rounded-3xl p-6 bg-base-100 border border-base-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-base-200">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-lg font-bold shadow-xs">
                  ✨
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-base-content">AI Tối ưu bài viết (Gemini Optimizer)</h3>
                  <p className="text-[11px] text-base-content/60">Đề xuất tiêu đề thu hút, chuẩn hóa SEO và gợi ý thẻ tags chuyên sâu</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowAiOptimizer(false)} className="btn btn-sm btn-circle btn-ghost">✕</button>
            </div>

            {aiOptimizing ? (
              <div className="py-12 text-center space-y-3">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-sm font-semibold text-base-content/70">AI đang phân tích bài viết và tạo phương án tối ưu...</p>
              </div>
            ) : aiOptimizationResult ? (
              <div className="space-y-4 py-3 max-h-[70vh] overflow-y-auto">
                {/* 1. Gợi ý Tiêu đề */}
                <div>
                  <label className="text-xs font-bold text-base-content/80 block mb-2">
                    💡 Gợi ý tiêu đề thu hút độc giả (Bấm để áp dụng):
                  </label>
                  <div className="space-y-2">
                    {aiOptimizationResult.suggested_titles?.map((st, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setTitle(st);
                          addToast("Đã áp dụng tiêu đề mới! 📝", "info");
                        }}
                        className="p-3 rounded-xl border border-base-300 bg-base-200/40 hover:border-primary/60 hover:bg-primary/5 cursor-pointer transition-all flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-base-content"
                      >
                        <span>{st}</span>
                        <span className="btn btn-xs btn-primary text-white shrink-0">Chọn</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. SEO & Tóm tắt bài viết */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-base-content/80">
                      🔍 Tóm tắt & Meta Description SEO:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setExcerpt(aiOptimizationResult.meta_description || "");
                        addToast("Đã áp dụng tóm tắt bài viết!", "info");
                      }}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Áp dụng làm tóm tắt
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-base-200/50 border border-base-300 text-xs text-base-content/80 italic leading-relaxed">
                    {aiOptimizationResult.meta_description}
                  </div>
                </div>

                {/* 3. Gợi ý Chuyên mục & Thẻ Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl border border-base-300 bg-base-200/30">
                    <span className="text-xs font-bold text-base-content/70 block mb-1">Chuyên mục đề xuất:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCategory(aiOptimizationResult.suggested_category);
                        addToast(`Đã chọn chuyên mục: ${aiOptimizationResult.suggested_category}`, "info");
                      }}
                      className="badge badge-primary text-white font-bold text-xs cursor-pointer hover:scale-105 transition-transform"
                    >
                      {aiOptimizationResult.suggested_category} (Bấm chọn)
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-base-300 bg-base-200/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-base-content/70">Thẻ tags đề xuất:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const currentTags = tagsString.split(",").map(t => t.trim()).filter(Boolean);
                          const newTags = Array.from(new Set([...currentTags, ...(aiOptimizationResult.suggested_tags || [])]));
                          setTagsString(newTags.join(", "));
                          addToast("Đã thêm tags đề xuất vào bài viết!", "info");
                        }}
                        className="text-[11px] text-primary font-bold hover:underline"
                      >
                        Thêm tất cả
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {aiOptimizationResult.suggested_tags?.map((t, idx) => (
                        <span key={idx} className="badge badge-sm border border-base-300 bg-base-100 text-xs">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="modal-action border-t border-base-200 pt-3">
              <button
                type="button"
                onClick={() => setShowAiOptimizer(false)}
                className="btn btn-sm btn-primary text-white font-bold rounded-xl px-6"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
