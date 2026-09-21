-- ============================================================
-- IT Blog — Khoa hoc + Ngan hang cau hoi trac nghiem + Viec lam IT
-- Chay: psql -d it_blog -f database/seed_features.sql
-- Quan he: 1 cau hoi thuoc nhieu bai, 1 bai co nhieu cau hoi (M:N)
-- ============================================================

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  language TEXT NOT NULL DEFAULT 'C++',
  cover_image TEXT,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

  ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
  UPDATE users SET role = 'admin' WHERE id = 'demo_user';

-- Khoa hoc gom nhieu bai viet, nguoi quan tri xep thu tu bai hoc
CREATE TABLE IF NOT EXISTS course_posts (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  post_id  TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, post_id)
);

-- Ngan hang cau hoi trac nghiem (co the tao bang AI tu khoa hoc/bai viet)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  language TEXT DEFAULT '',
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  answer_index INTEGER NOT NULL CHECK (answer_index >= 0),
  explanation TEXT DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1 cau hoi thuoc nhieu bai, 1 bai co nhieu cau hoi (M:N)
CREATE TABLE IF NOT EXISTS quiz_question_posts (
  question_id TEXT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  post_id     TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, post_id)
);

-- ---------- VIEC LAM IT (thuc tap + fulltime) ----------
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT DEFAULT '',
  address TEXT DEFAULT '',
  apply_email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  job_type TEXT NOT NULL DEFAULT 'internship' CHECK (job_type IN ('internship','fulltime','parttime','remote')),
  tags TEXT[] DEFAULT '{}',
  salary TEXT DEFAULT '',
  link TEXT DEFAULT '',
  description TEXT DEFAULT '',
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS apply_email TEXT DEFAULT '';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  candidate_phone TEXT DEFAULT '',
  cv_name TEXT NOT NULL,
  cv_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Khong seed tin gia. Chi hien thi tin da duoc nhap kem URL tuyen dung that.
DELETE FROM jobs;


