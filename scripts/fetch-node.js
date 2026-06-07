'use strict';
/**
 * دانلود خودکار Node.js واقعی (OpenSSL) برای باندل‌شدن داخل اپ.
 *
 * چرا لازم است: اسکنرها باید با Node مبتنی بر OpenSSL اجرا شوند، نه با
 * Node داخل Electron (که BoringSSL است و اثرانگشتِ TLS متفاوتش پشت DPI
 * ریست می‌شود و همه‌ی سرورها «قرمز» می‌شوند). این باینری در گیت نیست
 * (حجیم است) و موقع نصب/بیلد دانلود می‌شود.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const NODE_VERSION = 'v24.16.0';
const DEST_DIR = path.join(__dirname, '..', 'vendor', 'node');
const DEST = path.join(DEST_DIR, 'node.exe');
const URL = `https://nodejs.org/dist/${NODE_VERSION}/win-x64/node.exe`;

if (process.platform !== 'win32') {
  console.log('[fetch-node] غیرویندوزی — رد شد (اپ فعلاً فقط برای ویندوز ساخته می‌شود).');
  process.exit(0);
}

if (fs.existsSync(DEST) && fs.statSync(DEST).size > 10 * 1024 * 1024) {
  console.log('[fetch-node] Node باندل‌شده از قبل موجود است — رد شد.');
  process.exit(0);
}

fs.mkdirSync(DEST_DIR, { recursive: true });
console.log(`[fetch-node] در حال دانلود Node ${NODE_VERSION} (win-x64)…`);

function download(url, file, redirects = 0) {
  https.get(url, res => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      if (redirects > 5) { file.close(); fail(new Error('too many redirects')); return; }
      res.resume();
      return download(res.headers.location, file, redirects + 1);
    }
    if (res.statusCode !== 200) { file.close(); fail(new Error('HTTP ' + res.statusCode)); return; }
    res.pipe(file);
    file.on('finish', () => file.close(() => {
      console.log(`[fetch-node] انجام شد → ${DEST}`);
    }));
  }).on('error', fail);
}

function fail(err) {
  console.error('[fetch-node] خطا در دانلود:', err.message);
  try { fs.unlinkSync(DEST); } catch {}
  process.exit(1);
}

download(URL, fs.createWriteStream(DEST));
