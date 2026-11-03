// Việt hóa tên sách (tùy chọn): dùng Claude API dịch tên sách CHƯA có bản dịch.
// Chỉ chạy khi có biến môi trường ANTHROPIC_API_KEY. Có cache trong data/titles_vi.json
// nên mỗi tuần chỉ dịch sách mới -> chi phí rất thấp.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.TRANSLATE_MODEL || "claude-haiku-5-5";
const MAX = Number(process.env.TRANSLATE_MAX || 3000); // giới hạn số tên dịch mỗi lần chạy
const BATCH = 80;
const FILE = path.join(ROOT, "data/titles_vi.json");
const BOOKS = path.join(ROOT, "public/data/books.json");

if (!KEY) { console.log("Bỏ qua dịch tên sách: chưa có ANTHROPIC_API_KEY."); process.exit(0); }

const cache = (() => { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return {}; } })();
const books = JSON.parse(fs.readFileSync(BOOKS, "utf8"));
const todo = books.filter((b) => !(b.id in cache)).slice(0, MAX);
console.log(`Cần dịch ${todo.length} tên sách (model ${MODEL}).`);

const PROMPT = `Bạn là biên tập viên sách. Với mỗi sách dưới đây, trả về tên tiếng Việt.
- Nếu sách đã có bản tiếng Việt phổ biến tại Việt Nam, dùng đúng tên đó (vd "How to Win Friends and Influence People" -> "Đắc Nhân Tâm").
- Nếu chưa có, dịch nghĩa ngắn gọn, tự nhiên. Thuật ngữ kỹ thuật giữ nguyên tiếng Anh.
- Tên riêng/tên tác phẩm không nên dịch (vd "Snow Crash", "Neuromancer") thì trả về chuỗi rỗng "".
Chỉ trả về JSON object {"<id>": "<tên tiếng Việt>"} và không có gì khác.`;

for (let i = 0; i < todo.length; i += BATCH) {
  const chunk = todo.slice(i, i + BATCH);
  const list = chunk.map((b) => `${b.id}\t${b.t}\t${b.a}`).join("\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, messages: [{ role: "user", content: `${PROMPT}\n\n${list}` }] }),
  });
  if (!res.ok) { console.error(`Lỗi API ${res.status}: ${await res.text()}`); break; }
  const data = await res.json();
  const txt = data.content?.map((c) => c.text || "").join("") || "";
  try {
    const obj = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
    for (const b of chunk) cache[b.id] = typeof obj[b.id] === "string" ? obj[b.id].trim() : "";
  } catch { console.error("Không parse được JSON lô", i); continue; }
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 0));
  console.log(`  đã dịch ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
}

// Gắn bản dịch vào books.json
for (const b of books) if (cache[b.id]) b.tv = cache[b.id];
fs.writeFileSync(BOOKS, JSON.stringify(books));
console.log("Xong dịch tên sách.");
