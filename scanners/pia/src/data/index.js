'use strict';
const https = require('https');

// ====================================================================
// منبع لیست سرورهای PIA (Private Internet Access)
// PIA یک endpoint عمومی دارد که خط اول آن JSON و بقیه امضای دیجیتال است.
// هر «region» یک hostname قابل‌resolve در فیلد dns دارد (مثل
// swiss.privacy.network) که روی 443 پاسخ می‌دهد.
// با PIA_SERVER_LIST_URL می‌توان منبع دیگری داد.
// ====================================================================

const DEFAULT_URL = 'https://serverlist.piaservers.net/vpninfo/servers/v6';
const REMOTE_URL  = process.env.PIA_SERVER_LIST_URL || DEFAULT_URL;

const STATIC_SERVERS = [
  { hostname: 'swiss.privacy.network',       country: 'Switzerland', city: 'Switzerland', code: 'CH', flag: '🇨🇭', protocol: 'ovpn/wg' },
  { hostname: 'nl-amsterdam.privacy.network', country: 'Netherlands', city: 'Amsterdam',  code: 'NL', flag: '🇳🇱', protocol: 'ovpn/wg' },
  { hostname: 'de-frankfurt.privacy.network', country: 'Germany',     city: 'Frankfurt',  code: 'DE', flag: '🇩🇪', protocol: 'ovpn/wg' },
  { hostname: 'uk-london.privacy.network',    country: 'UK',          city: 'London',     code: 'GB', flag: '🇬🇧', protocol: 'ovpn/wg' },
  { hostname: 'us-newyorkcity.privacy.network', country: 'USA',       city: 'New York',   code: 'US', flag: '🇺🇸', protocol: 'ovpn/wg' },
];

let _servers = STATIC_SERVERS;
let _loaded = false;
let _source = 'static';

function flagOf(code) {
  if (!code || code.length !== 2) return '🌐';
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65));
}

const PROTO_LABEL = { ovpnudp: 'OpenVPN UDP', ovpntcp: 'OpenVPN TCP', wireguard: 'WireGuard', ikev2: 'IKEv2', meta: 'meta' };

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Accept: 'application/json' }, timeout: 10000 }, res => {
      if (res.statusCode && res.statusCode >= 400) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function parsePia(text) {
  // خط اول JSON است، بقیه امضا
  const firstLine = text.split('\n')[0];
  const json = JSON.parse(firstLine);
  const regions = json.regions || [];
  const out = [];
  for (const r of regions) {
    if (!r || !r.dns || r.offline) continue;
    const code = (r.country || '').toUpperCase();
    const protos = Object.keys(r.servers || {})
      .filter(k => k !== 'meta')
      .map(k => PROTO_LABEL[k] || k);
    out.push({
      hostname: r.dns,
      country: r.name || code || 'Unknown',
      city: r.name || '',
      code: code || 'XX',
      flag: flagOf(code),
      protocol: protos.join(' · ') || 'PIA',
    });
  }
  return out;
}

async function loadServers() {
  if (_loaded) return _servers;
  _loaded = true;
  try {
    const text = await fetchText(REMOTE_URL);
    const parsed = parsePia(text);
    if (parsed.length) {
      _servers = parsed;
      _source = REMOTE_URL === DEFAULT_URL ? 'pia-live' : 'remote';
      return _servers;
    }
    console.warn('[servers] PIA list empty, using static fallback');
  } catch (e) {
    console.warn('[servers] PIA fetch failed:', e.message || e);
  }
  _servers = STATIC_SERVERS;
  _source = 'static';
  return _servers;
}

const getServers = () => _servers;
const getSource  = () => _source;

module.exports = { loadServers, getServers, getSource, STATIC_SERVERS };
