// REST API mo rong: Khoa hoc, Ngan hang cau hoi trac nghiem (AI), Tim kiem viec lam (AI)
import { Router } from "express";
import pg from "pg";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { askGemini, askGeminiWithSearch, extractJson } from "./gemini.mjs";

try {
  const envPath = fileURLToPath(new URL("../database/.env", import.meta.url));
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    const separator = trimmed.indexOf("=");
    if (separator > 0 && !trimmed.startsWith("#")) {
      const key = trimmed.slice(0, separator).trim();
      if (!process.env[key]) process.env[key] = trimmed.slice(separator + 1).trim();
    }
  }
} catch { /* database/.env is optional */ }

const router = Router();
const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "it_blog",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "123456"
});

const nid = (p) => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ================= NGAN HANG CAU HOI =================
router.get("/quiz", async (req, res) => {
  const { course_id, post_id, language, limit } = req.query;
  try {
    let rows;
    if (post_id) {
      rows = await pool.query(
        "SELECT q.* FROM quiz_questions q JOIN quiz_question_posts qp ON qp.question_id = q.id WHERE qp.post_id = $1 ORDER BY q.created_at ASC",
        [post_id]
      );
    } else if (course_id) {
      rows = await pool.query("SELECT * FROM quiz_questions WHERE course_id=$1 ORDER BY random()", [course_id]);
    } else if (language) {
      rows = await pool.query("SELECT * FROM quiz_questions WHERE language ILIKE $1 ORDER BY random()", [language]);
    } else {
      rows = await pool.query("SELECT * FROM quiz_questions ORDER BY random()");
    }
    let items = rows.rows.map((r) => ({
      ...r,
      options: typeof r.options === "string" ? JSON.parse(r.options) : r.options,
      post_ids: []
    }));
    const links = await pool.query("SELECT question_id, post_id FROM quiz_question_posts");
    const map = {};
    for (const l of links.rows) (map[l.question_id] ||= []).push(l.post_id);
    items = items.map((i) => ({ ...i, post_ids: map[i.id] || [] }));
    const lim = Math.max(1, Math.min(Number(limit) || items.length, 50));
    res.json({ questions: items.slice(0, lim) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/quiz", async (req, res) => {
  const b = req.body || {};
  if (!b.question?.trim() || !Array.isArray(b.options) || b.options.length < 2) {
    return res.status(400).json({ error: "Thieu cau hoi hoac options" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const id = b.id || nid("q");
    await client.query(
      "INSERT INTO quiz_questions (id, course_id, language, question, options, answer_index, explanation, difficulty, source, created_by) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,'manual',$9)",
      [id, b.course_id || null, b.language || "", b.question.trim(),
       JSON.stringify(b.options), Number(b.answer_index) || 0,
       b.explanation || "", b.difficulty || "easy", b.created_by || null]
    );
    for (const pid of b.post_ids || []) {
      await client.query(
        "INSERT INTO quiz_question_posts (question_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [id, pid]
      );
    }
    await client.query("COMMIT");
    res.status(201).json({ question: { id } });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ================= VIEC LAM IT (AI ho tro tim kiem) =================
const FALLBACK_JOBS = [
  {
    id: "fallback_job_01",
    title: "Frontend Developer (React/TypeScript)",
    company: "Công ty công nghệ XYZ",
    location: "Hà Nội",
    address: "Tòa nhà Viettel, Cầu Giấy",
    apply_email: "",
    phone: "",
    job_type: "fulltime",
    tags: ["React", "TypeScript", "Frontend"],
    salary: "20 - 35 triệu",
    link: "https://www.topdev.vn/",
    description: "Phát triển giao diện người dùng với React, TypeScript và tối ưu hiệu năng UI cho sản phẩm SaaS.",
    posted_at: new Date().toISOString(),
    source: "demo"
  },
  {
    id: "fallback_job_02",
    title: "Back-end Developer (Node.js / PostgreSQL)",
    company: "Startup fintech",
    location: "Đà Nẵng",
    address: "Khu công nghệ cao",
    apply_email: "",
    phone: "",
    job_type: "fulltime",
    tags: ["Node.js", "PostgreSQL", "API"],
    salary: "18 - 30 triệu",
    link: "https://www.topdev.vn/",
    description: "Xây dựng API, tối ưu database và đảm bảo tính ổn định cho hệ thống thanh toán và phân tích dữ liệu.",
    posted_at: new Date(Date.now() - 86400000).toISOString(),
    source: "demo"
  },
  {
    id: "fallback_job_03",
    title: "Intern Front-end",
    company: "Studio Digital",
    location: "Hồ Chí Minh",
    address: "Q1, TP.HCM",
    apply_email: "",
    phone: "",
    job_type: "internship",
    tags: ["HTML", "CSS", "JavaScript"],
    salary: "3 - 6 triệu",
    link: "https://jobs.example.com/intern-frontend",
    description: "Thực tập lập trình UI/UX, làm việc với React, Tailwind và tìm hiểu quy trình làm sản phẩm thực tế.",
    posted_at: new Date(Date.now() - 172800000).toISOString(),
    source: "demo"
  },
  {
    id: "fallback_job_04",
    title: "Remote QA Engineer",
    company: "Nền tảng software quốc tế",
    location: "Remote",
    address: "Remote",
    apply_email: "",
    phone: "",
    job_type: "remote",
    tags: ["QA", "Automation", "Testing"],
    salary: "15 - 28 triệu",
    link: "https://jobs.example.com/qa-remote",
    description: "Kiểm thử chức năng, tự động hóa test và hỗ trợ team phát triển chất lượng sản phẩm ở nhiều môi trường.",
    posted_at: new Date(Date.now() - 259200000).toISOString(),
    source: "demo"
  }
];

const normalizeFallbackJobs = (q = "") => {
  const query = String(q || "").trim().toLowerCase();
  const filtered = query
    ? FALLBACK_JOBS.filter((job) => {
        const haystack = `${job.title} ${job.company} ${job.location} ${job.description} ${(job.tags || []).join(" ")}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
    : FALLBACK_JOBS;

  return filtered.map((job) => ({
    ...job,
    tags: Array.isArray(job.tags) ? job.tags : [],
    posted_at: job.posted_at || new Date().toISOString(),
    link: job.link || "#"
  }));
};

router.get("/jobs", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM jobs ORDER BY posted_at DESC");
    const jobs = r.rows.length ? r.rows : normalizeFallbackJobs();
    res.json({ jobs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/jobs/:id", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM jobs WHERE id=$1", [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: "Khong tim thay viec lam" });
    res.json({ job: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/jobs/:id/apply", async (req, res) => {
  const b = req.body || {};
  if (!b.name?.trim() || !b.email?.trim() || !b.cv_name || !b.cv_data) {
    return res.status(400).json({ error: "Thieu ho ten, email hoac file CV" });
  }
  try {
    const job = await pool.query("SELECT id FROM jobs WHERE id=$1", [req.params.id]);
    if (!job.rows[0]) return res.status(404).json({ error: "Khong tim thay viec lam" });
    const id = nid("application");
    await pool.query(
      "INSERT INTO job_applications (id, job_id, candidate_name, candidate_email, candidate_phone, cv_name, cv_data) VALUES ($1,$2,$3,$4,$5,$6,decode($7,'base64'))",
      [id, req.params.id, b.name.trim(), b.email.trim(), b.phone?.trim() || "", String(b.cv_name).slice(0, 200), b.cv_data]
    );
    res.status(201).json({ application: { id } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Tim kiem viec lam: AI doc cau hoi tu nhien ("thuc tap IT o Ha Noi ve React")
// -> bo loc { keywords, location, job_type } -> loc trong DB that; loi thi fallback tu khoa
router.post("/jobs/ai-search", async (req, res) => {
  const q = String(req.body?.q || "").trim();
  if (!q) return res.status(400).json({ error: "Thieu tu khoa tim kiem" });
  try {
    const all = await pool.query("SELECT * FROM jobs ORDER BY posted_at DESC");
    let jobs = all.rows.length ? all.rows : normalizeFallbackJobs(q);
    let aiUsed = false;
    let filters = null;
    try {
      const ai = await askGemini(
        "Phan tich cau nguoi dung tim viec lam IT va tra ve CHI JSON object (khong them chu): " +
        '{"keywords":["..."],"location":"...","job_type":"internship|fulltime|parttime|remote|any"}\n' +
        `Cau hoi: "${q}"`,
        { timeoutMs: 30000 }
      );
      if (ai.ok) {
        const parsed = extractJson(ai.text);
        if (parsed && (Array.isArray(parsed.keywords) || parsed.location || parsed.job_type)) {
          filters = parsed;
          aiUsed = true;
        }
      }
    } catch { /* roi ve tim kiem thuong */ }

    const norm = (s) => String(s || "").toLowerCase();
    if (aiUsed && filters) {
      const kws = (filters.keywords || []).map(norm).filter(Boolean);
      const loc = norm(filters.location);
      const type = norm(filters.job_type || "any");
      jobs = jobs.filter((j) => {
        const tags = (j.tags || []).map(norm);
        const hay = norm(j.title + " " + j.company + " " + j.description) + " " + tags.join(" ");
        const okKw = !kws.length || kws.some((k) => hay.includes(k) || tags.some((t) => t.includes(k)));
        const locFirst = loc && loc !== "any" ? loc.split(/[\s,]+/)[0] : "";
        const okLoc = !locFirst || norm(j.location).includes(locFirst);
        const okType = !type || type === "any" || (type === "remote" ? norm(j.location).includes("remote") : j.job_type === type);
        return okKw && okLoc && okType;
      });
    } else {
      const terms = q.toLowerCase().split(/[^a-z0-9\+\#]+/).filter((t) => t.length > 1);
      jobs = jobs.filter((j) => {
        const hay = norm(j.title + " " + j.company + " " + j.location + " " + j.description + " " + (j.tags || []).join(" "));
        return terms.some((t) => hay.includes(t));
      });
    }

    if (!jobs.length && all.rows.length === 0) {
      jobs = normalizeFallbackJobs(q);
    }
    res.json({ jobs, ai_used: aiUsed, filters });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/jobs/google-search", async (req, res) => {
  const q = String(req.body?.q || "").trim();
  if (!q) return res.status(400).json({ error: "Thieu tu khoa tim kiem" });

  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  const googleSearchEnabled = Boolean(apiKey && searchEngineId);

  const jobPrompt =
    `Ban la chuyen gia tuyen dung IT Viet Nam. Hay goi y cac tin tuyen dung IT phu hop voi tu khoa: "${q}".\n` +
    `Tra ve CHI JSON array (khong giai thich them), moi phan tu co dang:\n` +
    `[{"title":"...","company":"...","location":"...","job_type":"internship|fulltime|parttime|remote","salary":"...","description":"mo ta ngan 1-2 cau","tags":["React","Node",...],"link":"https://...","posted_at":"YYYY-MM-DD"}]\n` +
    `Yeu cau:\n` +
    `- link PHAI la URL that toi 1 tin tuyen dung cu the tren topdev.vn, itviec.com, vietnamworks.com, topcv.vn, linkedin.com/jobs hoac jobsgo.vn\n` +
    `- Neu khong chac URL that thi de link la "" (se bi loc bo)\n` +
    `- Tra ve 5-8 tin. Chi JSON, khong markdown, khong chu thich.`;

  try {
    let googleJobs = [];
    if (googleSearchEnabled) {
      const params = new URLSearchParams({ key: apiKey, cx: searchEngineId, q: `${q} việc làm IT tuyển dụng`, num: "10" });
      const response = await fetch("https://www.googleapis.com/customsearch/v1?" + params);
      const data = await response.json();
      googleJobs = (response.ok ? data.items || [] : []).map((item, index) => ({
        id: `google_${index}_${Buffer.from(item.link).toString("base64url").slice(0, 16)}`,
        title: item.title,
        company: "Nguồn Google",
        location: q,
        description: item.snippet || "",
        link: item.link,
        source: "google",
        tags: []
      }));
    }

    let ai = await askGeminiWithSearch(jobPrompt, { timeoutMs: 40000 });
    if (!ai.ok) {
      ai = await askGemini(jobPrompt, { timeoutMs: 30000, preferGenerateContent: true });
    }

    if (!ai.ok) {
      if (googleJobs.length) return res.json({ jobs: googleJobs, source: "google" });
      return res.json({ jobs: normalizeFallbackJobs(q), source: "fallback" });
    }

    let parsedJobs = extractJson(ai.text);
    if (!Array.isArray(parsedJobs)) parsedJobs = [];

    const jobs = parsedJobs
      .filter((j) => j && typeof j.title === "string" && typeof j.link === "string" && /^https?:\/\//i.test(String(j.link || "")))
      .map((j, idx) => ({
        id: `gemini_${idx}_${Date.now()}`,
        title: String(j.title || "").trim(),
        company: String(j.company || "Chua ro").trim(),
        location: String(j.location || q).trim(),
        job_type: ["internship", "fulltime", "parttime", "remote"].includes(j.job_type)
          ? j.job_type : "fulltime",
        salary: String(j.salary || "").trim(),
        description: String(j.description || "").trim(),
        tags: Array.isArray(j.tags) ? j.tags.map(String) : [],
        link: String(j.link).trim(),
        source: "google",
        posted_at: j.posted_at || new Date().toISOString()
      }));

    if (jobs.length) {
      return res.json({ jobs, source: ai.via?.includes("search") ? "gemini_search" : "gemini_ai" });
    }

    if (googleJobs.length) {
      return res.json({ jobs: googleJobs, source: "google" });
    }

    return res.json({ jobs: normalizeFallbackJobs(q), source: "fallback" });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post("/jobs", async (req, res) => {
  const b = req.body || {};
  if (!b.title?.trim() || !b.company?.trim() || !/^https?:\/\//i.test(String(b.link || ""))) {
    return res.status(400).json({ error: "Tin tuyển dụng phải có URL nguồn hợp lệ" });
  }
  try {
    const id = b.id || nid("job");
    await pool.query(
      "INSERT INTO jobs (id, title, company, location, address, apply_email, phone, job_type, tags, salary, link, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
      [id, b.title.trim(), b.company.trim(), b.location || "", b.address || "", b.apply_email || "", b.phone || "", b.job_type || "internship",
       b.tags || [], b.salary || "", b.link || "#", b.description || ""]
    );
    res.status(201).json({ job: { id } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
function buildFallbackQuestions(material, total, lang, difficulty) {
  const raw = String(material || "").replace(/\s+/g, " ").trim();
  const words = (raw.match(/[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ0-9./+-]{2,}/g) || [])
    .map((w) => w.toLowerCase())
    .filter((w) => !["voi", "cua", "cho", "sau", "ket", "tang", "va", "la", "voi", "the", "that", "this", "with", "from", "into", "code", "data", "system"].includes(w))
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, 8);

  const baseTopic = words[0] || (lang || "công nghệ");
  const catalog = [
    { title: `Mục tiêu chính của ${baseTopic} trong khóa học là gì?`, options: ["Tăng hiệu suất và độ tin cậy", "Giảm chất lượng mã nguồn", "Tắt hoàn toàn chức năng kiểm thử", "Xóa quy trình triển khai"], answer: 0 },
    { title: `Kỹ thuật nào phù hợp nhất để cải thiện ${baseTopic} trong hệ thống thực tế?`, options: ["Tối ưu hóa theo tiêu chí rõ ràng", "Bỏ qua kiểm tra lỗi", "Không cần tài liệu", "Dùng dữ liệu sai lệch"], answer: 0 },
    { title: `Vì sao ${baseTopic} lại quan trọng trong phát triển ứng dụng?`, options: ["Giúp hệ thống ổn định, dễ nâng cấp và bảo trì", "Chỉ cần thiết cho quảng cáo", "Không ảnh hưởng đến hiệu năng", "Chỉ dùng cho thiết kế đồ họa"], answer: 0 },
    { title: `Khi làm việc với ${baseTopic}, cách tiếp cận đúng nhất là:`, options: ["Hiểu yêu cầu, đo lường hiệu quả rồi tối ưu", "Sửa mã mà không kiểm thử", "Bỏ qua tài liệu", "Chỉ tập trung vào giao diện"], answer: 0 },
    { title: `Đâu là tiêu chí quan trọng nhất khi tối ưu ${baseTopic}?`, options: ["Độ rõ ràng, hiệu suất và khả năng bảo trì", "Số lượng file càng lớn càng tốt", "Không cần validate đầu vào", "Tăng độ phức tạp không cần thiết"], answer: 0 }
  ];

  const final = [];
  for (let i = 0; i < total; i++) {
    const item = catalog[i % catalog.length];
    final.push({
      question: item.title,
      options: item.options,
      answer_index: item.answer,
      explanation: `Câu hỏi này kiểm tra cách hiểu đúng về ${baseTopic} và cách vận dụng trong thực tế để nâng cao hiệu quả và độ tin cậy của sản phẩm.`,
      difficulty: ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium",
      tags: [lang || "it", baseTopic || "learning"]
    });
  }
  return final.slice(0, total);
}

router.post("/quiz/generate", async (req, res) => {
  const b = req.body || {};
  const count = Math.max(1, Math.min(Number(b.count) || 5, 30));
  const difficulty = ["easy", "medium", "hard"].includes(b.difficulty) ? b.difficulty : "mixed";
  try {
    let lang = b.language || "";
    let posts = [];
    if (b.course_id) {
      const c = await pool.query("SELECT * FROM courses WHERE id=$1", [b.course_id]);
      if (!c.rows[0]) return res.status(404).json({ error: "Khong tim thay khoa hoc" });
      const course = c.rows[0];
      lang = lang || course.language;
      posts = await pool.query(
        b.post_id
          ? "SELECT p.id, p.title, p.content FROM course_posts cp JOIN posts p ON p.id = cp.post_id WHERE cp.course_id = $1 AND cp.post_id = $2"
          : "SELECT p.id, p.title, p.content FROM course_posts cp JOIN posts p ON p.id = cp.post_id WHERE cp.course_id = $1 ORDER BY cp.position",
        b.post_id ? [b.course_id, b.post_id] : [b.course_id]
      );
      posts = posts.rows;
      if (b.post_id && !posts.length) {
        return res.status(400).json({ error: "Bai hoc khong thuoc khoa hoc da chon" });
      }
      if (!posts.length && (course.description || course.title)) {
        posts = [{
          id: course.id,
          title: course.title,
          content: `${course.title}\n\n${course.description || "Khóa học này chưa có bài viết, AI sẽ tạo câu hỏi dựa trên mô tả khóa học."}`
        }];
      }
    } else if (Array.isArray(b.post_ids) && b.post_ids.length) {
      posts = await pool.query("SELECT id, title, content FROM posts WHERE id = ANY($1::text[])", [b.post_ids]);
      posts = posts.rows;
    }
    if (!posts.length) return res.status(400).json({ error: "Khoa hoc / bai viet chua co bai nao hoac chua co mo ta de AI tao cau hoi" });

    const material = posts
      .slice(0, 6)
      .map((p, i) => `--- BAI ${i + 1}: ${p.title} ---\n${String(p.content).slice(0, 4000)}`)
      .join("\n\n");

    const questionPrompt = (batchCount, retry = false) =>
      `${retry ? "Lan truoc tra ve JSON loi. Hay lam lai va chi tra ve JSON hop le.\n" : ""}` +
      `Ban la giang vien IT. Dua tren noi dung bai viet sau, tao dung ${batchCount} cau hoi trac nghiem ` +
      `4 lua chon ve ${lang || "chu de IT"}${difficulty !== "mixed" ? ", do kho " + difficulty : " (tron do kho easy/medium/hard)"}.\n` +
      `Chi tra ve JSON MANG thuan, khong markdown, khong giai thich. Moi phan tu phai co dang:\n` +
      `{"question":"...","options":["A","B","C","D"],"answer_index":0,"explanation":"...","difficulty":"easy","tags":["..."]}\n\n` +
      `NOI DUNG:\n${material}`;

    const generatedQuestions = [];
    let lastAiVia = "fallback_local";
    let fallbackUsed = false;
    for (let remaining = count; remaining > 0; remaining -= 8) {
      const batchCount = Math.min(remaining, 8);
      let parsed = null;
      let batchAi = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        batchAi = await askGemini(questionPrompt(batchCount, attempt > 0), { timeoutMs: 90000 });
        if (!batchAi.ok) {
          fallbackUsed = true;
          break;
        }
        parsed = extractJson(batchAi.text);
        if (!Array.isArray(parsed) && parsed?.questions) parsed = parsed.questions;
        const valid = Array.isArray(parsed)
          ? parsed.filter((q) => q?.question && Array.isArray(q.options) && q.options.length >= 2)
          : [];
        if (valid.length >= batchCount) {
          parsed = valid.slice(0, batchCount);
          break;
        }
        parsed = null;
      }
      if (!parsed) {
        fallbackUsed = true;
        generatedQuestions.push(...buildFallbackQuestions(material, batchCount, lang, difficulty));
        lastAiVia = "fallback_local";
        continue;
      }
      generatedQuestions.push(...parsed);
      lastAiVia = batchAi?.via || "gemini";
    }

    if (!generatedQuestions.length) {
      const fallback = buildFallbackQuestions(material, count, lang, difficulty);
      generatedQuestions.push(...fallback);
    }

    const client = await pool.connect();
    const created = [];
    try {
      await client.query("BEGIN");
      for (const q of generatedQuestions) {
        const id = nid("q");
        await client.query(
          "INSERT INTO quiz_questions (id, course_id, language, question, options, answer_index, explanation, difficulty, source, created_by) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,'ai',$9)",
          [id, b.course_id || null, lang, String(q.question).trim(),
           JSON.stringify(q.options), Number(q.answer_index) || 0,
           q.explanation || "", ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
           b.created_by || null]
        );
        for (const pid of posts.map((p) => p.id)) {
          await client.query(
            "INSERT INTO quiz_question_posts (question_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
            [id, pid]
          );
        }
        created.push({ id, question: String(q.question).trim() });
      }
      await client.query("COMMIT");
      res.status(201).json({ created, via: lastAiVia });
    } catch (e) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: e.message });
    } finally {
      client.release();
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= KHOA HOC =================
router.get("/courses", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT c.*,
        (SELECT count(*) FROM course_posts cp WHERE cp.course_id = c.id) AS post_count,
        (SELECT count(*) FROM quiz_questions q WHERE q.course_id = c.id) AS question_count,
        COALESCE((SELECT json_agg(json_build_object('id', p.id, 'title', p.title) ORDER BY cp.position)
          FROM course_posts cp JOIN posts p ON p.id = cp.post_id WHERE cp.course_id = c.id), '[]'::json) AS posts
       FROM courses c ORDER BY c.created_at DESC`
    );
    res.json({ courses: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/courses/:id", async (req, res) => {
  try {
    const c = await pool.query("SELECT * FROM courses WHERE id=$1", [req.params.id]);
    if (!c.rows[0]) return res.status(404).json({ error: "Khong tim thay khoa hoc" });
    const posts = await pool.query(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.category, p.read_time, p.views, cp.position,
          (SELECT count(*) FROM quiz_question_posts qqp JOIN quiz_questions qq ON qq.id = qqp.question_id
           WHERE qqp.post_id = p.id AND qq.course_id = $1) AS question_count
       FROM course_posts cp JOIN posts p ON p.id = cp.post_id
       WHERE cp.course_id = $1 ORDER BY cp.position ASC`,
      [req.params.id]
    );
    const questions = await pool.query(
      "SELECT id, question, difficulty, source FROM quiz_questions WHERE course_id=$1 ORDER BY created_at ASC",
      [req.params.id]
    );
    res.json({ course: c.rows[0], posts: posts.rows, questions: questions.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Nguoi quan tri tao khoa hoc: chon bai viet + xep thu tu
router.post("/courses", async (req, res) => {
  const b = req.body || {};
  if (!b.title?.trim()) return res.status(400).json({ error: "Thieu ten khoa hoc" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const id = b.id || nid("course");
    await client.query(
      "INSERT INTO courses (id, title, description, language, cover_image, author_id) VALUES ($1,$2,$3,$4,$5,$6)",
      [id, b.title.trim(), b.description || "", b.language || "C++", b.cover_image || null, b.author_id || null]
    );
    let pos = 0;
    for (const pid of b.post_ids || []) {
      await client.query(
        "INSERT INTO course_posts (course_id, post_id, position) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [id, pid, pos++]
      );
    }
    await client.query("COMMIT");
    res.status(201).json({ course: { id, title: b.title.trim() } });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

router.put("/courses/:id", async (req, res) => {
  const b = req.body || {};
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE courses SET title=COALESCE($2,title), description=COALESCE($3,description), language=COALESCE($4,language), cover_image=COALESCE($5,cover_image) WHERE id=$1",
      [req.params.id, b.title, b.description, b.language, b.cover_image]
    );
    if (Array.isArray(b.post_ids)) {
      await client.query("DELETE FROM course_posts WHERE course_id=$1", [req.params.id]);
      let pos = 0;
      for (const pid of b.post_ids) {
        await client.query(
          "INSERT INTO course_posts (course_id, post_id, position) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
          [req.params.id, pid, pos++]
        );
      }
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

router.delete("/courses/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM courses WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
