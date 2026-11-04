// Crawl dữ liệu từ hackerbooks.org (file CSV công khai), gộp với dữ liệu cũ,
// đánh dấu sách mới, xuất public/data/books.json cho site tiếng Việt.
// Chạy: node scripts/crawl.mjs [--file path/to/local.csv]
import fs from "node:fs";
import path from "node:path";
import { normalizeTopic, slugify, TOPICS } from "./topics.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CSV_URL = process.env.HB_CSV_URL || "https://hackerbooks.org/data/hackerbooks.csv";
const STATE = path.join(ROOT, "data/state.json");          // ol_id -> ngày phát hiện lần đầu
const LINKS = path.join(ROOT, "data/links.json");          // ol_id -> {drive, note}: link Drive bổ sung thủ công
const TITLES_VI = path.join(ROOT, "data/titles_vi.json");  // ol_id -> tên sách tiếng Việt
const OUT = path.join(ROOT, "public/data/books.json");
const META = path.join(ROOT, "public/data/meta.json");

const readJSON = (p, d) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return d; } };
const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10); // giờ Việt Nam

// CSV parser chuẩn RFC 4180 (hỗ trợ dấu phẩy, xuống dòng, "" trong ô có ngoặc kép)
function parseCSV(text) {
  const rows = []; let row = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const splitList = (s) => String(s || "").split(/\s*[;|]\s*/).map((x) => x.trim()).filter(Boolean);
const num = (s) => { const n = Number(String(s || "").replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : 0; };

async function loadCSV() {
  const i = process.argv.indexOf("--file");
  if (i > -1) return fs.readFileSync(process.argv[i + 1], "utf8");
  const res = await fetch(CSV_URL, { headers: { "User-Agent": "hackerbooks-vi weekly crawler (+github)" } });
  if (!res.ok) throw new Error(`Tải CSV thất bại: HTTP ${res.status}`);
  return res.text();
}

let text;
try { text = await loadCSV(); }
catch (e) {
  // Không tải được nguồn: giữ nguyên dữ liệu đã có để site không bị trống
  const old = readJSON(OUT, []);
  if (old.length) { console.warn(`CẢNH BÁO: ${e.message} — giữ dữ liệu cũ (${old.length} sách).`); process.exit(0); }
  throw e;
}
const rows = parseCSV(text.replace(/^﻿/, ""));
const header = rows.shift().map((h) => h.trim().toLowerCase());
const col = (name) => header.indexOf(name);
const need = ["title", "authors"];
for (const n of need) if (col(n) < 0) throw new Error(`CSV thiếu cột "${n}". Header: ${header.join(",")}`);
if (rows.length < 100 && !process.argv.includes("--file")) throw new Error(`CSV chỉ có ${rows.length} dòng — nghi lỗi, dừng để không ghi đè dữ liệu tốt.`);

const state = readJSON(STATE, {});
const links = readJSON(LINKS, {});
const titlesVi = readJSON(TITLES_VI, {});
const firstRun = Object.keys(state).length === 0;
const get = (r, n) => (col(n) > -1 ? (r[col(n)] ?? "").trim() : "");

let added = 0;
const books = rows.map((r, idx) => {
  const title = get(r, "title");
  const ol = get(r, "openlibrary_work") || slugify(title + "-" + get(r, "authors"));
  if (!state[ol]) { state[ol] = firstRun ? "init" : today; if (!firstRun) added++; }
  const topics = [...new Set(splitList(get(r, "topics")).map(normalizeTopic).filter(Boolean))];
  const b = {
    id: ol,
    rk: num(get(r, "rank")) || idx + 1,
    t: title,
    a: splitList(get(r, "authors")).join(", ") || get(r, "authors"),
    y: num(get(r, "first_published")) || null,
    c: num(get(r, "hn_commenters")),
    m: num(get(r, "hn_mentions")),
    r: num(get(r, "hn_recommenders")),
    fm: get(r, "first_mentioned").slice(0, 10),
    lm: get(r, "last_mentioned").slice(0, 10),
    tp: topics,
    ol: get(r, "openlibrary_url") || (ol.startsWith("OL") ? `https://openlibrary.org/works/${ol}` : ""),
    hb: `https://hackerbooks.org/book/${slugify(title)}`,
    s: state[ol] === "init" ? null : state[ol], // ngày site tiếng Việt ghi nhận sách mới
  };
  if (titlesVi[ol]) b.tv = titlesVi[ol];
  if (links[ol]?.drive) b.dr = links[ol].drive;
  return b;
}).filter((b) => b.t);

books.sort((x, y) => x.rk - y.rk);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(books));
fs.writeFileSync(STATE, JSON.stringify(state, null, 0));
fs.writeFileSync(path.join(ROOT, "public/data/topics.json"), JSON.stringify(TOPICS));

const meta = readJSON(META, { history: [] });
meta.updated = today;
meta.source = CSV_URL;
meta.total = books.length;
meta.mentions = books.reduce((s, b) => s + b.m, 0);
meta.history = [{ date: today, total: books.length, added }, ...(meta.history || []).filter((h) => h.date !== today)].slice(0, 52);
fs.writeFileSync(META, JSON.stringify(meta, null, 2));

console.log(`OK: ${books.length} sách, ${added} sách mới, ${books.filter((b) => b.tp.length).length} có chủ đề.`);
