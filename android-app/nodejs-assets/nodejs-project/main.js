'use strict';
/**
 * VPN Scanner Suite — لانچرِ تک‌پروسه برای اندروید (nodejs-mobile).
 *
 * مهم (باگی که با تست روی امولاتور پیدا شد): اسکنرهای express (نسخه ۵) موقع
 * تعریف route از `path-to-regexp` با Unicode property escape `\p{ID_Start}`
 * استفاده می‌کنند که Nodeِ داخل nodejs-mobile (با small-icu) آن را ندارد و
 * کل require آن اسکنر می‌ترکد. برای همین آن ۶ اسکنر روی گوشی بالا نمی‌آمدند و
 * پینگشان «بسته» می‌شد.
 *
 * راه‌حل: express را اصلاً بار نمی‌کنیم. رابط نیتیو لیست سرورها را از JSON
 * باندل‌شده می‌خواند و فقط به «پینگ» نیاز دارد. پس برای هر اسکنر express یک
 * سرور raw-http سبک می‌سازیم که تنها همان `src/services/probe.js` خودش را
 * require می‌کند و `/api/ping?host=` را سرو می‌کند. کد probe دست‌نمی‌خورد.
 *
 * Surfshark و Nord از قبل raw-http بودند (express ندارند) و سالم بالا می‌آیند،
 * پس همان server.js خودشان را require می‌کنیم.
 *
 * این پروسه Node واقعی با OpenSSL است (نه BoringSSL)، پس اثرانگشت TLS مثل
 * دسکتاپ است و پشت DPI سرورهای سالم را درست تشخیص می‌دهد.
 */
const http = require('http');
const path = require('path');

let bridge = null;
try { bridge = require('rn-bridge'); } catch { /* خارج از محیط موبایل */ }
function log(msg) {
  console.log(msg);
  try { bridge && bridge.channel.send(String(msg)); } catch { /* ignore */ }
}

// اسکنرهای express هنگام خطا process.exit می‌زنند؛ بی‌اثرش می‌کنیم.
process.exit = (code) => { console.log('⛔ ignore process.exit(' + code + ')'); };
process.on('uncaughtException', e => console.log('uncaught:', e && e.message));
process.on('unhandledRejection', e => console.log('unhandledRejection:', e && (e.message || e)));

const SCANNERS_ROOT = path.join(__dirname, 'scanners');

// اسکنرهای raw-http که سالم بالا می‌آیند → کل server.js خودشان را require می‌کنیم.
const RAW_SCANNERS = [
  { id: 'surfshark', name: 'Surfshark', dir: 'surfshark', entry: 'surf_server.js', port: 3002 },
  { id: 'nord',      name: 'NordVPN',   dir: 'nord',      entry: 'server.js',      port: 3000 },
];

// اسکنرهای express → فقط probe را برمی‌داریم و یک سرور پینگ سبک می‌سازیم.
const PING_SCANNERS = [
  { id: 'expressvpn', name: 'ExpressVPN', dir: 'expressvpn', port: 3003 },
  { id: 'purevpn',    name: 'PureVPN',    dir: 'purevpn',    port: 3004 },
  { id: 'mullvad',    name: 'Mullvad',    dir: 'mullvad',    port: 3005 },
  { id: 'pia',        name: 'PIA',        dir: 'pia',        port: 3006 },
  { id: 'windscribe', name: 'Windscribe', dir: 'windscribe', port: 3007 },
  { id: 'proton',     name: 'Proton VPN', dir: 'proton',     port: 3008 },
];

function loadRawScanner(s) {
  try {
    require(path.join(SCANNERS_ROOT, s.dir, s.entry));
    log('▶ ' + s.name + ' (raw) پورت ' + s.port);
  } catch (e) {
    log('✗ ' + s.name + ' خطا: ' + (e && e.message));
  }
}

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function startPingScanner(s) {
  let bestPing;
  try {
    ({ bestPing } = require(path.join(SCANNERS_ROOT, s.dir, 'src', 'services', 'probe.js')));
  } catch (e) {
    log('✗ ' + s.name + ' probe خطا: ' + (e && e.message));
    return;
  }
  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
    let pathname = '', query = {};
    try {
      const u = new URL(req.url, `http://${req.headers.host}`);
      pathname = u.pathname;
      query = Object.fromEntries(u.searchParams);
    } catch { pathname = (req.url || '').split('?')[0]; }

    if (pathname === '/api/ping') {
      const host = query.host;
      if (!host) return sendJSON(res, 400, { error: 'Missing host' });
      bestPing(host)
        .then(d => sendJSON(res, 200, { host, ...d }))
        .catch(() => sendJSON(res, 200, { host, ms: null, method: null, vpnAccessible: false }));
      return;
    }
    if (pathname === '/api/health') return sendJSON(res, 200, { ok: true });
    res.writeHead(404); res.end('Not found');
  });
  server.on('error', e => log('✗ ' + s.name + ' listen خطا: ' + (e && e.message)));
  server.listen(s.port, '127.0.0.1', () => log('▶ ' + s.name + ' (ping) پورت ' + s.port));
}

log('🚀 راه‌اندازی موتور اسکن...');
RAW_SCANNERS.forEach(loadRawScanner);
PING_SCANNERS.forEach(startPingScanner);

// به React Native اطلاع بده که موتور آماده است.
setTimeout(() => {
  log('✅ موتور آماده است');
  try { bridge && bridge.channel.post('shell-ready', { ready: true }); } catch { /* ignore */ }
}, 600);
