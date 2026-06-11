'use strict';
/**
 * لیست کامل سرورهای هر ۸ ارائه‌دهنده را (با اینترنت آزاد) جمع می‌کند و در
 * data/servers.json با شکل یکسان می‌نویسد. این همان فایلی است که suite.js
 * باندل می‌کند تا حتی پشت فیلترینگ (که فچِ لایو شکست می‌خورد) لیست کامل
 * داشته باشد. اگر گرفتنِ یک ارائه‌دهنده شکست بخورد، لیست قبلیِ همان
 * ارائه‌دهنده حفظ می‌شود (فایل خالی نمی‌شود).
 *
 * روش: همان سرورهای اسکنر را بالا می‌آورد و از /api/servers خودشان می‌خواند تا
 * دقیقاً از نرمال‌سازیِ خودِ هر اسکنر استفاده شود. Nord جداگانه از API عمومی‌اش
 * گرفته و به شکل مشترک نرمال می‌شود.
 *
 * اجرا:  node scripts/fetch-server-lists.js
 */
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'servers.json');

// همان پورت‌های پیش‌فرض اسکنرها
const SCANNERS = [
  { id: 'surfshark',  dir: 'scanners/surfshark',  entry: 'surf_server.js', port: 3002 },
  { id: 'expressvpn', dir: 'scanners/expressvpn', entry: 'server.js',      port: 3003 },
  { id: 'purevpn',    dir: 'scanners/purevpn',    entry: 'server.js',      port: 3004 },
  { id: 'mullvad',    dir: 'scanners/mullvad',    entry: 'server.js',      port: 3005 },
  { id: 'pia',        dir: 'scanners/pia',        entry: 'server.js',      port: 3006 },
  { id: 'windscribe', dir: 'scanners/windscribe', entry: 'server.js',      port: 3007 },
  { id: 'proton',     dir: 'scanners/proton',     entry: 'server.js',      port: 3008 },
];

const NODE_BIN = process.execPath;
const children = [];

function startScanner(s) {
  const cwd = path.join(ROOT, s.dir);
  const child = spawn(NODE_BIN, [path.join(cwd, s.entry)], {
    cwd,
    env: { ...process.env, PORT: String(s.port) },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  children.push(child);
}

function getJson(url) {
  const lib = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.get(url, { timeout: 30000, headers: { Accept: 'application/json' } }, res => {
      let body = '';
      res.on('data', d => (body += d));
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function flagOf(code) {
  if (!code || code.length !== 2) return '🌐';
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65));
}

// Nord را از API عمومی‌اش می‌گیریم و به شکل مشترک نرمال می‌کنیم (با station IP).
// از endpoint کاملِ /v1/servers استفاده می‌کنیم (recommendations فقط چند مورد
// نزدیک می‌دهد). فقط سرورهای online نگه داشته و بر اساس hostname یکتا می‌کنیم.
async function fetchNord() {
  const url = 'https://api.nordvpn.com/v1/servers?limit=8000';
  const data = await getJson(url);
  // لیست کامل Nord (بدون cap) — فقط بر اساس hostname یکتا و فقط onlineها.
  const seen = new Set();
  const out = [];
  for (const s of data) {
    const host = s.hostname;
    if (!host || seen.has(host)) continue;
    if (s.status && s.status !== 'online') continue;
    seen.add(host);
    const loc = (s.locations && s.locations[0]) || {};
    const country = loc.country || {};
    const code = (country.code || '').toUpperCase();
    const city = (country.city && country.city.name) || '';
    out.push({
      hostname: host,
      country: country.name || code || 'Unknown',
      city,
      code: code || 'XX',
      flag: flagOf(code),
      ip: s.station || null,
    });
  }
  return out;
}

async function fetchFromScanner(s) {
  // چند بار تلاش تا سرور بالا بیاید و لیست لایو لود شود
  for (let i = 0; i < 30; i++) {
    try {
      const j = await getJson(`http://127.0.0.1:${s.port}/api/servers`);
      const servers = j.servers || [];
      if (servers.length > 5) {
        return servers.map(x => ({
          hostname: x.hostname,
          country: x.country || '',
          city: x.city || '',
          code: (x.code || '').toUpperCase(),
          flag: x.flag || flagOf(x.code),
          ip: x.ip || null,
        }));
      }
    } catch { /* صبر و دوباره */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  return [];
}

async function main() {
  console.log('🚀 بالا آوردن اسکنرها برای استخراج لیست...');
  SCANNERS.forEach(startScanner);

  // لیست قبلی را بخوان تا اگر گرفتنِ یک ارائه‌دهنده شکست خورد، قبلی حفظ شود
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { /* فایل قبلی نیست */ }

  const result = {};
  for (const s of SCANNERS) {
    process.stdout.write(`  • ${s.id} ... `);
    const list = await fetchFromScanner(s);
    if (list.length > 5) {
      result[s.id] = list;
      console.log(list.length + ' سرور');
    } else if (prev[s.id] && prev[s.id].length) {
      result[s.id] = prev[s.id];
      console.log(`خطا در فچ — لیست قبلی حفظ شد (${prev[s.id].length} سرور)`);
    } else {
      result[s.id] = list;
      console.log(list.length + ' سرور');
    }
  }

  process.stdout.write('  • nord ... ');
  try {
    const nord = await fetchNord();
    if (nord.length > 5) { result.nord = nord; console.log(nord.length + ' سرور'); }
    else if (prev.nord && prev.nord.length) { result.nord = prev.nord; console.log(`خطا — لیست قبلی حفظ شد (${prev.nord.length})`); }
    else { result.nord = nord; console.log(nord.length + ' سرور'); }
  } catch (e) {
    result.nord = (prev.nord && prev.nord.length) ? prev.nord : [];
    console.log('خطا: ' + e.message + (result.nord.length ? ` — لیست قبلی حفظ شد (${result.nord.length})` : ''));
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result), 'utf8');
  const total = Object.values(result).reduce((a, b) => a + b.length, 0);
  console.log(`\n✅ نوشته شد: ${OUT}`);
  console.log(`   مجموع: ${total} سرور در ${Object.keys(result).length} ارائه‌دهنده`);

  for (const c of children) { try { c.kill(); } catch {} }
  setTimeout(() => process.exit(0), 500);
}

main().catch(e => {
  console.error('خطا:', e);
  for (const c of children) { try { c.kill(); } catch {} }
  process.exit(1);
});
