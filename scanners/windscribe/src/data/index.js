'use strict';
const https = require('https');

// ====================================================================
// منبع لیست سرورهای Windscribe
// Windscribe یک لیست عمومی OpenVPN بدون احراز هویت منتشر می‌کند:
// assets.windscribe.com/serverlist/openvpn/1/0
// ساختار: data[] لوکیشن‌ها، هر کدام nodes[] با hostname واقعی سرور.
// با WINDSCRIBE_SERVER_LIST_URL می‌توان منبع دیگری داد.
// ====================================================================

const DEFAULT_URL = 'https://assets.windscribe.com/serverlist/openvpn/1/0';
const REMOTE_URL  = process.env.WINDSCRIBE_SERVER_LIST_URL || DEFAULT_URL;

const STATIC_SERVERS = [
  { hostname: 'us-central.windscribe.com', country: 'US Central',     city: 'Chicago',   code: 'US', flag: '🇺🇸', protocol: 'OpenVPN' },
  { hostname: 'uk.windscribe.com',         country: 'United Kingdom', city: 'London',    code: 'GB', flag: '🇬🇧', protocol: 'OpenVPN' },
  { hostname: 'germany.windscribe.com',    country: 'Germany',        city: 'Frankfurt', code: 'DE', flag: '🇩🇪', protocol: 'OpenVPN' },
  { hostname: 'netherlands.windscribe.com', country: 'Netherlands',   city: 'Amsterdam', code: 'NL', flag: '🇳🇱', protocol: 'OpenVPN' },
  { hostname: 'france.windscribe.com',     country: 'France',         city: 'Paris',     code: 'FR', flag: '🇫🇷', protocol: 'OpenVPN' },
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
    const req = https.get(url, { headers: { Accept: 'application/json' }, timeout: 12000 }, res => {
      if (res.statusCode && res.statusCode >= 400) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function normalize(data) {
  const out = [];
  const seen = new Set();
  for (const loc of data) {
    if (!loc) continue;
    const code = (loc.country_code || '').toUpperCase();
    const country = loc.name || code || 'Unknown';
    const nodes = Array.isArray(loc.nodes) ? loc.nodes : [];
    if (nodes.length) {
      for (const n of nodes) {
        const host = n.hostname;
        if (!host || seen.has(host)) continue;
        seen.add(host);
        out.push({
          hostname: host,
          country,
          city: n.group || loc.short_name || '',
          code: code || 'XX',
          flag: flagOf(code),
          protocol: loc.p2p ? 'OpenVPN · P2P' : 'OpenVPN',
        });
      }
    } else if (loc.dns_hostname && !seen.has(loc.dns_hostname)) {
      seen.add(loc.dns_hostname);
      out.push({ hostname: loc.dns_hostname, country, city: loc.short_name || '', code: code || 'XX', flag: flagOf(code), protocol: 'OpenVPN' });
    }
  }
  return out;
}

async function loadServers() {
  if (_loaded) return _servers;
  _loaded = true;
  try {
    const json = await fetchJson(REMOTE_URL);
    const data = json.data || json;
    const parsed = normalize(Array.isArray(data) ? data : []);
    if (parsed.length) {
      _servers = parsed;
      _source = REMOTE_URL === DEFAULT_URL ? 'windscribe-live' : 'remote';
      return _servers;
    }
    console.warn('[servers] Windscribe list empty, using static fallback');
  } catch (e) {
    console.warn('[servers] Windscribe fetch failed:', e.message || e);
  }
  _servers = STATIC_SERVERS;
  _source = 'static';
  return _servers;
}

const getServers = () => _servers;
const getSource  = () => _source;

module.exports = { loadServers, getServers, getSource, STATIC_SERVERS };
