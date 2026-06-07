'use strict';
const https = require('https');
const { SERVERS: STATIC_SERVERS } = require('./servers');

// ====================================================================
// منبع لیست سرورهای ExpressVPN
// ExpressVPN هیچ API عمومی JSON ندارد. نزدیک‌ترین منبع زنده و قابل دریافت،
// فایل LOCATIONS.txt پروژه‌ی Zomboided است که هاست‌نیم‌های واقعی
// *.expressnetw.com را نگه می‌دارد. این فایل را fetch و parse می‌کنیم و
// در صورت خطا به لیست استاتیک محلی برمی‌گردیم.
// با EXPRESS_SERVER_LIST_URL می‌توان منبع دیگری (txt یا json) داد.
// ====================================================================

const DEFAULT_SOURCE_URL =
  'https://raw.githubusercontent.com/Zomboided/service.vpn.manager.providers/master/ExpressVPN/LOCATIONS.txt';
const REMOTE_SERVER_LIST_URL = process.env.EXPRESS_SERVER_LIST_URL || DEFAULT_SOURCE_URL;

let _servers = STATIC_SERVERS;
let _loaded = false;
let _source = 'static';

const ISO_CODE = {
  Albania: 'AL', Algeria: 'DZ', Andorra: 'AD', Argentina: 'AR', Armenia: 'AM',
  Australia: 'AU', Austria: 'AT', Azerbaijan: 'AZ', Bahamas: 'BS', Bangladesh: 'BD',
  Belarus: 'BY', Belgium: 'BE', Bhutan: 'BT', 'Bosnia And Herzegovina': 'BA', Brazil: 'BR',
  Brunei: 'BN', Cambodia: 'KH', Canada: 'CA', Chile: 'CL', Colombia: 'CO',
  'Costa Rica': 'CR', Croatia: 'HR', Cyprus: 'CY', 'Czech Republic': 'CZ', Denmark: 'DK',
  Ecuador: 'EC', Egypt: 'EG', Estonia: 'EE', Finland: 'FI', France: 'FR',
  Georgia: 'GE', Germany: 'DE', Greece: 'GR', Guatemala: 'GT', 'Hong Kong': 'HK',
  Hungary: 'HU', Iceland: 'IS', India: 'IN', Indonesia: 'ID', Ireland: 'IE',
  'Isle Of Man': 'IM', Israel: 'IL', Italy: 'IT', Japan: 'JP', Jersey: 'JE',
  Kazakhstan: 'KZ', Kenya: 'KE', Kyrgyzstan: 'KG', Laos: 'LA', Latvia: 'LV',
  Liechtenstein: 'LI', Lithuania: 'LT', Luxembourg: 'LU', Macau: 'MO', Malaysia: 'MY',
  Malta: 'MT', Mexico: 'MX', Moldova: 'MD', Monaco: 'MC', Mongolia: 'MN',
  Montenegro: 'ME', Myanmar: 'MM', Nepal: 'NP', Netherlands: 'NL', 'New Zealand': 'NZ',
  'North Macedonia': 'MK', Norway: 'NO', Pakistan: 'PK', Panama: 'PA', Peru: 'PE',
  'Philippines Via Singapore': 'PH', Poland: 'PL', Portugal: 'PT', Romania: 'RO',
  Serbia: 'RS', Singapore: 'SG', Slovakia: 'SK', Slovenia: 'SI', 'South Africa': 'ZA',
  'South Korea': 'KR', Spain: 'ES', 'Sri Lanka': 'LK', Sweden: 'SE', Switzerland: 'CH',
  Taiwan: 'TW', Thailand: 'TH', Turkey: 'TR', UK: 'GB', USA: 'US',
  Ukraine: 'UA', Uruguay: 'UY', Uzbekistan: 'UZ', Venezuela: 'VE', Vietnam: 'VN',
};

// ---- پارسر فرمت LOCATIONS.txt اکسپرس ----
// هر خط: "Name (UDP|TCP),<hostname>,<proto>,<port>,<comment>"
// هر لوکیشن دوبار (UDP و TCP) می‌آید؛ بر اساس hostname dedup می‌کنیم.
function parseExpressLocations(text) {
  const seen = new Set();
  const out = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(',');
    if (parts.length < 2) continue;

    const rawName = parts[0].replace(/\s*\((?:UDP|TCP)\)\s*$/i, '').trim();
    const hostname = parts[1].trim();
    if (!hostname || !/expressnetw\.com$/i.test(hostname)) continue;
    if (seen.has(hostname)) continue;
    seen.add(hostname);

    let country = rawName;
    let city = '';
    if (rawName.includes(' - ')) {
      const segs = rawName.split(' - ');
      country = segs[0].trim();
      city = segs.slice(1).join(' - ').trim();
    }

    out.push({
      hostname,
      country: country || 'Unknown',
      city: city || country || 'Unknown',
      code: ISO_CODE[country] || 'XX',
    });
  }

  return out;
}

// ---- پارسر JSON عمومی (برای منبع سفارشی) ----
function normalizeServer(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    return { hostname: item, country: 'Unknown', city: 'Unknown', code: 'XX' };
  }
  const hostname = typeof item.hostname === 'string' ? item.hostname : item.host || item.name;
  if (!hostname) return null;
  const country = item.country || item.region || 'Unknown';
  return {
    hostname,
    country,
    city: item.city || item.location || country,
    code: item.code || item.iso || item.countryCode || ISO_CODE[country] || 'XX',
  };
}

function parseJson(text) {
  const json = JSON.parse(text);
  let list = null;
  if (Array.isArray(json)) list = json;
  else if (Array.isArray(json.servers)) list = json.servers;
  else if (Array.isArray(json.data)) list = json.data;
  else if (Array.isArray(json.locations)) list = json.locations;
  else if (json.servers && typeof json.servers === 'object') list = Object.values(json.servers);
  else if (json.data && typeof json.data === 'object') list = Object.values(json.data);

  if (!Array.isArray(list)) return [];
  return list.map(normalizeServer).filter(s => s && typeof s.hostname === 'string');
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { Accept: 'text/plain, application/json' }, timeout: 8000 },
      response => {
        if (response.statusCode && response.statusCode >= 400) {
          response.resume();
          return reject(new Error(`HTTP ${response.statusCode}`));
        }
        let body = '';
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => resolve(body));
      }
    );
    request.on('error', reject);
    request.on('timeout', () => { request.destroy(); reject(new Error('timeout')); });
  });
}

function parseServerList(text) {
  const body = text.trim();
  // اگر JSON بود به‌صورت JSON، در غیر این صورت فرمت LOCATIONS.txt اکسپرس
  if (body.startsWith('[') || body.startsWith('{')) return parseJson(body);
  return parseExpressLocations(body);
}

async function loadServers() {
  if (_loaded) return _servers;
  _loaded = true;

  try {
    const text = await fetchText(REMOTE_SERVER_LIST_URL);
    const parsed = parseServerList(text);
    if (parsed.length > 0) {
      _servers = parsed;
      _source = REMOTE_SERVER_LIST_URL === DEFAULT_SOURCE_URL ? 'expressvpn-live' : 'remote';
      return _servers;
    }
    console.warn('[servers] remote list returned empty, falling back to static list');
  } catch (error) {
    console.warn('[servers] failed to fetch remote list:', error.message || error);
  }

  _servers = STATIC_SERVERS;
  _source = 'static';
  return _servers;
}

function getServers() {
  return _servers;
}

function getSource() {
  return _source;
}

module.exports = { loadServers, getServers, getSource, STATIC_SERVERS };
