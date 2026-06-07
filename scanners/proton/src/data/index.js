'use strict';
const https = require('https');

// ====================================================================
// منبع لیست سرورهای Proton VPN
// API رسمی Proton (api.protonvpn.ch/vpn/logicals) حالا احراز هویت می‌خواهد،
// بنابراین از یک کش عمومی و خودکارِ همان پاسخ logicals استفاده می‌کنیم که
// دامنه‌های واقعی *.protonvpn.net را دارد. در صورت خطا به لیست استاتیک
// برمی‌گردیم. با PROTON_SERVER_LIST_URL می‌توان منبع دیگری داد.
// ====================================================================

const DEFAULT_URL = 'https://raw.githubusercontent.com/tn3w/ProtonVPN-IPs/master/protonvpn_logicals.json';
const REMOTE_URL  = process.env.PROTON_SERVER_LIST_URL || DEFAULT_URL;

const COUNTRY = {
  US: 'USA', GB: 'UK', DE: 'Germany', NL: 'Netherlands', FR: 'France', CH: 'Switzerland',
  SE: 'Sweden', NO: 'Norway', FI: 'Finland', JP: 'Japan', SG: 'Singapore', CA: 'Canada',
  AU: 'Australia', IT: 'Italy', ES: 'Spain', PL: 'Poland', RO: 'Romania', BE: 'Belgium',
  AT: 'Austria', CZ: 'Czechia', HU: 'Hungary', DK: 'Denmark', IE: 'Ireland', PT: 'Portugal',
  IS: 'Iceland', HK: 'Hong Kong', KR: 'South Korea', BR: 'Brazil', MX: 'Mexico', IL: 'Israel',
  AE: 'UAE', TR: 'Turkey', UA: 'Ukraine', VN: 'Vietnam', ID: 'Indonesia', TH: 'Thailand',
  TW: 'Taiwan', BG: 'Bulgaria', RS: 'Serbia', GR: 'Greece', IN: 'India', ZA: 'South Africa',
  AR: 'Argentina', CL: 'Chile', NZ: 'New Zealand', EE: 'Estonia', LV: 'Latvia', LT: 'Lithuania',
  SK: 'Slovakia', SI: 'Slovenia', HR: 'Croatia', LU: 'Luxembourg', MD: 'Moldova', CY: 'Cyprus',
};

const STATIC_SERVERS = [
  { hostname: 'node-nl-01.protonvpn.net', country: 'Netherlands', city: 'Amsterdam', code: 'NL', flag: '🇳🇱', protocol: 'Free' },
  { hostname: 'node-jp-11.protonvpn.net', country: 'Japan',       city: 'Tokyo',     code: 'JP', flag: '🇯🇵', protocol: 'Free' },
  { hostname: 'node-us-01.protonvpn.net', country: 'USA',         city: 'New York',  code: 'US', flag: '🇺🇸', protocol: 'Free' },
  { hostname: 'node-de-01.protonvpn.net', country: 'Germany',     city: 'Frankfurt', code: 'DE', flag: '🇩🇪', protocol: 'Plus' },
  { hostname: 'node-ch-01.protonvpn.net', country: 'Switzerland', city: 'Zurich',    code: 'CH', flag: '🇨🇭', protocol: 'Plus' },
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
  try {
    const json = await fetchJson(REMOTE_URL);
    const parsed = normalize(json);
    if (parsed.length) {
      _servers = parsed;
      _source = REMOTE_URL === DEFAULT_URL ? 'proton-live' : 'remote';
      return _servers;
    }
    console.warn('[servers] Proton list empty, using static fallback');
  } catch (e) {
    console.warn('[servers] Proton fetch failed:', e.message || e);
  }
  _servers = STATIC_SERVERS;
  _source = 'static';
  return _servers;
}

const getServers = () => _servers;
const getSource  = () => _source;

module.exports = { loadServers, getServers, getSource, STATIC_SERVERS };
