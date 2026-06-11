'use strict';
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ====================================================================
// منبع لیست سرورهای Proton VPN
//
// ۱) اگر توکن اکانت موجود باشد (proton-auth.json یا متغیرهای محیطی)،
//    لیست *کامل و دقیق* را مستقیم از API رسمی پروتون می‌گیریم — همان
//    سرورهایی که در اپ می‌بینید (مثل DE#804). برای گرفتن لیست کامل از
//    هدر اپ دسکتاپ (x-pm-appversion=linux-vpn) استفاده می‌کنیم؛ نسخه‌ی
//    وب لیست ناقص می‌دهد.
// ۲) در غیر این صورت از کش عمومی گیت‌هاب استفاده می‌کنیم (بدون لاگین،
//    ولی ناقص).
// ۳) در نهایت fallback به لیست استاتیک.
// ====================================================================

const DEFAULT_URL = 'https://raw.githubusercontent.com/tn3w/ProtonVPN-IPs/master/protonvpn_logicals.json';
const REMOTE_URL  = process.env.PROTON_SERVER_LIST_URL || DEFAULT_URL;

// مسیر فایل توکن اکانت (کنار همین پروژه). نمونه: proton-auth.example.json
const AUTH_FILE = process.env.PROTON_AUTH_FILE || path.join(__dirname, '..', '..', 'proton-auth.json');

// خواندن اطلاعات احراز هویت از فایل یا متغیرهای محیطی
function loadAuth() {
  const env = {
    token: process.env.PROTON_TOKEN,
    uid: process.env.PROTON_UID,
    appVersion: process.env.PROTON_APPVERSION,
  };
  if (env.token && env.uid) return env;

  try {
    const raw = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    // پشتیبانی از کلیدهای رایجی که از Network tab کپی می‌شوند
    const token = raw.token || raw.Authorization || raw.authorization;
    const uid   = raw.uid || raw['x-pm-uid'] || raw.UID;
    if (token && uid) {
      return {
        token: token.replace(/^Bearer\s+/i, ''),
        uid,
        appVersion: raw.appVersion || raw['x-pm-appversion'],
      };
    }
  } catch { /* فایل توکن وجود ندارد یا نامعتبر است */ }
  return null;
}

const COUNTRY = require('./country-names');

const STATIC_SERVERS = [
  { hostname: 'node-nl-01.protonvpn.net', name: 'NL-FREE#1', country: 'Netherlands', city: 'Amsterdam', code: 'NL', flag: '🇳🇱', protocol: 'Free' },
  { hostname: 'node-jp-11.protonvpn.net', name: 'JP-FREE#1', country: 'Japan',       city: 'Tokyo',     code: 'JP', flag: '🇯🇵', protocol: 'Free' },
  { hostname: 'node-us-01.protonvpn.net', name: 'US-FREE#1', country: 'USA',         city: 'New York',  code: 'US', flag: '🇺🇸', protocol: 'Free' },
  { hostname: 'node-de-01.protonvpn.net', name: 'DE#1',      country: 'Germany',     city: 'Frankfurt', code: 'DE', flag: '🇩🇪', protocol: 'Plus' },
  { hostname: 'node-ch-01.protonvpn.net', name: 'CH#1',      country: 'Switzerland', city: 'Zurich',    code: 'CH', flag: '🇨🇭', protocol: 'Plus' },
];

let _servers = STATIC_SERVERS;
let _loaded = false;
let _source = 'static';

function flagOf(code) {
  if (!code || code.length !== 2) return '🌐';
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Accept: 'application/json' }, timeout: 15000 }, res => {
      if (res.statusCode && res.statusCode >= 400) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// گرفتن لیست کامل و دقیق از API رسمی پروتون با توکن اکانت.
// نکته‌ی کلیدی: هدر x-pm-appversion باید نسخه‌ی اپ دسکتاپ باشد (نه وب)
// وگرنه پروتون لیست ناقص می‌دهد.
function fetchAuthenticated(auth) {
  const appVersion = auth.appVersion || 'linux-vpn@4.14.1';
  const options = {
    hostname: 'account.proton.me',
    path: '/api/vpn/v1/logicals?WithTranslations&WithEntriesForProtocols=WireGuardUDP',
    method: 'GET',
    timeout: 15000,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'x-pm-uid': auth.uid,
      'x-pm-appversion': appVersion,
      'User-Agent': 'ProtonVPN/4.14.1 (Linux)',
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 160)}`));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

function normalize(json) {
  const list = json.LogicalServers || json.logicals || (Array.isArray(json) ? json : []);
  const out = [];
  const seen = new Set();
  for (const s of list) {
    const host = s.Domain;
    if (!host || seen.has(host)) continue;
    if (s.Status === 0) continue; // سرورهای offline
    seen.add(host);
    const code = (s.ExitCountry || '').toUpperCase();
    const secureCore = s.EntryCountry && s.ExitCountry && s.EntryCountry !== s.ExitCountry;
    out.push({
      hostname: host,
      name: s.Name || host,            // اسمی که در اپ Proton دیده می‌شود، مثل NL#5 یا US-FREE#3
      load: typeof s.Load === 'number' ? s.Load : null,
      country: COUNTRY[code] || code || 'Unknown',
      city: s.City || (secureCore ? `via ${s.EntryCountry}` : ''),
      code: code || 'XX',
      flag: flagOf(code),
      protocol: s.Tier === 0 ? 'Free' : (secureCore ? 'Secure Core' : 'Plus'),
    });
  }
  return out;
}

async function loadServers() {
  if (_loaded) return _servers;
  _loaded = true;

  // ۰) فایل کشف‌شده‌ی محلی (discovered.json) — کامل‌ترین لیست، ساخته‌شده با
  //    اسکن DNS دامنه‌های واقعی پروتون. با `npm run discover` ساخته/به‌روز می‌شود.
  try {
    const local = JSON.parse(fs.readFileSync(path.join(__dirname, 'discovered.json'), 'utf8'));
    if (local && Array.isArray(local.servers) && local.servers.length) {
      _servers = local.servers;
      _source = `discovered (${local.updated ? local.updated.slice(0, 10) : '?'})`;
      return _servers;
    }
  } catch { /* فایل کشف‌شده وجود ندارد — از منابع آنلاین استفاده کن */ }

  // ۱) تلاش برای گرفتن لیست کامل با توکن اکانت
  const auth = loadAuth();
  if (auth) {
    try {
      const json = await fetchAuthenticated(auth);
      const parsed = normalize(json);
      if (parsed.length) {
        _servers = parsed;
        _source = 'proton-account';
        return _servers;
      }
      console.warn('[servers] Proton account list empty, falling back to public mirror');
    } catch (e) {
      console.warn('[servers] Proton account fetch failed:', e.message || e);
      console.warn('[servers] (توکن منقضی شده؟ proton-auth.json را به‌روز کنید)');
    }
  }

  // ۲) منبع عمومی گیت‌هاب (بدون لاگین، ناقص)
  try {
    const json = await fetchJson(REMOTE_URL);
    const parsed = normalize(json);
    if (parsed.length) {
      _servers = parsed;
      _source = REMOTE_URL === DEFAULT_URL ? 'public-mirror' : 'remote';
      return _servers;
    }
    console.warn('[servers] Proton list empty, using static fallback');
  } catch (e) {
    console.warn('[servers] Proton fetch failed:', e.message || e);
  }

  // ۳) لیست استاتیک
  _servers = STATIC_SERVERS;
  _source = 'static';
  return _servers;
}

const getServers = () => _servers;
const getSource  = () => _source;

module.exports = { loadServers, getServers, getSource, STATIC_SERVERS };
