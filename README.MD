# Novel Crawler

Tool crawl dữ liệu truyện từ API.

## Cài đặt

```bash
# Clone repository
git clone <repository-url>
cd novel-crawler

# Cài đặt dependencies
npm install

# Chế độ tương tác
node index.js --interactive

# Tùy chỉnh URL API
node index.js --url https://api.mottruyen.vn/api/v1

# Tùy chỉnh thư mục đầu ra
node index.js --output ./my-novels

# Tùy chỉnh số lượng truyện tối đa
node index.js --max 20

# Tùy chỉnh collections
node index.js --collections POPULAR,NEW,HOT

# Tùy chỉnh delay
node index.js --delay 2000-5000

# Tùy chỉnh số lượng truyện tối đa cho mỗi thể loại
node index.js --max-per-genre 5
```
# tool-crawl-novel
