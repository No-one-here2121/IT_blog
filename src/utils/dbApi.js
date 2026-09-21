/**
 * Lop API goi backend PostgreSQL (server/api-server.mjs).
 * Frontend khong noi truc tiep toi Postgres (trinh duyet khong the giu
 * mat khau + mo transaction an toan) — moi du lieu di qua HTTP API.
 * Neu API chua chay thi tu dong fallback ve localStorage nhu cu.
 */
import { storage, STORAGE_KEYS } from "./storage";

const API_BASE = (import.meta.env?.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

async function req(path, options) {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...(options || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || "API loi " + res.status);
    error.status = res.status;
    throw error;
  }
  return data;
}

// ================= KHOA HOC =================
export const featureApi = {
  async listCourses() {
    return (await req("/courses")).courses || [];
  },
  async getCourse(id) {
    return await req("/courses/" + encodeURIComponent(id));
  },
  async createCourse(payload) {
    return await req("/courses", { method: "POST", body: JSON.stringify(payload) });
  },
  async updateCourse(id, payload) {
    return await req("/courses/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify(payload) });
  },
  async deleteCourse(id) {
    return await req("/courses/" + encodeURIComponent(id), { method: "DELETE" });
  },

  // ================= TRAC NGHIEM =================
  async getQuestions(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return await req("/quiz" + (qs ? "?" + qs : ""));
  },
  async generateQuiz(payload) {
    return await req("/quiz/generate", { method: "POST", body: JSON.stringify(payload) });
  },
  async deleteQuestion(id) {
    return await req("/quiz/" + encodeURIComponent(id), { method: "DELETE" });
  },

  // ================= VIEC LAM =================
  async listJobs() {
    return (await req("/jobs")).jobs || [];
  },
  async aiSearchJobs(q) {
    return await req("/jobs/ai-search", { method: "POST", body: JSON.stringify({ q }) });
  },
  async googleSearchJobs(q) {
    return await req("/jobs/google-search", { method: "POST", body: JSON.stringify({ q }) });
  },
  async submitJobApplication(jobId, payload) {
    return await req(`/jobs/${encodeURIComponent(jobId)}/apply`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  async createJob(payload) {
    return await req("/jobs", { method: "POST", body: JSON.stringify(payload) });
  }
};

export const apiEnabled = () =>
  (import.meta.env?.VITE_USE_API || "true") !== "false";

export const dbApi = {
  async listPosts() {
    const d = await req("/posts");
    return d.posts || [];
  },
  async listUsers() {
    const d = await req("/users");
    return d.users || [];
  },
  async createPost(payload) {
    const d = await req("/posts", { method: "POST", body: JSON.stringify(payload) });
    return d.post;
  },
  async updatePost(id, payload) {
    const d = await req("/posts/" + encodeURIComponent(id), {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    return d.post;
  },
  async deletePost(id) {
    await req("/posts/" + encodeURIComponent(id), { method: "DELETE" });
    return true;
  },
  async incrementView(id) {
    const d = await req("/posts/" + encodeURIComponent(id) + "/view", { method: "POST" });
    return d.views;
  }
};

/**
 * Chuyen doi post tu API (snake_case) sang shape frontend dang dung.
 */
export function fromApiPost(p) {
  if (!p) return p;
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt || "",
    content: p.content || "",
    coverImage: p.cover_image || p.coverImage,
    category: p.category,
    tags: p.tags || [],
    authorId: p.author_id || p.authorId,
    likes: p.likes || [],
    bookmarks: p.bookmarks || [],
    comments: (p.comments || []).map((c) => ({
      id: c.id,
      userId: c.user_id || c.userId,
      userName: c.user_name ?? c.userName ?? "",
      userAvatar: c.user_avatar ?? c.userAvatar ?? "",
      content: c.content,
      createdAt: c.created_at || c.createdAt
    })),
    views: p.views || 0,
    readTime: p.read_time || p.readTime || "",
    status: p.status || "approved",
    createdAt: p.created_at || p.createdAt
  };
}

/**
 * Chuyen doi post frontend sang payload API (snake_case).
 */
export function toApiPost(p) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt || "",
    content: p.content || "",
    cover_image: p.coverImage,
    category: p.category,
    tags: p.tags || [],
    author_id: p.authorId,
    views: p.views || 0,
    read_time: p.readTime || "",
    status: p.status || "approved",
    created_at: p.createdAt,
    likes: p.likes || [],
    bookmarks: p.bookmarks || [],
    comments: (p.comments || []).map((c) => ({
      id: c.id,
      user_id: c.userId,
      user_name: c.userName || "",
      user_avatar: c.userAvatar || "",
      content: c.content,
      created_at: c.createdAt
    }))
  };
}

export function cachePosts(posts) {
  try {
    storage.set(STORAGE_KEYS.POSTS, posts);
  } catch { /* bo qua */ }
}
