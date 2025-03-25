#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { NovelCrawler } from "./src/crawler.js";
import { TARGET_GENRES } from "./src/utils.js";

// Cấu hình CLI
program
  .option("-u, --url <url>", "URL API", "https://api.example.com")
  .option("-o, --output <path>", "Thư mục đầu ra", "./novels")
  .option("-m, --max <number>", "Số lượng truyện tối đa", "50")
  .option("-c, --collections <items>", "Collections", "POPULAR")
  .option("-d, --delay <range>", "Delay giữa các request (ms)", "1000-3000")
  .option("-g, --genres <items>", "Thể loại mục tiêu", "ngon-tinh,do-thi")
  .option("--max-per-genre <number>", "Số truyện tối đa mỗi thể loại", "50")
  .option("--min-chapters <number>", "Số chapter tối thiểu", "5")
  .option("--max-chapters <number>", "Số chapter tối đa", "50")
  .parse(process.argv);

// Và trong phần cấu hình
const options = {
  baseUrl: program.opts().url,
  outputDir: program.opts().output,
  maxStories: parseInt(program.opts().max, 10),
  collections: program.opts().collections.split(","),
  delayMin: parseInt(program.opts().delay.split("-")[0], 10),
  delayMax: parseInt(
    program.opts().delay.split("-")[1] || program.opts().delay,
    10
  ),
  targetGenres: program.opts().genres.split(","),
  maxPerGenre: parseInt(program.opts().maxPerGenre, 10),
  minChapters: parseInt(program.opts().minChapters, 10),
  maxChapters: parseInt(program.opts().maxChapters, 10),
};

/**
 * Hàm chính
 */
async function main() {
  let options = program.opts();

  // Chế độ tương tác
  if (options.interactive) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "url",
        message: "Nhập URL cơ sở của API:",
        default: options.url,
      },
      {
        type: "input",
        name: "output",
        message: "Nhập thư mục đầu ra:",
        default: options.output,
      },
      {
        type: "input",
        name: "max",
        message: "Nhập số lượng truyện tối đa cần lấy:",
        default: options.max,
        validate: (value) => (!isNaN(value) ? true : "Vui lòng nhập một số"),
      },
      {
        type: "input",
        name: "collections",
        message: "Nhập danh sách collections (ngăn cách bởi dấu phẩy):",
        default: options.collections,
      },
      {
        type: "input",
        name: "delay",
        message: "Nhập khoảng thời gian delay giữa các request (ms):",
        default: options.delay,
      },
      {
        type: "input",
        name: "maxPerGenre",
        message: "Nhập số lượng truyện tối đa cho mỗi thể loại:",
        default: options.maxPerGenre,
        validate: (value) => (!isNaN(value) ? true : "Vui lòng nhập một số"),
      },
    ]);

    options = { ...options, ...answers };
  }

  // Xử lý các tùy chọn
  const baseUrl = options.url;
  const outputDir = options.output;
  const maxStories = parseInt(options.max);
  const collections = options.collections.split(",");

  // Xử lý delay
  const [delayMin, delayMax] = options.delay.split("-").map(Number);

  // Số lượng truyện tối đa cho mỗi thể loại
  const maxStoriesPerGenre = parseInt(options.maxPerGenre);

  console.log(chalk.blue("\n=== Cấu hình ==="));
  console.log(`URL API: ${chalk.green(baseUrl)}`);
  console.log(`Thư mục đầu ra: ${chalk.green(outputDir)}`);
  console.log(`Số lượng truyện tối đa: ${chalk.green(maxStories)}`);
  console.log(`Collections: ${chalk.green(collections.join(", "))}`);
  console.log(`Delay: ${chalk.green(`${delayMin}-${delayMax}ms`)}`);
  console.log(
    `Số truyện tối đa mỗi thể loại: ${chalk.green(maxStoriesPerGenre)}`
  );

  console.log(chalk.blue("\n=== Thể loại mục tiêu ==="));
  console.log(chalk.green(TARGET_GENRES.join(", ")));

  // Khởi tạo crawler
  const crawler = new NovelCrawler(baseUrl, outputDir, {
    delayMin,
    delayMax,
    maxStoriesPerGenre,
    targetGenres: options.targetGenres,
    maxChapters: options.maxChapters,
    minChapters: options.minChapters,
    maxStories: maxStories,
  });

  // Bắt đầu crawl
  await crawler.start({
    collections,
    maxStories,
  });
}

// Chạy hàm chính
main().catch((error) => {
  console.error(chalk.red(`Lỗi: ${error.message}`));
  process.exit(1);
});
