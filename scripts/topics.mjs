// Từ điển Việt hóa 32 chủ đề của hackerbooks.org (slug -> tên tiếng Việt)
export const TOPICS = {
  "fiction": "Tiểu thuyết & Văn học",
  "politics-society": "Chính trị & Xã hội",
  "biography": "Tiểu sử & Hồi ký",
  "programming": "Lập trình",
  "psychology": "Tâm lý học",
  "business": "Kinh doanh",
  "science-fiction": "Khoa học viễn tưởng",
  "history": "Lịch sử",
  "economics": "Kinh tế học",
  "biology": "Sinh học",
  "other": "Khác",
  "math": "Toán học",
  "philosophy": "Triết học",
  "computer-science": "Khoa học máy tính",
  "physics": "Vật lý",
  "lifestyle": "Lối sống",
  "religion": "Tôn giáo",
  "design": "Thiết kế",
  "productivity": "Năng suất",
  "writing": "Viết lách",
  "fantasy": "Kỳ ảo (Fantasy)",
  "arts": "Nghệ thuật",
  "systems": "Hệ thống (Systems)",
  "web": "Web",
  "startups": "Khởi nghiệp (Startups)",
  "popular-science": "Khoa học phổ thông",
  "software-engineering": "Kỹ nghệ phần mềm (Software Engineering)",
  "hardware": "Phần cứng (Hardware)",
  "data-statistics": "Dữ liệu & Thống kê",
  "security": "Bảo mật (Security)",
  "ai-ml": "AI & Machine Learning",
  "lisp-functional": "Lisp & Lập trình hàm (Functional)",
};

export const slugify = (s) =>
  String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Bảng tra ngược theo tên tiếng Anh hiển thị trên site gốc
const ALIASES = {
  "fiction-literature": "fiction", "literature": "fiction",
  "politics-and-society": "politics-society", "politics": "politics-society",
  "biography-memoir": "biography", "sci-fi": "science-fiction",
  "math-mathematics": "math", "mathematics": "math",
  "data-and-statistics": "data-statistics", "data": "data-statistics", "statistics": "data-statistics",
  "ai-and-ml": "ai-ml", "ai": "ai-ml", "machine-learning": "ai-ml",
  "lisp-and-functional": "lisp-functional", "lisp": "lisp-functional",
  "art": "arts", "startup": "startups",
};

export function normalizeTopic(raw) {
  const s = slugify(raw);
  if (!s) return null;
  if (TOPICS[s]) return s;
  if (ALIASES[s]) return ALIASES[s];
  return s; // giữ nguyên chủ đề lạ, site sẽ hiển thị tên gốc
}
