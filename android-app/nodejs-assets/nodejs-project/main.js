'use strict';
/**
 * VPN Scanner Suite — لانچرِ تک‌پروسه برای اندروید (nodejs-mobile).
 *
 * برخلاف دسکتاپ که هر اسکنر یک پروسه‌ی جدا بود، در nodejs-mobile فقط یک
 * پروسه‌ی Node داریم. پس هر ۸ اسکنر را در همین پروسه require می‌کنیم؛ هر
 * کدام روی پورت پیش‌فرض خودش روی 127.0.0.1 بالا می‌آید. سپس یک سرور پوسته
 * روی SHELL_PORT صفحه‌ی shell.html را با تزریق لیست اسکنرها سرو می‌کند و
 * شماره‌اش را از کانال rn-bridge به React Native می‌فرستد.
 *
 * مهم: این پروسه Node واقعی با OpenSSL است (نه BoringSSL)، پس اثرانگشت TLS
 * مثل حالت وب/دسکتاپ است و پشت DPI سرورهای سالم را درست تشخیص می‌دهد.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

let bridge = null;
try { bridge = require('rn-bridge'); } catch { /* خارج از محیط موبایل */ }
function log(msg) {
  console.log(msg);
  try { bridge && bridge.channel.send(String(msg)); } catch { /* ignore */ }
}

// --- شیم process.exit: اسکنرهای express هنگام خطای استارت process.exit(1)
// می‌زنند که در حالت تک‌پروسه کل Node را می‌کشد. اینجا آن را بی‌اثر می‌کنیم
// تا خطای یک اسکنر بقیه را از پا درنیاورد. (کد اسکنرها دست‌نمی‌خورد.)
const realExit = process.exit.bind(process);
process.exit = (code) => { console.log('⛔ نادیده‌گرفتن process.exit(' + code + ') در حالت تک‌پروسه'); };
process.on('uncaughtException', e => console.log('uncaught:', e && e.message));
process.on('unhandledRejection', e => console.log('unhandledRejection:', e && (e.message || e)));

const SHELL_PORT = 8080;

// لیست اسکنرها — پورت‌ها همان پیش‌فرض هر اسکنر (داخل کدشان) می‌مانند چون
// PORT را ست نمی‌کنیم؛ فقط برای shell.html باید بدانیم کدام پورت کجاست.
const SCANNERS = [
  { id: 'surfshark',  name: 'Surfshark',  dir: 'surfshark',  entry: 'surf_server.js', port: 3002 },
  { id: 'nord',       name: 'NordVPN',    dir: 'nord',       entry: 'server.js',      port: 3000 },
  { id: 'expressvpn', name: 'ExpressVPN', dir: 'expressvpn', entry: 'server.js',      port: 3003 },
  { id: 'purevpn',    name: 'PureVPN',    dir: 'purevpn',    entry: 'server.js',      port: 3004 },
  { id: 'mullvad',    name: 'Mullvad',    dir: 'mullvad',    entry: 'server.js',      port: 3005 },
  { id: 'pia',        name: 'PIA',        dir: 'pia',        entry: 'server.js',      port: 3006 },
  { id: 'windscribe', name: 'Windscribe', dir: 'windscribe', entry: 'server.js',      port: 3007 },
  { id: 'proton',     name: 'Proton VPN', dir: 'proton',     entry: 'server.js',      port: 3008 },
];

const SCANNERS_ROOT = path.join(__dirname, 'scanners');

// هر اسکنر را در همین پروسه require می‌کنیم. هر فایل serverِ خودش روی
// require اجرا می‌شود و listen می‌کند. require در try جدا تا خطای یکی
// مانع بقیه نشود.
function loadScanner(s) {
  const entryAbs = path.join(SCANNERS_ROOT, s.dir, s.entry);
  try {
    require(entryAbs);
    log('▶ ' + s.name + ' لود شد (پورت ' + s.port + ')');
  } catch (e) {
    log('✗ ' + s.name + ' خطا: ' + (e && e.message));
  }
}

function startShell() {
  let shellHtml = fs.readFileSync(path.join(__dirname, 'shell.html'), 'utf8');
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      const injected = shellHtml.replace(
        '/*__SCANNERS__*/',
        JSON.stringify(SCANNERS.map(({ id, name, port }) => ({ id, name, port })))
      );
      res.end(injected);
      return;
    }
    res.writeHead(404); res.end('Not found');
  });
  server.listen(SHELL_PORT, '127.0.0.1', () => {
    log('✅ پوسته آماده است → http://localhost:' + SHELL_PORT + '/');
    // به React Native اطلاع بده که UI آماده‌ی بارگذاری است.
    try { bridge && bridge.channel.post('shell-ready', { port: SHELL_PORT }); } catch { /* ignore */ }
  });
}

log('🚀 در حال راه‌اندازی اسکنرها (تک‌پروسه)...');
SCANNERS.forEach(loadScanner);
// کمی صبر تا listenها مستقر شوند، سپس پوسته.
setTimeout(startShell, 800);
