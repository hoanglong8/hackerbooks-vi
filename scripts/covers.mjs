// Lấy cover ID từ Open Library (openlibrary.org/works/<ID>.json -> covers[0]),
// cache vào data/covers.json. Mỗi lần chạy lấy tối đa COVERS_MAX sách chưa có, ưu tiên hạng cao.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const FILE = path.join(ROOT, "data/covers.json");
const BOOKS = path.join(ROOT, "public/data/books.json");
const MAX = Number(process.env.COVERS_MAX || 2000);
const CONC = 4;

const cache = (() => { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; } })();
const books = JSON.parse(fs.readFileSync(BOOKS, "utf8"));
const todo = books.filter((b) => b.id.startsWith("OL") && !(b.id in cache)).slice(0, MAX);
console.log(`Cần lấy ảnh bìa cho ${todo.length} sách.`);

let i = 0, ok = 0, fail = 0;
async function worker() {
  while (i < todo.length) {
    const b = todo[i++];
    try {
      const r = await fetch(`https://openlibrary.org/works/${b.id}.json`, { headers: { "User-Agent": "hackerbooks-vi (github.com/hoanglong8/hackerbooks-vi)" } });
      if (r.status === 429) { i--; await new Promise((s) => setTimeout(s, 5000)); continue; }
      if (!r.ok) { cache[b.id] = 0; fail++; continue; }
      const j = await r.json();
      cache[b.id] = (j.covers || []).find((c) => c > 0) || 0;
      ok++;
    } catch { fail++; }
    if ((ok + fail) % 200 === 0) { fs.writeFileSync(FILE, JSON.stringify(cache)); console.log(`  ${ok + fail}/${todo.length}`); }
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
fs.writeFileSync(FILE, JSON.stringify(cache));
for (const b of books) if (cache[b.id]) b.cv = cache[b.id];
fs.writeFileSync(BOOKS, JSON.stringify(books));
console.log(`Xong ảnh bìa: ${ok} ok, ${fail} lỗi, tổng cache ${Object.keys(cache).length}.`);
