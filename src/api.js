import axios from "axios";
import ora from "ora";

// Tạo instance axios với các cấu hình mặc định
const api = axios.create({
  timeout: 30000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept: "application/json",
  },
});

/**
 * Hàm lấy danh sách truyện từ API
 */
export const fetchStories = async (
  baseUrl,
  collection = "POPULAR",
  size = 10
) => {
  try {
    const url = `${baseUrl}/story?collection=${collection}&size=${size}`;
    console.log(`Đang gọi API: ${url}`);

    const response = await api.get(url);

    // API trả về mảng trực tiếp
    if (Array.isArray(response.data)) {
      return response.data;
    }

    // API trả về object
    return response.data;
  } catch (error) {
    console.error(`Lỗi khi lấy danh sách truyện: ${error.message}`);
    throw error;
  }
};

/**
 * Hàm lấy thông tin chi tiết của một truyện
 */
export const fetchStoryDetail = async (baseUrl, storyId) => {
  try {
    const spinner = ora(`Đang lấy thông tin truyện: ${storyId}`).start();
    const url = `${baseUrl}/story/${storyId}`;
    const response = await api.get(url);
    spinner.succeed(`Đã lấy thông tin truyện: ${response.data.name}`);

    // Đảm bảo trả về thông tin đầy đủ, bao gồm field category
    return response.data;
  } catch (error) {
    console.error(`Lỗi khi lấy thông tin truyện: ${error.message}`);
    throw error;
  }
};

/**
 * Hàm lấy danh sách chapter của một truyện
 */
export const fetchChapters = async (baseUrl, storyId) => {
  try {
    // Chỉ sử dụng API /chapter (số ít) vì nó hoạt động tốt nhất
    const url = `${baseUrl}/story/${storyId}/chapter`;
    console.log(`Đang gọi API chapter: ${url}`);

    const response = await api.get(url);
    const data = response.data;

    // Xử lý các cấu trúc phản hồi khác nhau
    // API mottruyen.vn thường gói dữ liệu trong field "data"
    if (data && data.data && Array.isArray(data.data)) {
      console.log(
        `Tìm thấy ${data.data.length} chapters trong response.data.data`
      );
      return data.data;
    } else if (Array.isArray(data)) {
      console.log(`Tìm thấy ${data.length} chapters trong response.data`);
      return data;
    } else if (data && data.content && Array.isArray(data.content)) {
      console.log(
        `Tìm thấy ${data.content.length} chapters trong response.data.content`
      );
      return data.content;
    } else if (data && data.chapters && Array.isArray(data.chapters)) {
      console.log(
        `Tìm thấy ${data.chapters.length} chapters trong response.data.chapters`
      );
      return data.chapters;
    } else if (data && typeof data === "object") {
      // Log để debug
      console.log(
        "Cấu trúc phản hồi chapters:",
        JSON.stringify(data).substring(0, 200) + "..."
      );

      // Tìm mảng trong bất kỳ trường nào của object
      for (const key in data) {
        if (Array.isArray(data[key]) && data[key].length > 0) {
          // Kiểm tra nếu items có các thuộc tính như chapter/id thì có thể là danh sách chapter
          if (
            data[key][0].chapter !== undefined ||
            data[key][0].id !== undefined
          ) {
            console.log(
              `Tìm thấy ${data[key].length} chapters trong response.data.${key}`
            );
            return data[key];
          }
        }
      }
    }

    console.warn("Không thể tìm thấy chapters trong phản hồi API");
    return [];
  } catch (error) {
    console.error(`Lỗi khi lấy danh sách chapter: ${error.message}`);
    return [];
  }
};

/**
 * Hàm lấy nội dung của một chapter
 */
export const fetchChapterContent = async (baseUrl, storyId, chapterNumber) => {
  try {
    // Sử dụng trực tiếp URL với số thứ tự chapter
    const url = `${baseUrl}/story/${storyId}/chapter/${chapterNumber}`;
    console.log(`Lấy nội dung chapter ${chapterNumber}: ${url}`);

    const response = await api.get(url);

    // Kiểm tra nếu response có nội dung chapter
    if (response.data) {
      // Một số API đặt content trong trường data
      if (response.data.data && response.data.data.content) {
        console.log(`✓ Thành công! Lấy được nội dung chapter ${chapterNumber}`);
        return {
          ...response.data.data,
          title: response.data.data.chapterTitle || `Chương ${chapterNumber}`,
        };
      }
      // Trường hợp thông thường
      else if (response.data.content) {
        console.log(`✓ Thành công! Lấy được nội dung chapter ${chapterNumber}`);
        return {
          ...response.data,
          title: response.data.chapterTitle || `Chương ${chapterNumber}`,
        };
      }
    }

    throw new Error("Không tìm thấy nội dung chapter trong phản hồi API");
  } catch (err) {
    console.log(`⚠️ Lỗi khi lấy chapter ${chapterNumber}: ${err.message}`);
    return {
      title: `Chương ${chapterNumber}`,
      content: "Không thể lấy được nội dung chapter từ nguồn.",
      chapterTitle: null,
      chapter: chapterNumber,
    };
  }
};

export default {
  fetchStories,
  fetchStoryDetail,
  fetchChapters,
  fetchChapterContent,
};
