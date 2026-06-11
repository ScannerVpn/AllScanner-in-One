'use strict';
// ====================================================================
// کاشف دامنه‌های Proton VPN با DNS
//
// مشکل: منابع عمومی فقط بخشی از دامنه‌های پروتون را دارند (مثلاً برای
// آلمان ۱۰ دامنه) ولی پروتون ده‌ها دامنه‌ی فیزیکی واقعی دارد
// (node-de-12 ... node-de-41). الگوی دامنه‌ها قابل حدس است:
//   node-<cc>-<NN>.protonvpn.net
// این اسکریپت برای هر کشور این دامنه‌ها را با DNS تست می‌کند و آن‌هایی
// که واقعاً resolve می‌شوند را نگه می‌دارد (wildcard وجود ندارد — تست شد).
//
// متادیتای کشور/شهر/لود را از منبع عمومی (mirror) می‌گیریم و روی
// دامنه‌های کشف‌شده می‌نشانیم.
//
// اجرا:  node src/discover.js [maxPerCountry]
// خروجی: src/data/discovered.json
// ====================================================================

const https = require('https');
const dns   = require('dns').promises;
const fs    = require('fs');
const path  = require('path');

// از resolverهای عمومی پایدار استفاده کن تا DNS سیستم زیر بار اسکن throttle نشود
try { require('dns').setServers(['1.1.1.1', '8.8.8.8', '9.9.9.9', '1.0.0.1']); } catch { /* ignore */ }

const MIRROR_URL = 'https://raw.githubusercontent.com/tn3w/ProtonVPN-IPs/master/protonvpn_logicals.json';
const OUT_FILE   = path.join(__dirname, 'data', 'discovered.json');
const MAX_PER_CC = parseInt(process.argv[2] || '700', 10); // سقف شماره برای هر کشور
const GAP_STOP   = 250;  // اگر این تعداد شماره‌ی پشت‌سرهم پیدا نشد، آن کشور را تمام‌شده فرض کن
const CONCURRENCY = 40;  // تعداد کوئری DNS هم‌زمان

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'curl/8', Accept: 'application/json' }, timeout: 20000 }, r => {
      let b = '';
      r.on('data', c => { b += c; });
      r.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// متادیتای هر دامنه را از منبع عمومی می‌گیرد
async function buildMirrorMeta() {
  const json = await getJson(MIRROR_URL);
  const list = json.LogicalServers || [];
  const byDomain = new Map();   // domain -> {country, city, code, load, tier, name, secureCore}
  const ccInfo   = new Map();   // cc -> { city, maxSeen }
  for (const s of list) {
    const dom = s.Domain;
    if (!dom) continue;
    const m = dom.match(/^node-([a-z]{2})-/);
    const cc = s.ExitCountry || (m ? m[1].toUpperCase() : '');
    byDomain.set(dom, {
      code: cc,
      city: s.City || '',
      load: typeof s.Load === 'number' ? s.Load : null,
      tier: s.Tier,
      name: s.Name || '',
    });
    if (m) {
      const k = m[1].toLowerCase();
      if (!ccInfo.has(k)) ccInfo.set(k, { city: '', count: 0 });
      const info = ccInfo.get(k);
      info.count++;
      if (!info.city && s.City) info.city = s.City;
    }
  }
  return { byDomain, ccInfo };
}

// host را resolve می‌کند. روی خطای قطعی (NXDOMAIN) بلافاصله رد می‌کند،
// ولی روی خطای موقت (throttle/timeout: SERVFAIL/EAI_AGAIN/ETIMEOUT) چند بار
// با مکث دوباره تلاش می‌کند تا false-negative نگیریم.
async function resolves(host) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const a = await dns.resolve4(host);
      return a && a.length ? a[0] : null;
    } catch (e) {
      const code = e && e.code;
      if (code === 'ENOTFOUND' || code === 'ENODATA') return null; // قطعاً وجود ندارد
      // خطای موقت → کمی صبر و تلاش مجدد
      await new Promise(r => setTimeout(r, 120 * (attempt + 1)));
    }
  }
  return null;
}

// با کنترل هم‌زمانی، شماره‌های ۱..max یک کشور را تست می‌کند
async function discoverCountry(cc, maxN) {
  const hits = [];
  let lastHit = 0;
  let n = 1;
  const active = new Set();

  async function probe(num) {
    const padded = String(num).padStart(2, '0');
    const host = `node-${cc}-${padded}.protonvpn.net`;
    const ip = await resolves(host);
    if (ip) { hits.push({ num, host, ip }); if (num > lastHit) lastHit = num; }
  }

  while (n <= maxN) {
    // اگر خیلی از آخرین hit فاصله گرفتیم، فرض کن تمام شده
    if (n - lastHit > GAP_STOP && lastHit > 0) break;
    while (active.size < CONCURRENCY && n <= maxN) {
      const cur = n++;
      const p = probe(cur).finally(() => active.delete(p));
      active.add(p);
    }
    if (active.size) await Promise.race(active);
  }
  await Promise.all(active);
  hits.sort((a, b) => a.num - b.num);
  return hits;
}

function flagOf(code) {
  if (!code || code.length !== 2) return '🌐';
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65));
}

const COUNTRY = require('./data/country-names');

async function main() {
  console.log('[discover] دریافت متادیتا از منبع عمومی…');
  const { byDomain, ccInfo } = await buildMirrorMeta();
  const codes = [...ccInfo.keys()].sort();
  console.log(`[discover] ${codes.length} کشور برای اسکن DNS`);

  const servers = [];
  let idx = 0;
  for (const cc of codes) {
    idx++;
    const hits = await discoverCountry(cc, MAX_PER_CC);
    const ccUp = cc.toUpperCase();
    const info = ccInfo.get(cc) || {};
    for (const h of hits) {
      const meta = byDomain.get(h.host) || {};
      servers.push({
        hostname: h.host,
        ip: h.ip,
        name: meta.name || `${ccUp}#${h.num}`,
        load: meta.load ?? null,
        country: COUNTRY[ccUp] || meta.code || ccUp,
        city: meta.city || info.city || '',
        code: ccUp,
        flag: flagOf(ccUp),
        protocol: meta.tier === 0 ? 'Free' : 'Plus',
      });
    }
    console.log(`[discover] (${idx}/${codes.length}) ${ccUp}: ${hits.length} دامنه`);
  }

  // افزودن دامنه‌های ویژه‌ی منبع که الگوی node-XX ندارند (secure core, tor)
  // برای این‌ها هم IP را با DNS می‌گیریم تا پشت فیلترینگ کار کنند.
  const special = [];
  for (const [dom, meta] of byDomain) {
    if (/^node-[a-z]{2}-/.test(dom)) continue;
    if (servers.some(s => s.hostname === dom)) continue;
    special.push([dom, meta]);
  }
  console.log(`[discover] resolving ${special.length} سرور ویژه (secure-core/tor)…`);
  for (const [dom, meta] of special) {
    const ip = await resolves(dom);
    const cc = meta.code || 'XX';
    servers.push({
      hostname: dom, ip, name: meta.name || dom, load: meta.load ?? null,
      country: COUNTRY[cc] || cc, city: meta.city || '', code: cc,
      flag: flagOf(cc), protocol: meta.tier === 0 ? 'Free' : 'Plus',
    });
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify({ updated: new Date().toISOString(), count: servers.length, servers }, null, 0));
  console.log(`\n✅ ${servers.length} سرور کشف شد → ${OUT_FILE}`);
}

main().catch(e => { console.error('discover failed:', e); process.exit(1); });
