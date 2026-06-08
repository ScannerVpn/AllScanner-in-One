'use strict';
/**
 * VPN Scanner Suite — یک نقطه‌ی ورود واحد
 * هر چهار اسکنر را به صورت پروسه‌ی جداگانه بالا می‌آورد و یک صفحه‌ی
 * پوسته (shell) با تب در پورت SHELL_PORT سرو می‌کند که هر اسکنر را
 * داخل iframe خودش نشان می‌دهد.
 */
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { spawn } = require('child_process');

let SHELL_PORT = Number(process.env.SHELL_PORT) || 8080;
const SHELL_PORT_BASE = SHELL_PORT;

// تعریف هر اسکنر: پورت، پوشه، و فایل سروری که باید با node اجرا شود
const SCANNERS = [
  { id: 'surfshark',  name: 'Surfshark',  port: 3002, dir: 'scanners/surfshark',  entry: 'surf_server.js' },
  { id: 'nord',       name: 'NordVPN',    port: 3000, dir: 'scanners/nord',       entry: 'server.js'      },
  { id: 'expressvpn', name: 'ExpressVPN', port: 3003, dir: 'scanners/expressvpn', entry: 'server.js'      },
  { id: 'purevpn',    name: 'PureVPN',    port: 3004, dir: 'scanners/purevpn',    entry: 'server.js'      },
  { id: 'mullvad',    name: 'Mullvad',    port: 3005, dir: 'scanners/mullvad',    entry: 'server.js'      },
  { id: 'pia',        name: 'PIA',        port: 3006, dir: 'scanners/pia',        entry: 'server.js'      },
  { id: 'windscribe', name: 'Windscribe', port: 3007, dir: 'scanners/windscribe', entry: 'server.js'      },
  { id: 'proton',     name: 'Proton VPN', port: 3008, dir: 'scanners/proton',     entry: 'server.js'      },
];

const DATA_FILE = path.join(__dirname, 'data', 'servers.json');
let BUNDLED_SERVERS = {};
try {
  BUNDLED_SERVERS = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (e) {
  console.warn('⚠ لیست باندل‌شده یافت نشد:', DATA_FILE);
}

const children = [];

function startScanner(s) {
  const cwd = path.join(__dirname, s.dir);
  const child = spawn(process.execPath, [s.entry], {
    cwd,
    env: { ...process.env, PORT: String(s.port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const tag = `[${s.name}]`;
  child.stdout.on('data', d => process.stdout.write(`${tag} ${d}`));
  child.stderr.on('data', d => process.stderr.write(`${tag} ${d}`));
  child.on('exit', code => {
    if (code && code !== 0) {
      console.log(`${tag} متوقف شد (code ${code}) — احتمالاً پورت ${s.port} از قبل اشغال است (نمونه‌ی دیگری در حال اجراست؟)`);
    } else {
      console.log(`${tag} exited (code ${code})`);
    }
  });
  children.push(child);
}

function shutdown() {
  console.log('\n⏹  در حال بستن همه‌ی اسکنرها...');
  for (const c of children) { try { c.kill(); } catch {} }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// --- بالا آوردن اسکنرها ---
console.log('🚀 در حال راه‌اندازی اسکنرها...');
SCANNERS.forEach(startScanner);

// --- سرور پوسته (تب‌ها + iframe) ---
const shellHtml = fs.readFileSync(path.join(__dirname, 'shell.html'), 'utf8');

const shell = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    // لیست اسکنرها را به صورت JSON داخل صفحه تزریق می‌کنیم
    const injected = shellHtml.replace(
      '/*__SCANNERS__*/',
      JSON.stringify(SCANNERS.map(({ id, name, port }) => ({ id, name, port })))
    );
    res.end(injected);
    return;
  }
  if (req.url && req.url.startsWith('/api/list')) {
    const id = new URL(req.url, 'http://localhost').searchParams.get('provider');
    const servers = (id && BUNDLED_SERVERS[id]) || [];
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ servers, count: servers.length }));
    return;
  }
  res.writeHead(404); res.end('Not found');
});

// اگر پورت اشغال بود، خودکار پورت بعدی را امتحان می‌کنیم
shell.on('error', err => {
  if (err.code === 'EADDRINUSE' && SHELL_PORT < SHELL_PORT_BASE + 20) {
    SHELL_PORT++;
    console.log(`⚠ پورت ${SHELL_PORT - 1} مشغول است؛ تلاش روی ${SHELL_PORT}...`);
    setTimeout(() => shell.listen(SHELL_PORT), 150);
  } else {
    console.error(`❌ نمی‌توان سرور پوسته را اجرا کرد: ${err.message}`);
    shutdown();
  }
});

shell.listen(SHELL_PORT, () => {
  const url = `http://localhost:${SHELL_PORT}/`;
  console.log(`\n✅ VPN Scanner Suite آماده است → ${url}\n`);
  openBrowser(url);
});

function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'win32' ? 'cmd'
            : platform === 'darwin' ? 'open'
            : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try { spawn(cmd, args, { stdio: 'ignore', detached: true }).unref(); } catch {}
}
