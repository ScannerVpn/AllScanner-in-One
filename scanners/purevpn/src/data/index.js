'use strict';
const https = require('https');
const { SERVERS: STATIC_SERVERS_RAW } = require('./servers');
const { parseHostname } = require('./countries');

const REMOTE_SERVER_LIST_URL = process.env.PUREVPN_SERVER_LIST_URL || null;

function normalizeServer(item) {
  if (!item) return null;

  // hostname خام (رشته) یا آبجکت با فیلدهای مختلف را پشتیبانی می‌کند
  const hostname = typeof item === 'string'
    ? item
    : (typeof item.hostname === 'string' ? item.hostname : item.host || item.name);
  if (!hostname) return null;

  // متادیتای کشور/پروتکل را از خود hostname استخراج می‌کنیم
  const parsed = parseHostname(hostname);
  const obj = typeof item === 'object' && item !== null ? item : {};

  return {
    hostname,
    country: obj.country || obj.region || parsed.country,
    city:    obj.city || obj.location || parsed.protocol,
    code:    obj.code || obj.iso || parsed.code,
    flag:    obj.flag || parsed.flag,
    protocol: parsed.protocol,
  };
}

// لیست استاتیک (رشته‌های hostname) را همان ابتدا نرمال‌سازی می‌کنیم تا
// API همیشه آبجکت‌های کامل {hostname, country, city, code, flag} برگرداند.
const STATIC_SERVERS = normalizeServers(STATIC_SERVERS_RAW);
let _servers = STATIC_SERVERS;
let _loaded = false;

function normalizeServers(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map(normalizeServer)
    .filter(server => server && typeof server.hostname === 'string');
}

function fetchRemoteServers(url) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve(null);

    const request = https.get(url, {
      headers: { Accept: 'application/json' },
      timeout: 8000,
    }, response => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        try {
          const json = JSON.parse(body);
          let list = null;

          if (Array.isArray(json)) {
            list = json;
          } else if (Array.isArray(json.servers)) {
            list = json.servers;
          } else if (Array.isArray(json.data)) {
            list = json.data;
          } else if (Array.isArray(json.locations)) {
            list = json.locations;
          } else if (json.servers && typeof json.servers === 'object') {
            list = Object.values(json.servers);
          } else if (json.data && typeof json.data === 'object') {
            list = Object.values(json.data);
          }

          resolve(normalizeServers(list));
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('timeout'));
    });
  });
}

async function loadServers() {
  if (_loaded) return _servers;
  _loaded = true;

  if (!REMOTE_SERVER_LIST_URL) {
    _servers = STATIC_SERVERS;
    return _servers;
  }

  try {
    const remoteServers = await fetchRemoteServers(REMOTE_SERVER_LIST_URL);
    if (remoteServers && remoteServers.length > 0) {
      _servers = remoteServers;
      return _servers;
    }
    console.warn('[purevpn] remote server list returned empty, falling back to static list');
  } catch (error) {
    console.warn('[purevpn] failed to fetch remote server list:', error.message || error);
  }

  _servers = STATIC_SERVERS;
  return _servers;
}

function getServers() {
  return _servers;
}

module.exports = { loadServers, getServers, STATIC_SERVERS };
