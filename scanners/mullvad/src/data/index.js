'use strict';
const https = require('https');

// ====================================================================
// منبع لیست سرورهای Mullvad
// Mullvad یک API عمومی و بدون احراز هویت دارد که همه‌ی relayها را با
// FQDN کامل می‌دهد. در صورت خطا به لیست استاتیک کوچک برمی‌گردیم.
// با MULLVAD_SERVER_LIST_URL می‌توان منبع دیگری داد.
// ====================================================================

const DEFAULT_URL = 'https://api.mullvad.net/www/relays/all/';
const REMOTE_URL  = process.env.MULLVAD_SERVER_LIST_URL || DEFAULT_URL;

const STATIC_SERVERS = [
  { hostname: 'se-got-wg-001.relays.mullvad.net', country: 'Sweden',      city: 'Gothenburg', code: 'SE', flag: '🇸🇪', protocol: 'wireguard' },
  { hostname: 'de-fra-wg-001.relays.mullvad.net', country: 'Germany',     city: 'Frankfurt',  code: 'DE', flag: '🇩🇪', protocol: 'wireguard' },
  { hostname: 'nl-ams-wg-001.relays.mullvad.net', country: 'Netherlands', city: 'Amsterdam',  code: 'NL', flag: '🇳🇱', protocol: 'wireguard' },
  { hostname: 'gb-lon-wg-001.relays.mullvad.net', country: 'UK',          city: 'London',     code: 'GB', flag: '🇬🇧', protocol: 'wireguard' },
  { hostname: 'us-nyc-wg-001.relays.mullvad.net', country: 'USA',         city: 'New York',   code: 'US', flag: '🇺🇸', protocol: 'wireguard' },
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
    const req = https.get(url, { headers: { Accept: 'application/json' }, timeout: 10000 }, res => {
      if (res.statusCode && res.statusCode >= 400) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function normalize(list) {
  const out = [];
  const seen = new Set();
  for (const r of list) {
    if (!r || !r.fqdn || r.active === false) continue;
    if (seen.has(r.fqdn)) continue;
    seen.add(r.fqdn);
    const code = (r.country_code || '').toUpperCase();
    out.push({
      hostname: r.fqdn,
      country: r.country_name || code || 'Unknown',
      city: r.city_name || '',
      code: code || 'XX',
      flag: flagOf(code),
      protocol: r.type || 'wireguard',
    });
  }
  return out;
}

async function loadServers() {
  if (_loaded) return _servers;
  _loaded = true;
  try {
    const json = await fetchJson(REMOTE_URL);
    const list = Array.isArray(json) ? json : (json.relays || json.servers || []);
    const parsed = normalize(list);
    if (parsed.length) {
      _servers = parsed;
      _source = REMOTE_URL === DEFAULT_URL ? 'mullvad-live' : 'remote';
      return _servers;
    }
    console.warn('[servers] Mullvad list empty, using static fallback');
  } catch (e) {
    console.warn('[servers] Mullvad fetch failed:', e.message || e);
  }
  _servers = STATIC_SERVERS;
  _source = 'static';
  return _servers;
}

const getServers = () => _servers;
const getSource  = () => _source;

module.exports = { loadServers, getServers, getSource, STATIC_SERVERS };
