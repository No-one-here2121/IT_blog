// API server IT Blog — Express + pg, KHONG ORM nang.
// Chay: npm run api (doc mat khau tu database/.env, mac dinh 123456)
import express from "express";
import cors from "cors";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import featuresRouter from "./routes-features.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

function readEnvFile() {
  const out = {};
  try {
    const p = path.join(here, "..", "database", ".env");
    if (fs.existsSync(p)) {
      for (const line of fs.readFileSync(p, "utf8").split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#") || t.startsWith("//")) continue;
        const i = t.indexOf("=");
        if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
      }
    }
  } catch { /* dung mac dinh */ }
  return out;
}

const f = readEnvFile();
const pool = new pg.Pool({
  host: process.env.DB_HOST || f.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || f.DB_PORT || 5432),
  database: process.env.DB_NAME || f.DB_NAME || "it_blog",
  user: process.env.DB_USER || f.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || f.DB_PASSWORD || "123456"
});

pool.on("error", (e) => console.error("[db] pool error:", e.message));

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use("/api", featuresRouter);

const slugify = (s) =>
  String(s || "bai-viet")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80) || ("bai-viet-" + Date.now().toString(36));

async function hydratePost(client, row) {
  const [tags, likes, bookmarks, comments] = await Promise.all([
    client.query("SELECT tag FROM post_tags WHERE post_id=$1", [row.id]),
    client.query("SELECT user_id FROM post_likes WHERE post_id=$1", [row.id]),
    client.query("SELECT user_id FROM post_bookmarks WHERE post_id=$1", [row.id]),
    client.query("SELECT * FROM comments WHERE post_id=$1 ORDER BY created_at ASC", [row.id])
  ]);
  return {
    ...row,
    tags: tags.rows.map((r) => r.tag),
    likes: likes.rows.map((r) => r.user_id),
    bookmarks: bookmarks.rows.map((r) => r.user_id),
    comments: comments.rows
  };
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM users ORDER BY created_at ASC");
    res.json({ users: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/users", async (req, res) => {
  const b = req.body || {};
  if (!b.id || !b.name || !b.email) {
    return res.status(400).json({ error: "Thieu id / name / email" });
  }
  try {
      await pool.query(
        "INSERT INTO users (id, name, email, role, avatar, bio, created_at) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, NOW())) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, role=EXCLUDED.role, avatar=EXCLUDED.avatar, bio=EXCLUDED.bio",
        [b.id, b.name, b.email, b.role || "user", b.avatar || null, b.bio || "", b.created_at || null]
    );
    if (Array.isArray(b.following)) {
      for (const fid of b.following) {
        await pool.query("INSERT INTO follows (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [b.id, fid]);
      }
    }
    const r = await pool.query("SELECT * FROM users WHERE id=$1", [b.id]);
    res.status(201).json({ user: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/posts", async (req, res) => {
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT * FROM posts ORDER BY created_at DESC");
    const posts = [];
    for (const row of r.rows) posts.push(await hydratePost(client, row));
    res.json({ posts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.post("/api/posts", async (req, res) => {
  const b = req.body || {};
  if (!b.title?.trim() || !b.content?.trim() || !b.author_id) {
    return res.status(400).json({ error: "Thieu title / content / author_id" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const id = b.id || ("post_" + Date.now().toString(36));
    let slug = b.slug || slugify(b.title);
    const dup = await client.query("SELECT 1 FROM posts WHERE slug=$1", [slug]);
    if (dup.rowCount) slug = slug + "-" + Date.now().toString(36);
    await client.query(
      "INSERT INTO posts (id, title, slug, excerpt, content, cover_image, category, author_id, views, read_time, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12, NOW()))",
      [id, b.title.trim(), slug, b.excerpt || "", b.content.trim(),
       b.cover_image || null, b.category || "Frontend", b.author_id,
       b.views || 0, b.read_time || "", b.status || "approved", b.created_at || null]
    );
    for (const t of b.tags || []) {
      await client.query("INSERT INTO post_tags (post_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, t]);
    }
    for (const u of b.likes || []) {
      await client.query("INSERT INTO post_likes (post_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, u]);
    }
    for (const u of b.bookmarks || []) {
      await client.query("INSERT INTO post_bookmarks (post_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, u]);
    }
    for (const c of b.comments || []) {
      await client.query(
        "INSERT INTO comments (id, post_id, user_id, user_name, user_avatar, content, created_at) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, NOW())) ON CONFLICT DO NOTHING",
        [c.id || ("cmt_" + Date.now().toString(36)), id, c.user_id,
         c.user_name || "", c.user_avatar || "", c.content, c.created_at || null]
      );
    }
    const row = (await client.query("SELECT * FROM posts WHERE id=$1", [id])).rows[0];
    const post = await hydratePost(client, row);
    await client.query("COMMIT");
    res.status(201).json({ post });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.put("/api/posts/:id", async (req, res) => {
  const id = req.params.id;
  const b = req.body || {};
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE posts SET title=COALESCE($2,title), excerpt=COALESCE($3,excerpt), content=COALESCE($4,content), cover_image=$5, category=COALESCE($6,category), status=COALESCE($7,status) WHERE id=$1",
      [id, b.title, b.excerpt, b.content, b.cover_image || null, b.category, b.status]
    );
    if (Array.isArray(b.tags)) {
      await client.query("DELETE FROM post_tags WHERE post_id=$1", [id]);
      for (const t of b.tags) {
        await client.query("INSERT INTO post_tags (post_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING", [id, t]);
      }
    }
    const found = await client.query("SELECT * FROM posts WHERE id=$1", [id]);
    if (!found.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Khong tim thay bai viet" });
    }
    const post = await hydratePost(client, found.rows[0]);
    await client.query("COMMIT");
    res.json({ post });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.post("/api/posts/:id/view", async (req, res) => {
  try {
    const r = await pool.query(
      "UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id=$1 RETURNING views",
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Khong tim thay bai viet" });
    res.json({ views: r.rows[0].views });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/posts/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM posts WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = Number(process.env.API_PORT || 4000);
app.listen(PORT, () => {
  console.log("[api] IT Blog API: http://localhost:" + PORT + " (health: /api/health)");
});
