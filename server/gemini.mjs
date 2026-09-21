// Gemini client cho IT Blog API — DUNG CUA curl nguoi dung cung cap:
// POST https://generativelanguage.googleapis.com/v1beta/interactions
//   headers: x-goog-api-key, Api-Revision: 2026-05-20
//   body: { model: "gemini-3.8-flash", input: "..." }
// API key doc tu moi truong / database/.env / server/.env. KHONG hardcode vao git.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

function readEnvFile(name) {
  const out = {};
  try {
    const p = path.join(here, "..", name);
    if (fs.existsSync(p)) {
      for (const line of fs.readFileSync(p, "utf8").split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#") || t.startsWith("//")) continue;
        const i = t.indexOf("=");
        if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
      }
    }
  } catch { /* bo qua */ }
  return out;
}

const fenv = { ...readEnvFile("database/.env"), ...readEnvFile("server/.env") };

export function getGeminiKey() {
  return process.env.GEMINI_API_KEY || fenv.GEMINI_API_KEY || "";
}

const MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"];
const REVISION = "2026-05-20";

function looksLikeTokenString(s) {
  const text = String(s || "").trim();
  if (!text) return false;
  if (/[\s\n\r\t]/.test(text)) return false;
  return /^[A-Za-z0-9_-]{12,}$/.test(text) && !/[A-Za-z]{4,}\s/.test(text);
}

function extractText(json) {
  if (!json) return "";
  if (typeof json.output_text === "string" && json.output_text) return json.output_text;
  if (typeof json.response === "string" && json.response) return json.response;
  if (typeof json.result === "string" && json.result) return json.result;
  if (typeof json.text === "string" && json.text) return json.text;
  if (Array.isArray(json.output)) {
    const parts = [];
    for (const o of json.output) {
      if (typeof o === "string") parts.push(o);
      else if (typeof o?.text === "string") parts.push(o.text);
      else if (Array.isArray(o?.content)) {
        for (const c of o.content) {
          if (typeof c === "string") parts.push(c);
          else if (typeof c?.text === "string") parts.push(c.text);
        }
      }
    }
    if (parts.length) return parts.join("\n");
  }
  const cand = json.candidates?.[0];
  const parts2 = cand?.content?.parts || [];
  const joined = parts2.map((p) => p?.text || "").join("\n").trim();
  if (joined) return joined;
  if (typeof cand?.content === "string") return cand.content;
  if (json.choices?.[0]?.message?.content) return json.choices[0].message.content;
  const found = [];
  const scan = (v, depth) => {
    if (depth > 6 || found.length > 3) return;
    if (typeof v === "string") {
      if (looksLikeTokenString(v)) return;
      if (v.length > 20) found.push(v);
      return;
    }
    if (Array.isArray(v)) { v.forEach((x) => scan(x, depth + 1)); return; }
    if (v && typeof v === "object") { Object.values(v).forEach((x) => scan(x, depth + 1)); }
  };
  scan(json, 0);
  return found[0] || "";
}

export function extractJson(text) {
  if (!text) return null;
  const s = String(text).replace(/```json|```/gi, "").trim();
  const starts = [s.indexOf("["), s.indexOf("{")].filter((i) => i >= 0);
  if (!starts.length) return null;
  const start = Math.min(...starts);
  const open = s[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  try { return JSON.parse(s.slice(start)); } catch { return null; }
}

async function callInteractions(model, input, key, signal) {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "Content-Type": "application/json",
      "Api-Revision": REVISION
    },
    body: JSON.stringify({ model, input }),
    signal
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, text: extractText(data) };
}

async function callGenerateContent(model, input, key, signal) {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] }),
      signal
    }
  );
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, text: extractText(data) };
}

export async function askGeminiWithSearch(input, { timeoutMs = 60000 } = {}) {
  const key = getGeminiKey();
  if (!key) return { ok: false, error: "Chua cau hinh GEMINI_API_KEY trong database/.env" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (const model of MODELS) {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
        {
          method: "POST",
          headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: input }] }],
            tools: [{ googleSearch: {} }]
          }),
          signal: controller.signal
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) continue;
      const text = extractText(data);
      const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .map((c) => ({ title: c.web?.title || "", url: c.web?.uri || "" }))
        .filter((s) => s.url);
      if (text) return { ok: true, text, sources, via: model + "@generateContent+search" };
    }
    return { ok: false, error: "Gemini Search khong tra du lieu" };
  } catch (e) {
    return { ok: false, error: "Loi goi Gemini Search: " + (e?.message || String(e)) };
  } finally {
    clearTimeout(timer);
  }
}

export async function askGemini(input, { timeoutMs = 60000, preferGenerateContent = false } = {}) {
  const key = getGeminiKey();
  if (!key) return { ok: false, error: "Chua cau hinh GEMINI_API_KEY trong database/.env" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const errors = [];
  try {
    for (const model of MODELS) {
      let r = await callInteractions(model, input, key, controller.signal);
      if (r.ok && r.text) return { ok: true, text: r.text, via: model + "@interactions" };
      errors.push(model + "@interactions HTTP " + r.status);

      r = await callGenerateContent(model, input, key, controller.signal);
      if (r.ok && r.text) return { ok: true, text: r.text, via: model + "@generateContent" };
      errors.push(model + "@generateContent HTTP " + r.status);

      if (!preferGenerateContent) {
        const r2 = await callInteractions(model, input, key, controller.signal);
        if (r2.ok && r2.text) return { ok: true, text: r2.text, via: model + "@interactions" };
        errors.push(model + "@interactions HTTP " + r2.status);
      }

      const r3 = await callGenerateContent(model, input, key, controller.signal);
      if (r3.ok && r3.text) return { ok: true, text: r3.text, via: model + "@generateContent" };
      errors.push(model + "@generateContent HTTP " + r3.status);
    }
    return { ok: false, error: "Gemini khong tra du lieu (" + errors.join("; ") + ")" };
  } catch (e) {
    return { ok: false, error: "Loi goi Gemini: " + (e?.message || String(e)) };
  } finally {
    clearTimeout(timer);
  }
}
