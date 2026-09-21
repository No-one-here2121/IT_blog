// Kiem tra ket noi + du lieu database it_blog.
// CHI dung Node builtin (child_process, fs) + psql.exe co san. KHONG cai them goi nao.
// Mat khau doc tu database/.env (neu co), mac dinh 123456. Chay: node database/verify.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PSQL = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";

function readEnvFile() {
  const out = {};
  try {
    const p = path.join(path.dirname(fileURLToPath(import.meta.url)), ".env");
    if (!fs.existsSync(p)) return out;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || t.startsWith("//")) continue;
      const i = t.indexOf("=");
      if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  } catch { /* bo qua, dung gia tri mac dinh */ }
  return out;
}

const f = readEnvFile();
const cfg = {
  host: process.env.DB_HOST || f.DB_HOST || "localhost",
  port: process.env.DB_PORT || f.DB_PORT || "5432",
  name: process.env.DB_NAME || f.DB_NAME || "it_blog",
  user: process.env.DB_USER || f.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || process.env.PGPASSWORD || f.DB_PASSWORD || "123456"
};


const env = { ...process.env, PGPASSWORD: cfg.password, PGCLIENTENCODING: "UTF8" };
const base = ["-h", cfg.host, "-U", cfg.user, "-p", String(cfg.port), "-d", cfg.name, "-v", "ON_ERROR_STOP=1"];

function q(label, sql) {
  try {
    const out = execFileSync(PSQL, [...base, "-c", sql], { env, encoding: "utf8", timeout: 15000 });
    console.log("=== " + label + " ===");
    console.log(out.trim());
  } catch (e) {
    console.log("!!! LOI [" + label + "]: " + (e.stdout || e.message));
  }
}

q("databases", "SELECT datname FROM pg_database ORDER BY 1;");
q("tables", "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1;");
q("users", "SELECT count(*) AS users FROM users;");
q("posts", "SELECT count(*) AS posts FROM posts;");
q("comments", "SELECT count(*) AS comments FROM comments;");
q("likes", "SELECT count(*) AS likes FROM post_likes;");
q("follows", "SELECT count(*) AS follows FROM follows;");
q("user_list", "SELECT id, email FROM users ORDER BY 1;");
