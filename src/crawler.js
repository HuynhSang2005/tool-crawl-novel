import path from "path";
import chalk from "chalk";
import ora from "ora";
import {
  fetchStories,
  fetchStoryDetail,
  fetchChapters,
  fetchChapterContent,
} from "./api.js";
import {
  parseHtmlToText,
  ensureDirectoryExists,
  saveChapterToFile,
  delay,
  getRandomInt,
  hasTargetGenre,
  filterTargetGenres,
} from "./utils.js";

/**
 * Lớp chính để crawl dữ liệu
 */
export class NovelCrawler {
  /**
   * Khởi tạo crawler
   * @param {string} baseUrl - URL cơ sở của API
   * @param {string} outputDir - Thư mục đầu ra
   * @param {Object} options - Các tùy chọn bổ sung
   */
  constructor(baseUrl, outputDir = "./novels", options = {}) {
    this.baseUrl = baseUrl;
    this.outputDir = outputDir;
    this.options = {
      minChapters: 7,
      maxChapters: 20,
      delayMin: 1000, // 1 giây
      delayMax: 3000, // 3 giây
      maxStoriesPerGenre: 3,
      maxStories: 10, // Mặc định là 10 truyện
      ...options,
    };

    // Theo dõi số lượng truyện đã lấy theo thể loại
    this.genreCounter = {};
  }

  /**
   * Lấy danh sách truyện
   * @param {string} collection - Loại collection (POPULAR, NEW, ...)
   * @param {number} page - Số trang
   * @param {number} size - Số lượng truyện mỗi trang
   * @returns {Promise<Array>} - Danh sách truyện
   */
  async getStories(collection = "POPULAR", page = 0, size = 10) {
    const spinner = ora(`Đang lấy danh sách truyện từ ${collection}`).start();

    try {
      // Sử dụng kích thước từ tham số, hoặc từ options nếu có
      const requestSize = this.options.maxStories || size;
      console.log(`Đang lấy ${requestSize} truyện từ collection ${collection}`);

      const stories = await fetchStories(this.baseUrl, collection, requestSize);

      if (!stories || (Array.isArray(stories) && stories.length === 0)) {
        spinner.warn(`Không có truyện nào từ collection ${collection}`);
        return [];
      }

      // Xử lý dữ liệu trả về
      let result = [];
      if (Array.isArray(stories)) {
        result = stories;
      } else if (stories.content && Array.isArray(stories.content)) {
        result = stories.content;
      } else {
        result = [stories];
      }

      spinner.succeed(`Đã lấy ${result.length} truyện từ ${collection}`);
      return result;
    } catch (error) {
      spinner.fail(`Lỗi khi lấy danh sách truyện: ${error.message}`);
      return [];
    }
  }

  /**
   * Lấy chi tiết truyện
   * @param {number} storyId - ID của truyện
   * @returns {Promise<Object>} - Thông tin chi tiết truyện
   */
  async getStoryDetail(storyId) {
    const spinner = ora(`Đang lấy thông tin truyện ID: ${storyId}`).start();

    try {
      const story = await fetchStoryDetail(this.baseUrl, storyId);
      spinner.succeed(`Đã lấy thông tin truyện: ${story.name}`);
      return story;
    } catch (error) {
      spinner.fail(`Lỗi khi lấy thông tin truyện: ${error.message}`);
      return null;
    }
  }

  /**
   * Lấy danh sách chapter của truyện
   * @param {number} storyId - ID của truyện
   * @returns {Promise<Array>} - Danh sách chapter
   */
  async getChapters(storyId) {
    const spinner = ora(
      `Đang lấy danh sách chapter của truyện ID: ${storyId}`
    ).start();

    try {
      const chapters = await fetchChapters(this.baseUrl, storyId);
      spinner.succeed(`Đã lấy ${chapters.length} chapter`);
      return chapters;
    } catch (error) {
      spinner.fail(`Lỗi khi lấy danh sách chapter: ${error.message}`);
      return [];
    }
  }

  /**
   * Lấy nội dung của một chapter
   * @param {number} storyId - ID của truyện
   * @param {number} chapterId - ID của chapter
   * @returns {Promise<Object>} - Nội dung chapter
   */
  async getChapterContent(storyId, chapterId) {
    const spinner = ora(`Đang lấy nội dung chapter ID: ${chapterId}`).start();

    try {
      const chapter = await fetchChapterContent(
        this.baseUrl,
        storyId,
        chapterId
      );
      spinner.succeed(
        `Đã lấy nội dung chapter: ${
          chapter.title ||
          chapter.chapterTitle ||
          `Chương ${chapter.chapter || "?"}`
        }`
      );
      return chapter;
    } catch (error) {
      spinner.fail(`Lỗi khi lấy nội dung chapter: ${error.message}`);
      return null;
    }
  }

  /**
   * Xử lý và lưu nội dung của một truyện
   * @param {Object} story - Thông tin truyện
   * @returns {Promise<boolean>} - true nếu thành công
   */
  async processStory(story) {
    console.log(chalk.yellow(`=== Đang xử lý truyện: ${story.name} ===`));

    let storyDetail = story;

    try {
      storyDetail = await fetchStoryDetail(this.baseUrl, story.id);
    } catch (error) {
      console.log(`Không thể lấy thông tin chi tiết truyện: ${error.message}`);
      // Tiếp tục với thông tin hiện có
    }

    // Lấy danh sách chapter
    const spinner = ora(
      `Đang lấy danh sách chapter của truyện ID: ${story.id}`
    ).start();
    let chapters = await fetchChapters(this.baseUrl, story.id);

    if (!chapters || chapters.length === 0) {
      spinner.fail(`Truyện "${story.name}" không có chapter nào`);
      return false;
    }

    spinner.succeed(`Đã lấy ${chapters.length} chapter`);

    // Tạo thư mục cho truyện
    const storyDir = path.join(
      this.outputDir,
      story.slug || `story-${story.id}`
    );
    await ensureDirectoryExists(storyDir);

    // Tạo và lưu file info.json với trường categories
    const storyInfo = {
      id: story.id,
      name: story.name,
      slug: story.slug,
      author: story.author?.name || "Không rõ",
      // Lấy từ category của API nếu có
      categories: storyDetail.category
        ? storyDetail.category.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.index || c.slug || c.id,
          }))
        : storyDetail.categories
        ? storyDetail.categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug || c.index || c.id,
          }))
        : storyDetail.genres
        ? storyDetail.genres.map((g) => ({
            id: g.id,
            name: g.name,
            slug: g.slug || g.id,
          }))
        : [],
      introduce: parseHtmlToText(story.introduce || ""),
      image: story.image || null,
      coverUrl: story.image
        ? story.image.startsWith("http")
          ? story.image
          : `${this.baseUrl}${story.image}`
        : null,
      chaptersInfo: chapters.map((ch) => ({
        id: ch.id,
        chapter: ch.chapter,
        chapterTitle: ch.chapterTitle,
        countWord: ch.countWord || 0,
        createdAt: ch.createdAt || null,
      })),
      crawledAt: new Date().toISOString(),
    };

    // Lưu thông tin truyện vào file info.json
    await saveChapterToFile(
      storyDir,
      "info.json",
      JSON.stringify(storyInfo, null, 2)
    );
    console.log(
      `✓ Đã lưu thông tin truyện với ${storyInfo.categories.length} thể loại vào: info.json`
    );

    // THAY ĐỔI QUAN TRỌNG: Lấy số lượng chapter tối đa cần xử lý
    const maxChapters = Math.min(
      this.options.maxChapters || 50,
      chapters.length // Giới hạn theo số chương có sẵn
    );

    console.log(
      `Lấy ${maxChapters} chapter đầu tiên của truyện "${story.name}"`
    );

    // XỬ LÝ CHAPTER THEO THỨ TỰ TỪ 1 TỚI maxChapters
    for (let i = 1; i <= maxChapters; i++) {
      if (i > 1) {
        const delayTime = getRandomInt(
          this.options.delayMin,
          this.options.delayMax
        );
        await delay(delayTime);
      }

      // Lấy nội dung chapter theo số thứ tự (1, 2, 3...)
      const chapterContent = await fetchChapterContent(
        this.baseUrl,
        story.id,
        i
      );
      if (!chapterContent || !chapterContent.content) {
        console.log(`Không thể lấy nội dung chapter ${i}, bỏ qua`);
        continue;
      }

      // Xử lý nội dung
      const content = parseHtmlToText(chapterContent.content);

      // Lấy tiêu đề chapter
      const chapterTitle = chapterContent.chapterTitle || `Chương ${i}`;

      // Tạo nội dung file
      const fileContent = `${chapterTitle}\n\n${content}`;

      // Lưu file với tên chuong1.txt, chuong2.txt, ...
      const fileName = `chuong${i}.txt`;
      await saveChapterToFile(storyDir, fileName, fileContent);
      console.log(`✓ Đã lưu: ${fileName} (Chapter ${i})`);
    }

    return true;
  }

  /**
   * Bắt đầu quá trình crawl
   * @param {Object} options - Các tùy chọn
   * @returns {Promise<void>}
   */
  async start(options = {}) {
    const {
      collections = ["POPULAR", "NEW"],
      maxStories = 10,
      startPage = 0,
    } = options;

    this.options.maxStories = maxStories;

    console.log(
      chalk.blue(`\n=== Bắt đầu crawl dữ liệu từ ${this.baseUrl} ===\n`)
    );

    // Tạo thư mục đầu ra
    await ensureDirectoryExists(this.outputDir);

    let processedStories = 0;
    let page = startPage;

    // Lặp qua các collection
    for (const collection of collections) {
      page = startPage;

      while (processedStories < maxStories) {
        // Lấy danh sách truyện
        const stories = await this.getStories(collection, page, maxStories);
        if (!stories || stories.length === 0) {
          console.log(
            chalk.yellow(`Không còn truyện nào trong collection ${collection}`)
          );
          break;
        }

        // Xử lý từng truyện
        for (const story of stories) {
          if (processedStories >= maxStories) break;

          // Lấy chi tiết truyện
          const storyDetail = await this.getStoryDetail(story.id);
          if (!storyDetail) continue;

          // Xử lý truyện
          const success = await this.processStory(storyDetail);

          if (success) {
            processedStories++;

            // Delay giữa các truyện
            const delayTime = getRandomInt(
              this.options.delayMin * 2,
              this.options.delayMax * 2
            );
            await delay(delayTime);
          }
        }

        // Chuyển sang trang tiếp theo
        page++;

        // Delay giữa các trang
        const pageDelayTime = getRandomInt(
          this.options.delayMin,
          this.options.delayMax
        );
        await delay(pageDelayTime);
      }

      if (processedStories >= maxStories) break;
    }

    console.log(
      chalk.green(`\n=== Đã hoàn thành crawl ${processedStories} truyện ===\n`)
    );
  }
}

export default NovelCrawler;
