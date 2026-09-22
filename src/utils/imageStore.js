/**
 * Kho anh local cho trinh soan thao — luu blob anh vao IndexedDB,
 * content bai viet chi giu placeholder ngan ![alt](local:img_xxx).
 * Khong nhet base64 vao textarea / DB nua.
 */
const DB_NAME = "it_blog_images";
const STORE = "images";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalImage(id, blob) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalImage(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const rq = tx.objectStore(STORE).get(id);
    rq.onsuccess = () => resolve(rq.result || null);
    rq.onerror = () => reject(rq.error);
  });
}

// Cache object URL de <img> hien thi ngay, khong tao lai nhieu lan
const urlCache = new Map();

export async function resolveLocalImage(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const blob = await getLocalImage(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export function isLocalImageRef(src) {
  return typeof src === "string" && src.startsWith("local:");
}

export function localIdFromSrc(src) {
  return String(src || "").replace(/^local:/, "");
}
