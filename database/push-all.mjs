// Dong bo 1 chieu: day TOAN BO du lieu localStorage (users + posts) len
// database that it_blog. Giu nguyen id de khong vo link tac gia.
// CHI dung Node builtin (fetch, fs) + API server. Chay: node database/push-all.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = process.env.API_URL || "http://localhost:4000/api";

const j = async (p, opt) => {
  const r = await fetch(API + p, {
    headers: { "Content-Type": "application/json" },
    ...(opt || {})
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || ("loi " + r.status + " " + p));
  return d;
};

const here = path.dirname(fileURLToPath(import.meta.url));
const fp = path.join(here, "browser-export.json");
if (!fs.existsSync(fp)) {
  console.log("Chua co database/browser-export.json.");
  console.log("Mo web (npm run dev) -> F12 Console -> chay lenh trong database/README muc 6,");
  console.log("luu ket qua vao file nay roi chay lai.");
  process.exit(1);
}
const browser = JSON.parse(fs.readFileSync(fp, "utf8"));
const users = browser.users || [];
const posts = browser.posts || [];
console.log("Doc duoc " + users.length + " users, " + posts.length + " posts tu trinh duyet.");

// Them user thieu cho cac post co (tranh loi khoa ngoai author_id)
const apiUsers = (await j("/users")).users || [];
const have = new Set(apiUsers.map((u) => u.id));
for (const u of users) have.add(u.id);
for (const p of posts) {
  const aid = p.authorId || p.author_id;
  if (aid && !have.has(aid)) {
    users.push({
      id: aid,
      name: "Tac gia " + aid,
      email: aid + "@itblog.local",
      avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=" + encodeURIComponent(aid),
      bio: "",
      createdAt: p.createdAt || p.created_at || new Date().toISOString()
    });
    have.add(aid);
  }
}

// Day users truoc (giữ nguyên id + following), roi day posts.
for (const u of users) {
  try {
    await j("/users", {
      method: "POST",
      body: JSON.stringify({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || "user",
        avatar: u.avatar,
        bio: u.bio || "",
        created_at: u.createdAt || u.created_at,
        following: u.following || []
      })
    });
  } catch (e) {
    console.log("User " + u.id + " loi: " + e.message);
  }
}
console.log("Day xong users. Bat dau day posts...");

let ok = 0;
for (const p of posts) {
  const payload = {
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt || "",
    content: p.content || "",
    cover_image: p.coverImage || p.cover_image,
    category: p.category,
    tags: p.tags || [],
    author_id: p.authorId || p.author_id,
    views: p.views || 0,
    read_time: p.readTime || p.read_time || "",
    status: p.status || "approved",
    created_at: p.createdAt || p.created_at,
    likes: p.likes || [],
    bookmarks: p.bookmarks || [],
    comments: (p.comments || []).map((c) => ({
      id: c.id,
      user_id: c.userId || c.user_id,
      user_name: c.userName ?? c.user_name ?? "",
      user_avatar: c.userAvatar ?? c.user_avatar ?? "",
      content: c.content,
      created_at: c.createdAt || c.created_at
    }))
  };
  try {
    await j("/posts", { method: "POST", body: JSON.stringify(payload) });
    ok += 1;
  } catch (e) {
    console.log("Bo qua " + p.id + " (da co hoac loi): " + e.message);
  }
}
console.log("Day xong " + ok + "/" + posts.length + " posts len database that.");
console.log("Kiem tra: node database/verify.mjs");


