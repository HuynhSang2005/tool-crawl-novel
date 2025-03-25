import fs from "fs-extra";
import path from "path";
import { htmlToText } from "html-to-text";

/**
 * Danh sách các thể loại cần lấy
 */
export const TARGET_GENRES = [
  "he-thong",
  "kinh-di",
  "do-thi",
  "ngon-tinh",
  "huyen-huyen",
  "bach-hop",
  "xuyen-khong",
  "dam-my",
];

/**
 * Chuyển đổi HTML sang text thuần
 * @param {string} html - Chuỗi HTML cần chuyển đổi
 * @returns {string} - Chuỗi text đã chuyển đổi
 */
export const parseHtmlToText = (html) => {
  if (!html) return "";

  return htmlToText(html, {
    wordwrap: 130,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
    ],
  });
};

/**
 * Tạo thư mục nếu chưa tồn tại
 * @param {string} dirPath - Đường dẫn thư mục
 */
export const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.ensureDir(dirPath);
  } catch (error) {
    console.error(`Lỗi khi tạo thư mục ${dirPath}: ${error.message}`);
    throw error;
  }
};

/**
 * Lưu nội dung chapter vào file
 * @param {string} dirPath - Đường dẫn thư mục
 * @param {string} fileName - Tên file
 * @param {string} content - Nội dung cần lưu
 */
export const saveChapterToFile = async (dirPath, fileName, content) => {
  try {
    // Đảm bảo thư mục tồn tại
    await ensureDirectoryExists(dirPath);

    // Đường dẫn đầy đủ
    const filePath = path.join(dirPath, fileName);

    // Ghi file
    await fs.writeFile(filePath, content, "utf8");

    // Không hiển thị log ở đây - để cho hàm gọi hiển thị
  } catch (error) {
    console.error(`Lỗi khi lưu file ${fileName}: ${error.message}`);
    throw error;
  }
};

/**
 * Tạo một độ trễ (delay)
 * @param {number} ms - Thời gian trễ tính bằng millisecond
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lấy số ngẫu nhiên trong khoảng
 * @param {number} min - Giá trị nhỏ nhất
 * @param {number} max - Giá trị lớn nhất
 * @returns {number} - Số ngẫu nhiên
 */
export const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Kiểm tra xem truyện có thuộc thể loại mục tiêu không
 * @param {Array} categories - Danh sách thể loại của truyện
 * @param {Array} targetGenres - Danh sách thể loại mục tiêu
 * @returns {boolean} - true nếu có ít nhất một thể loại mục tiêu
 */
export const hasTargetGenre = (categories, targetGenres = TARGET_GENRES) => {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return false;
  }

  if (
    !targetGenres ||
    !Array.isArray(targetGenres) ||
    targetGenres.length === 0
  ) {
    // Nếu không có mục tiêu, coi như mọi thể loại đều hợp lệ
    return true;
  }

  // Kiểm tra linh hoạt
  return categories.some((category) => {
    if (!category) return false;

    // Nếu category là string
    if (typeof category === "string") {
      return targetGenres.includes(category);
    }

    // Nếu category là object
    const slug = category.slug || category.id || "";
    const name = category.name || "";

    return targetGenres.some(
      (target) =>
        slug === target ||
        name.toLowerCase() === target.toLowerCase() ||
        slug.includes(target) ||
        target.includes(slug)
    );
  });
};

/**
 * Lọc danh sách thể loại theo thể loại mục tiêu
 * @param {Array} categories - Danh sách thể loại của truyện
 * @param {Array} targetGenres - Danh sách thể loại mục tiêu
 * @returns {Array} - Danh sách thể loại đã lọc
 */
export const filterTargetGenres = (
  categories,
  targetGenres = TARGET_GENRES
) => {
  if (!categories || !Array.isArray(categories)) {
    return [];
  }

  if (
    !targetGenres ||
    !Array.isArray(targetGenres) ||
    targetGenres.length === 0
  ) {
    // Nếu không có mục tiêu, trả về tất cả thể loại
    return categories;
  }

  return categories.filter((category) => {
    if (!category) return false;

    // Nếu category là string
    if (typeof category === "string") {
      return targetGenres.includes(category);
    }

    // Nếu category là object
    const slug = category.slug || category.id || "";
    const name = category.name || "";

    return targetGenres.some(
      (target) =>
        slug === target ||
        name.toLowerCase() === target.toLowerCase() ||
        slug.includes(target) ||
        target.includes(slug)
    );
  });
};

export default {
  TARGET_GENRES,
  parseHtmlToText,
  ensureDirectoryExists,
  saveChapterToFile,
  delay,
  getRandomInt,
  hasTargetGenre,
  filterTargetGenres,
};
