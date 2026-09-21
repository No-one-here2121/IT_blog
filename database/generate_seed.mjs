// Tao file seed.sql tu src/data/seedData.js -- CHI dung Node builtin (fs, url, path), KHONG cai them goi nao.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_USERS, SEED_POSTS } from "../src/data/seedData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const esc = (v) => {
  if (v === null || v === undefined) return "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
};
const escOpt = (v) => (v === null || v === undefined || v === "" ? "NULL" : esc(v));

let out = [];
out.push("-- Seed data tu dong sinh tu src/data/seedData.js");
out.push("-- Chay: psql -h localhost -U postgres -d it_blog -f seed.sql");
out.push("");

for (const u of SEED_USERS) {
  out.push(
     `INSERT INTO users (id, name, email, role, avatar, bio, created_at) VALUES (${esc(u.id)}, ${esc(u.name)}, ${esc(u.email)}, ${esc(u.role || "user")}, ${escOpt(u.avatar)}, ${escOpt(u.bio)}, ${esc(u.createdAt)}) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, role=EXCLUDED.role, avatar=EXCLUDED.avatar, bio=EXCLUDED.bio;`
  );
}
out.push("");
for (const u of SEED_USERS) {
  for (const f of u.following || []) {
    out.push(
      `INSERT INTO follows (follower_id, following_id) VALUES (${esc(u.id)}, ${esc(f)}) ON CONFLICT DO NOTHING;`
    );
  }
}
out.push("");

for (const p of SEED_POSTS) {
  out.push(
    `INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES (${esc(p.id)}, ${esc(p.title)}, ${esc(p.slug)}, ${escOpt(p.excerpt)}, ${esc(p.content)}, ${escOpt(p.coverImage)}, ${esc(p.category)}, ${esc(p.authorId)}, ${p.views || 0}, ${escOpt(p.readTime)}, ${esc(p.status || "approved")}, ${esc(p.createdAt)}) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content, cover_image=EXCLUDED.cover_image, category=EXCLUDED.category, author_id=EXCLUDED.author_id, views=EXCLUDED.views, read_time=EXCLUDED.read_time, status=EXCLUDED.status;`
  );
  for (const t of p.tags || []) {
    out.push(`INSERT INTO post_tags (post_id, tag) VALUES (${esc(p.id)}, ${esc(t)}) ON CONFLICT DO NOTHING;`);
  }
  for (const uid of p.likes || []) {
    out.push(`INSERT INTO post_likes (post_id, user_id) VALUES (${esc(p.id)}, ${esc(uid)}) ON CONFLICT DO NOTHING;`);
  }
  for (const uid of p.bookmarks || []) {
    out.push(`INSERT INTO post_bookmarks (post_id, user_id) VALUES (${esc(p.id)}, ${esc(uid)}) ON CONFLICT DO NOTHING;`);
  }
  for (const c of p.comments || []) {
    out.push(
      `INSERT INTO comments (id, post_id, user_id, user_name, user_avatar, content, created_at) VALUES (${esc(c.id)}, ${esc(p.id)}, ${esc(c.userId)}, ${esc(c.userName || "")}, ${escOpt(c.userAvatar)}, ${esc(c.content)}, ${esc(c.createdAt)}) ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content;`
    );
  }
  out.push("");
}

fs.writeFileSync(path.join(__dirname, "seed.sql"), out.join("\n"), "utf8");
console.log("OK: database/seed.sql da duoc tao (" + SEED_USERS.length + " users, " + SEED_POSTS.length + " posts)");
