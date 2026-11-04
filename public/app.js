const $ = (s) => document.querySelector(s);
const fmt = (n) => (n || 0).toLocaleString("vi-VN");
const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PAGE = 60;

let BOOKS = [], TOPICS = {}, META = {};
const st = { tab: "all", topic: "", q: "", dec: "", shown: PAGE };

async function load() {
  const [b, t, m] = await Promise.all([
    fetch("/data/books.json").then((r) => r.json()),
    fetch("/data/topics.json").then((r) => r.json()).catch(() => ({})),
    fetch("/data/meta.json").then((r) => r.json()).catch(() => ({})),
  ]);
  BOOKS = b.map((x) => ({ ...x, _s: fold(`${x.t} ${x.a} ${x.tv || ""}`) }));
  TOPICS = t; META = m;
  const d = META.updated ? new Date(META.updated).toLocaleDateString("vi-VN") : "";
  $("#stats").textContent = `${fmt(BOOKS.length)} cuốn sách · ${fmt(META.mentions)} lượt nhắc · cập nhật ${d}`;
  const h = (META.history || []).slice(0, 6).map((x) => `${new Date(x.date).toLocaleDateString("vi-VN")}: +${x.added}`).join(" · ");
  if (h) $("#hist").textContent = "Lịch sử cập nhật: " + h;
  readHash(); chips(); render();
}

function chips() {
  const cnt = {};
  for (const b of BOOKS) for (const t of b.tp || []) cnt[t] = (cnt[t] || 0) + 1;
  const keys = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
  $("#chips").innerHTML = [`<button data-t="" class="${st.topic ? "" : "on"}">Tất cả chủ đề</button>`]
    .concat(keys.map((k) => `<button data-t="${esc(k)}" class="${st.topic === k ? "on" : ""}">${esc(TOPICS[k] || k)}<small>${fmt(cnt[k])}</small></button>`)).join("");
}

function filtered() {
  const q = fold(st.q).trim();
  const [y0, y1] = st.dec ? st.dec.split("-").map(Number) : [null, null];
  let r = BOOKS.filter((b) =>
    (!st.topic || (b.tp || []).includes(st.topic)) &&
    (!q || q.split(/\s+/).every((w) => b._s.includes(w))) &&
    (!st.dec || (b.y && b.y >= y0 && b.y <= y1)));
  if (st.tab === "rec") r = [...r].sort((a, b) => b.r - a.r);
  if (st.tab === "rising") r = r.filter((b) => b.fm >= "2020").sort((a, b) => b.c - a.c);
  if (st.tab === "new") r = r.filter((b) => b.s).sort((a, b) => (b.s > a.s ? 1 : b.s < a.s ? -1 : a.rk - b.rk));
  return r;
}

function card(b, i) {
  const cover = b.cv ? `https://covers.openlibrary.org/b/id/${b.cv}-M.jpg` : "";
  const hn = `https://hn.algolia.com/?type=comment&query=${encodeURIComponent('"' + b.t + '"')}`;
  const tags = (b.tp || []).map((t) => `<span class="tag">${esc(TOPICS[t] || t)}</span>`).join("") + (b.s ? `<span class="tag new">Mới ${new Date(b.s).toLocaleDateString("vi-VN")}</span>` : "");
  return `<li class="book">
    <div class="rk">${st.tab === "all" && !st.topic && !st.q && !st.dec ? b.rk : i + 1}</div>
    ${cover ? `<img class="cover" loading="lazy" alt="" src="${cover}" onerror="this.style.visibility='hidden'">` : `<div class="cover"></div>`}
    <div>
      <p class="t">${esc(b.t)}</p>
      ${b.tv ? `<p class="tv">${esc(b.tv)}</p>` : ""}
      <p class="a">${esc(b.a)}${b.y ? ` · xuất bản ${b.y}` : ""}</p>
      <div class="nums"><span><b>${fmt(b.c)}</b> người nhắc đến</span><span><b>${fmt(b.r)}</b> người khuyên đọc</span><span>${fmt(b.m)} lượt nhắc</span>${b.fm ? `<span>nhắc lần đầu ${b.fm.slice(0, 4)}</span>` : ""}</div>
      <div class="tags">${tags}</div>
      <div class="links">
        ${b.dr ? `<a class="drive" href="${esc(b.dr)}" target="_blank" rel="noopener">📁 Google Drive</a>` : ""}
        ${b.ol ? `<a href="${esc(b.ol)}" target="_blank" rel="noopener">Open Library (đọc/mượn)</a>` : ""}
        <a href="${esc(b.hb)}" target="_blank" rel="noopener">Trang gốc HackerBooks</a>
        <a href="${hn}" target="_blank" rel="noopener">Bình luận trên HN</a>
      </div>
    </div></li>`;
}

function render() {
  const r = filtered();
  $("#count").textContent = st.tab === "new" && !r.length
    ? "Chưa có sách mới — danh sách này sẽ có dữ liệu sau lần cập nhật hàng tuần tiếp theo."
    : `${fmt(r.length)} cuốn`;
  $("#list").innerHTML = r.slice(0, st.shown).map(card).join("");
  $("#more").style.display = r.length > st.shown ? "" : "none";
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === st.tab));
  writeHash();
}

function writeHash() {
  const p = new URLSearchParams();
  if (st.tab !== "all") p.set("tab", st.tab);
  if (st.topic) p.set("chu-de", st.topic);
  if (st.q) p.set("q", st.q);
  if (st.dec) p.set("nam", st.dec);
  history.replaceState(null, "", p.toString() ? "#" + p : location.pathname);
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  st.tab = p.get("tab") || "all"; st.topic = p.get("chu-de") || ""; st.q = p.get("q") || ""; st.dec = p.get("nam") || "";
  $("#q").value = st.q; $("#decade").value = st.dec;
}

$("#tabs").onclick = (e) => { const t = e.target.closest("button")?.dataset.tab; if (t) { st.tab = t; st.shown = PAGE; render(); } };
$("#chips").onclick = (e) => { const b = e.target.closest("button"); if (b) { st.topic = b.dataset.t; st.shown = PAGE; chips(); render(); } };
let tm; $("#q").oninput = (e) => { clearTimeout(tm); tm = setTimeout(() => { st.q = e.target.value; st.shown = PAGE; render(); }, 150); };
$("#decade").onchange = (e) => { st.dec = e.target.value; st.shown = PAGE; render(); };
$("#more").onclick = () => { st.shown += PAGE; render(); };
load().catch((e) => { $("#stats").textContent = "Không tải được dữ liệu: " + e.message; });
