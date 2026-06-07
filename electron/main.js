'use strict';
/**
 * VPN Scanner Suite — ورودی اپ Electron
 *
 * نقش: همان کاری که suite.js می‌کرد، ولی به‌جای باز کردن مرورگر سیستم،
 * یک پنجره‌ی نیتیو می‌سازد. هر اسکنر را به‌صورت پروسه‌ی Node جدا (با
 * ELECTRON_RUN_AS_NODE) و روی یک پورتِ آزادِ داینامیک اجرا می‌کند، یک
 * http server کوچک برای پوسته‌ی تب‌دار (shell.html) بالا می‌آورد و آن را
 * داخل BrowserWindow نشان می‌دهد.
 */
const { app, BrowserWindow, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getFreePort } = require('./port-utils');

// تعریف اسکنرها — پورت‌ها در زمان اجرا به‌صورت داینامیک تخصیص می‌یابند.
const SCANNERS = [
  { id: 'surfshark',  name: 'Surfshark',  dir: 'surfshark',  entry: 'surf_server.js' },
  { id: 'nord',       name: 'NordVPN',    dir: 'nord',       entry: 'server.js'      },
  { id: 'expressvpn', name: 'ExpressVPN', dir: 'expressvpn', entry: 'server.js'      },
  { id: 'purevpn',    name: 'PureVPN',    dir: 'purevpn',    entry: 'server.js'      },
  { id: 'mullvad',    name: 'Mullvad',    dir: 'mullvad',    entry: 'server.js'      },
  { id: 'pia',        name: 'PIA',        dir: 'pia',        entry: 'server.js'      },
  { id: 'windscribe', name: 'Windscribe', dir: 'windscribe', entry: 'server.js'      },
  { id: 'proton',     name: 'Proton VPN', dir: 'proton',     entry: 'server.js'      },
];

// مسیر ریشه‌ی اسکنرها: در حالت توسعه کنار پروژه، در حالت پکیج‌شده داخل resources.
const SCANNERS_ROOT = app.isPackaged
  ? path.join(process.resourcesPath, 'scanners')
  : path.join(__dirname, '..', 'scanners');

// مسیر Node واقعیِ باندل‌شده (OpenSSL). اسکنرها باید با این اجرا شوند، نه با
// Node داخل Electron — چون Electron از BoringSSL استفاده می‌کند و اثرانگشتِ
// TLS ClientHello متفاوتی دارد که پشت DPI (مثل ایران) ریست می‌شود و باعث
// «قرمزشدن» همه‌ی سرورها می‌گردد. با Node واقعی، رفتار دقیقاً مثل حالت وب است.
const NODE_BIN = app.isPackaged
  ? path.join(process.resourcesPath, 'node', 'node.exe')
  : path.join(__dirname, '..', 'vendor', 'node', 'node.exe');
const HAS_BUNDLED_NODE = fs.existsSync(NODE_BIN);
if (!HAS_BUNDLED_NODE) {
  console.warn('⚠ Node باندل‌شده یافت نشد؛ بازگشت به Node داخل Electron (احتمال قرمزشدن سرورها پشت DPI).');
}

const children = [];
let shellServer = null;
let mainWindow = null;
let quitting = false;

function startScanner(s, attempt = 0) {
  return getFreePort().then(port => {
    s.port = port;
    const cwd = path.join(SCANNERS_ROOT, s.dir);
    const entryAbs = path.join(cwd, s.entry);
    // ترجیحاً با Node واقعیِ باندل‌شده (OpenSSL)؛ در نبودش با Node داخل Electron.
    const bin = HAS_BUNDLED_NODE ? NODE_BIN : process.execPath;
    const env = HAS_BUNDLED_NODE
      ? { ...process.env, PORT: String(port) }
      : { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(port) };
    const child = spawn(bin, [entryAbs], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    s.child = child;
    children.push(child);

    const tag = `[${s.name}]`;
    child.stdout.on('data', d => process.stdout.write(`${tag} ${d}`));
    child.stderr.on('data', d => process.stderr.write(`${tag} ${d}`));
    child.on('exit', code => {
      const idx = children.indexOf(child);
      if (idx !== -1) children.splice(idx, 1);
      if (quitting) return;
      if (code && code !== 0 && attempt === 0) {
        // احتمال نادرِ اشغال‌شدن پورت بین تخصیص و bind — یک‌بار با پورت تازه retry.
        console.log(`${tag} با کد ${code} بسته شد؛ تلاش مجدد با پورت تازه...`);
        startScanner(s, attempt + 1);
      } else if (code && code !== 0) {
        console.log(`${tag} متوقف شد (code ${code}).`);
      }
    });
  });
}

function startShellServer() {
  const shellHtml = fs.readFileSync(path.join(__dirname, '..', 'shell.html'), 'utf8');
  return getFreePort().then(port => new Promise((resolve, reject) => {
    shellServer = http.createServer((req, res) => {
      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        const injected = shellHtml.replace(
          '/*__SCANNERS__*/',
          JSON.stringify(SCANNERS.map(({ id, name, port }) => ({ id, name, port })))
        );
        res.end(injected);
        return;
      }
      res.writeHead(404);
      res.end('Not found');
    });
    shellServer.on('error', reject);
    shellServer.listen(port, '127.0.0.1', () => resolve(port));
  }));
}

function createWindow(shellPort) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: '#0d1117',
    title: 'VPN Scanner Suite',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://localhost:${shellPort}/`);

  // لینک‌های external (target=_blank) در مرورگر سیستم باز شوند، نه داخل اپ.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function shutdown() {
  if (quitting) return;
  quitting = true;
  for (const c of children) {
    try { c.kill(); } catch {}
  }
  try { shellServer && shellServer.close(); } catch {}
}

// --- قفل تک‌نمونه‌ای: جلوگیری از اجرای هم‌زمانِ دو نمونه ---
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    console.log('🚀 در حال راه‌اندازی اسکنرها...');
    for (const s of SCANNERS) {
      await startScanner(s);
    }
    const shellPort = await startShellServer();
    console.log(`✅ پوسته آماده است → http://localhost:${shellPort}/`);
    createWindow(shellPort);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(shellPort);
    });
  });

  app.on('window-all-closed', () => {
    shutdown();
    app.quit();
  });
  app.on('before-quit', shutdown);
  process.on('exit', shutdown);
}
