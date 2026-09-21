-- ============================================================
-- IT Blog Database | PostgreSQL 18
-- Database: it_blog
-- Owner: postgres / password: 123456
-- Chay bang: psql -h localhost -U postgres -d postgres -f schema.sql
-- Khong can cai them goi npm nao ca (chi dung psql co san)
-- ============================================================

-- Xoa table cu neu chay lai (thu tu do khoa ngoai)
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS post_bookmarks CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS post_tags CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------- USERS (map voi src/data/seedData.js SEED_USERS) ----------
CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
    role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'manager', 'admin')),
  avatar     TEXT,
  bio        TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quan he follow: follower_id follow following_id
CREATE TABLE follows (
  follower_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- ---------- POSTS (map voi SEED_POSTS + BlogContext) ----------
CREATE TABLE posts (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  excerpt    TEXT DEFAULT '',
  content    TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  category   TEXT NOT NULL DEFAULT 'Frontend',
  author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  views      INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  read_time  TEXT DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'approved'
             CHECK (status IN ('approved', 'pending', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- Tags: moi post nhieu tag
CREATE TABLE post_tags (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY (post_id, tag)
);
CREATE INDEX idx_post_tags_tag ON post_tags(tag);

-- Likes
CREATE TABLE post_likes (
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- Bookmarks (bai da luu)
CREATE TABLE post_bookmarks (
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- ---------- COMMENTS ----------
CREATE TABLE comments (
  id          TEXT PRIMARY KEY,
  post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name   TEXT NOT NULL DEFAULT '',
  user_avatar TEXT DEFAULT '',
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comments_post ON comments(post_id);
