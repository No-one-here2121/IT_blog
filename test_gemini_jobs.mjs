import { askGemini, extractJson } from './server/gemini.mjs';

const q = 'thuc tap React Ha Noi';
const jobPrompt =
  `Ban la chuyen gia tuyen dung IT Viet Nam. Hay goi y cac tin tuyen dung IT phu hop voi tu khoa: "${q}".\n` +
  `Tra ve CHI JSON array, moi phan tu co dang:\n` +
  `[{"title":"...","company":"...","location":"...","job_type":"internship","salary":"","description":"...","tags":["React"],"link":"https://...","posted_at":"2025-01-01"}]\n` +
  `link PHAI la URL that tren topdev.vn hoac itviec.com. Chi JSON, khong markdown.`;

const ai = await askGemini(jobPrompt, { timeoutMs: 30000, preferGenerateContent: true });
console.log('ok:', ai.ok, '| via:', ai.via);
console.log('text preview:', ai.text?.slice(0, 800));
if (ai.ok) {
  const jobs = extractJson(ai.text);
  console.log('parsed jobs:', Array.isArray(jobs) ? jobs.length : 'not array - raw: ' + String(jobs));
  if (Array.isArray(jobs)) jobs.slice(0, 5).forEach(j => console.log(' -', j.title, '|', j.company, '|', j.link));
}

