# Sách Hacker — bản tiếng Việt của hackerbooks.org

Danh mục hơn 15.000 cuốn sách được nhắc đến trong bình luận Hacker News (2007–2026), Việt hóa giao diện + chủ đề + tên sách, tự cập nhật hàng tuần.

## Kiến trúc

```
hackerbooks.org/data/hackerbooks.csv  ──(GitHub Actions, 02:17 thứ Hai giờ VN)──▶ scripts/crawl.mjs
                                                                                    │  gộp dữ liệu, đánh dấu sách mới
                                                                                    ▼
                                              scripts/translate.mjs (Claude API, chỉ dịch sách chưa có tên Việt)
                                                                                    │
                                                         commit public/data/*.json ─▶ Vercel tự deploy lại
```

| File | Vai trò |
|---|---|
| `scripts/crawl.mjs` | Tải CSV công khai, chuẩn hóa, ghi `public/data/books.json`, `meta.json`, `topics.json` |
| `scripts/topics.mjs` | Từ điển Việt hóa 32 chủ đề |
| `scripts/translate.mjs` | Dịch tên sách sang tiếng Việt (ưu tiên tên bản dịch đã xuất bản tại VN), có cache |
| `data/state.json` | Ngày phát hiện từng sách → tab "Mới cập nhật" |
| `data/titles_vi.json` | Cache tên tiếng Việt — có thể sửa tay |
| `data/links.json` | Link Google Drive bổ sung thủ công theo ID sách |
| `.github/workflows/weekly-crawl.yml` | Lịch chạy hàng tuần + nút chạy tay |

## Cấu hình một lần

1. **Secret dịch tên sách (tùy chọn):** Settings → Secrets and variables → Actions → `ANTHROPIC_API_KEY`. Không có thì site vẫn chạy, chỉ thiếu tên tiếng Việt. Lần đầu dịch ~15.000 tên (giới hạn 3.000 tên/lần chạy, đổi bằng biến `TRANSLATE_MAX`).
2. **Vercel:** vercel.com → Add New Project → Import repo này → Framework: Other → Deploy. `vercel.json` đã cấu hình sẵn thư mục `public`.

## Link Google Drive

Site gốc không có link Drive. Thêm vào `data/links.json`:

```json
{ "OL45804W": { "drive": "https://drive.google.com/file/d/.../view" } }
```

Chỉ thêm tài liệu bạn có quyền chia sẻ (sách public domain, sách tác giả phát hành miễn phí, tài liệu nội bộ). Sách nào không có thì site dùng link gốc HackerBooks + Open Library.

## Chạy local

```bash
node scripts/crawl.mjs        # hoặc --file local.csv
cd public && python3 -m http.server 8000
```

Nguồn: [hackerbooks.org](https://hackerbooks.org) (roansh), metadata từ [Open Library](https://openlibrary.org).
