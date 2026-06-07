'use strict';
const http   = require('http');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const tls    = require('tls');
const net    = require('net');
const dns    = require('dns');
const { exec } = require('child_process');

const PORT = 3002;

// ==================== Surfshark server list ====================
const SURF_SERVERS = [
  // Europe
  { hostname: 'nl-ams.prod.surfshark.com',   country: 'Netherlands',    city: 'Amsterdam',      code: 'NL' },
  { hostname: 'nl-ams2.prod.surfshark.com',  country: 'Netherlands',    city: 'Amsterdam 2',    code: 'NL' },
  { hostname: 'nl-rtm.prod.surfshark.com',   country: 'Netherlands',    city: 'Rotterdam',      code: 'NL' },
  { hostname: 'de-fra.prod.surfshark.com',   country: 'Germany',        city: 'Frankfurt',      code: 'DE' },
  { hostname: 'de-fra2.prod.surfshark.com',  country: 'Germany',        city: 'Frankfurt 2',    code: 'DE' },
  { hostname: 'de-ber.prod.surfshark.com',   country: 'Germany',        city: 'Berlin',         code: 'DE' },
  { hostname: 'de-muc.prod.surfshark.com',   country: 'Germany',        city: 'Munich',         code: 'DE' },
  { hostname: 'de-nue.prod.surfshark.com',   country: 'Germany',        city: 'Nuremberg',      code: 'DE' },
  { hostname: 'uk-lon.prod.surfshark.com',   country: 'UK',             city: 'London',         code: 'GB' },
  { hostname: 'uk-lon2.prod.surfshark.com',  country: 'UK',             city: 'London 2',       code: 'GB' },
  { hostname: 'uk-lon3.prod.surfshark.com',  country: 'UK',             city: 'London 3',       code: 'GB' },
  { hostname: 'uk-man.prod.surfshark.com',   country: 'UK',             city: 'Manchester',     code: 'GB' },
  { hostname: 'uk-gla.prod.surfshark.com',   country: 'UK',             city: 'Glasgow',        code: 'GB' },
  { hostname: 'fr-par.prod.surfshark.com',   country: 'France',         city: 'Paris',          code: 'FR' },
  { hostname: 'fr-par2.prod.surfshark.com',  country: 'France',         city: 'Paris 2',        code: 'FR' },
  { hostname: 'fr-mrs.prod.surfshark.com',   country: 'France',         city: 'Marseille',      code: 'FR' },
  { hostname: 'se-sto.prod.surfshark.com',   country: 'Sweden',         city: 'Stockholm',      code: 'SE' },
  { hostname: 'se-got.prod.surfshark.com',   country: 'Sweden',         city: 'Gothenburg',     code: 'SE' },
  { hostname: 'ch-zur.prod.surfshark.com',   country: 'Switzerland',    city: 'Zurich',         code: 'CH' },
  { hostname: 'ch-zur2.prod.surfshark.com',  country: 'Switzerland',    city: 'Zurich 2',       code: 'CH' },
  { hostname: 'ch-gnv.prod.surfshark.com',   country: 'Switzerland',    city: 'Geneva',         code: 'CH' },
  { hostname: 'at-vie.prod.surfshark.com',   country: 'Austria',        city: 'Vienna',         code: 'AT' },
  { hostname: 'be-bru.prod.surfshark.com',   country: 'Belgium',        city: 'Brussels',       code: 'BE' },
  { hostname: 'dk-cph.prod.surfshark.com',   country: 'Denmark',        city: 'Copenhagen',     code: 'DK' },
  { hostname: 'fi-hel.prod.surfshark.com',   country: 'Finland',        city: 'Helsinki',       code: 'FI' },
  { hostname: 'no-osl.prod.surfshark.com',   country: 'Norway',         city: 'Oslo',           code: 'NO' },
  { hostname: 'it-mil.prod.surfshark.com',   country: 'Italy',          city: 'Milan',          code: 'IT' },
  { hostname: 'it-mil2.prod.surfshark.com',  country: 'Italy',          city: 'Milan 2',        code: 'IT' },
  { hostname: 'it-rom.prod.surfshark.com',   country: 'Italy',          city: 'Rome',           code: 'IT' },
  { hostname: 'es-mad.prod.surfshark.com',   country: 'Spain',          city: 'Madrid',         code: 'ES' },
  { hostname: 'es-bcn.prod.surfshark.com',   country: 'Spain',          city: 'Barcelona',      code: 'ES' },
  { hostname: 'es-vlc.prod.surfshark.com',   country: 'Spain',          city: 'Valencia',       code: 'ES' },
  { hostname: 'pt-lis.prod.surfshark.com',   country: 'Portugal',       city: 'Lisbon',         code: 'PT' },
  { hostname: 'pt-lis2.prod.surfshark.com',  country: 'Portugal',       city: 'Lisbon 2',       code: 'PT' },
  { hostname: 'pt-por.prod.surfshark.com',   country: 'Portugal',       city: 'Porto',          code: 'PT' },
  { hostname: 'pl-waw.prod.surfshark.com',   country: 'Poland',         city: 'Warsaw',         code: 'PL' },
  { hostname: 'pl-waw2.prod.surfshark.com',  country: 'Poland',         city: 'Warsaw 2',       code: 'PL' },
  { hostname: 'pl-kra.prod.surfshark.com',   country: 'Poland',         city: 'Krakow',         code: 'PL' },
  { hostname: 'cz-prg.prod.surfshark.com',   country: 'Czech Republic', city: 'Prague',         code: 'CZ' },
  { hostname: 'ro-buh.prod.surfshark.com',   country: 'Romania',        city: 'Bucharest',      code: 'RO' },
  { hostname: 'ro-buh2.prod.surfshark.com',  country: 'Romania',        city: 'Bucharest 2',    code: 'RO' },
  { hostname: 'hu-bud.prod.surfshark.com',   country: 'Hungary',        city: 'Budapest',       code: 'HU' },
  { hostname: 'gr-ath.prod.surfshark.com',   country: 'Greece',         city: 'Athens',         code: 'GR' },
  { hostname: 'tr-ist.prod.surfshark.com',   country: 'Turkey',         city: 'Istanbul',       code: 'TR' },
  { hostname: 'lv-rix.prod.surfshark.com',   country: 'Latvia',         city: 'Riga',           code: 'LV' },
  { hostname: 'lt-vil.prod.surfshark.com',   country: 'Lithuania',      city: 'Vilnius',        code: 'LT' },
  { hostname: 'ee-tll.prod.surfshark.com',   country: 'Estonia',        city: 'Tallinn',        code: 'EE' },
  { hostname: 'sk-bts.prod.surfshark.com',   country: 'Slovakia',       city: 'Bratislava',     code: 'SK' },
  { hostname: 'bg-sof.prod.surfshark.com',   country: 'Bulgaria',       city: 'Sofia',          code: 'BG' },
  { hostname: 'hr-zgb.prod.surfshark.com',   country: 'Croatia',        city: 'Zagreb',         code: 'HR' },
  { hostname: 'rs-beg.prod.surfshark.com',   country: 'Serbia',         city: 'Belgrade',       code: 'RS' },
  { hostname: 'ua-iev.prod.surfshark.com',   country: 'Ukraine',        city: 'Kyiv',           code: 'UA' },
  { hostname: 'md-chi.prod.surfshark.com',   country: 'Moldova',        city: 'Chisinau',       code: 'MD' },
  { hostname: 'al-tia.prod.surfshark.com',   country: 'Albania',        city: 'Tirana',         code: 'AL' },
  { hostname: 'is-rkv.prod.surfshark.com',   country: 'Iceland',        city: 'Reykjavik',      code: 'IS' },
  { hostname: 'lu-esch.prod.surfshark.com',  country: 'Luxembourg',     city: 'Luxembourg',     code: 'LU' },
  { hostname: 'il-tlv.prod.surfshark.com',   country: 'Israel',         city: 'Tel Aviv',       code: 'IL' },
  { hostname: 'cy-nic.prod.surfshark.com',   country: 'Cyprus',         city: 'Nicosia',        code: 'CY' },
  { hostname: 'mt-mlt.prod.surfshark.com',   country: 'Malta',          city: 'Malta',          code: 'MT' },
  { hostname: 'si-lju.prod.surfshark.com',   country: 'Slovenia',       city: 'Ljubljana',      code: 'SI' },
  // North America
  { hostname: 'us-nyc.prod.surfshark.com',   country: 'USA',            city: 'New York',       code: 'US' },
  { hostname: 'us-nyc2.prod.surfshark.com',  country: 'USA',            city: 'New York 2',     code: 'US' },
  { hostname: 'us-atl.prod.surfshark.com',   country: 'USA',            city: 'Atlanta',        code: 'US' },
  { hostname: 'us-bos.prod.surfshark.com',   country: 'USA',            city: 'Boston',         code: 'US' },
  { hostname: 'us-chi.prod.surfshark.com',   country: 'USA',            city: 'Chicago',        code: 'US' },
  { hostname: 'us-dal.prod.surfshark.com',   country: 'USA',            city: 'Dallas',         code: 'US' },
  { hostname: 'us-den.prod.surfshark.com',   country: 'USA',            city: 'Denver',         code: 'US' },
  { hostname: 'us-hou.prod.surfshark.com',   country: 'USA',            city: 'Houston',        code: 'US' },
  { hostname: 'us-lax.prod.surfshark.com',   country: 'USA',            city: 'Los Angeles',    code: 'US' },
  { hostname: 'us-mia.prod.surfshark.com',   country: 'USA',            city: 'Miami',          code: 'US' },
  { hostname: 'us-sea.prod.surfshark.com',   country: 'USA',            city: 'Seattle',        code: 'US' },
  { hostname: 'us-was.prod.surfshark.com',   country: 'USA',            city: 'Washington DC',  code: 'US' },
  { hostname: 'ca-tor.prod.surfshark.com',   country: 'Canada',         city: 'Toronto',        code: 'CA' },
  { hostname: 'ca-mon.prod.surfshark.com',   country: 'Canada',         city: 'Montreal',       code: 'CA' },
  { hostname: 'ca-van.prod.surfshark.com',   country: 'Canada',         city: 'Vancouver',      code: 'CA' },
  // Asia & Middle East
  { hostname: 'jp-tok.prod.surfshark.com',   country: 'Japan',          city: 'Tokyo',          code: 'JP' },
  { hostname: 'jp-tok2.prod.surfshark.com',  country: 'Japan',          city: 'Tokyo 2',        code: 'JP' },
  { hostname: 'jp-osa.prod.surfshark.com',   country: 'Japan',          city: 'Osaka',          code: 'JP' },
  { hostname: 'sg-sng.prod.surfshark.com',   country: 'Singapore',      city: 'Singapore',      code: 'SG' },
  { hostname: 'sg-sng2.prod.surfshark.com',  country: 'Singapore',      city: 'Singapore 2',    code: 'SG' },
  { hostname: 'hk-hkg.prod.surfshark.com',   country: 'Hong Kong',      city: 'Hong Kong',      code: 'HK' },
  { hostname: 'hk-hkg2.prod.surfshark.com',  country: 'Hong Kong',      city: 'Hong Kong 2',    code: 'HK' },
  { hostname: 'kr-sel.prod.surfshark.com',   country: 'South Korea',    city: 'Seoul',          code: 'KR' },
  { hostname: 'in-mum.prod.surfshark.com',   country: 'India',          city: 'Mumbai',         code: 'IN' },
  { hostname: 'in-chn.prod.surfshark.com',   country: 'India',          city: 'Chennai',        code: 'IN' },
  { hostname: 'tw-tpe.prod.surfshark.com',   country: 'Taiwan',         city: 'Taipei',         code: 'TW' },
  { hostname: 'th-bkk.prod.surfshark.com',   country: 'Thailand',       city: 'Bangkok',        code: 'TH' },
  { hostname: 'my-kul.prod.surfshark.com',   country: 'Malaysia',       city: 'Kuala Lumpur',   code: 'MY' },
  { hostname: 'id-jkt.prod.surfshark.com',   country: 'Indonesia',      city: 'Jakarta',        code: 'ID' },
  { hostname: 'ae-auh.prod.surfshark.com',   country: 'UAE',            city: 'Abu Dhabi',      code: 'AE' },
  { hostname: 'ae-dub.prod.surfshark.com',   country: 'UAE',            city: 'Dubai',          code: 'AE' },
  // Oceania
  { hostname: 'au-syd.prod.surfshark.com',   country: 'Australia',      city: 'Sydney',         code: 'AU' },
  { hostname: 'au-mel.prod.surfshark.com',   country: 'Australia',      city: 'Melbourne',      code: 'AU' },
  { hostname: 'nz-akl.prod.surfshark.com',   country: 'New Zealand',    city: 'Auckland',       code: 'NZ' },
  // South America
  { hostname: 'br-sao.prod.surfshark.com',   country: 'Brazil',         city: 'Sao Paulo',      code: 'BR' },
  { hostname: 'ar-bue.prod.surfshark.com',   country: 'Argentina',      city: 'Buenos Aires',   code: 'AR' },
  { hostname: 'mx-mex.prod.surfshark.com',   country: 'Mexico',         city: 'Mexico City',    code: 'MX' },
  // Africa
  { hostname: 'za-jnb.prod.surfshark.com',   country: 'South Africa',   city: 'Johannesburg',   code: 'ZA' },
];

// ==================== Helpers ====================
function sendJSON(res, code, obj) {
  if (res.headersSent) return;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(code);
  res.end(JSON.stringify(obj));
}

// ==================== DNS over HTTPS ====================
// ISP ایران DNS رو مسموم می‌کنه — DoH از این دور میزنه
const dnsCache = new Map();

function resolveDoH(hostname) {
  if (dnsCache.has(hostname)) return Promise.resolve(dnsCache.get(hostname));

  return new Promise(resolve => {
    // اول سیستم DNS رو امتحان کن
    const sysTimer = setTimeout(() => resolve(null), 2000);
    dns.resolve4(hostname, (err, addrs) => {
      clearTimeout(sysTimer);
      if (!err && addrs?.length) {
        dnsCache.set(hostname, addrs[0]);
        return resolve(addrs[0]);
      }
      resolve(null);
    });
  }).then(ip => {
    if (ip) return ip;

    // DNS سیستم fail شد — DoH از Cloudflare
    return new Promise(resolve => {
      const req = https.get(
        `https://1.1.1.1/dns-query?name=${hostname}&type=A`,
        { headers: { Accept: 'application/dns-json' }, timeout: 4000 },
        res => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => {
            try {
              const j = JSON.parse(body);
              const a = j.Answer?.find(r => r.type === 1);
              if (a?.data) { dnsCache.set(hostname, a.data); return resolve(a.data); }
            } catch {}
            resolve(hostname); // fallback به hostname
          });
        }
      );
      req.on('error', () => resolve(hostname));
      req.on('timeout', () => { req.destroy(); resolve(hostname); });
    });
  });
}

// ==================== Probe functions ====================
function tcpTest(ip, port, timeoutMs = 2500) {
  return new Promise(resolve => {
    const s = new net.Socket();
    const t = Date.now();
    let done = false;
    const finish = ms => { if (done) return; done = true; s.destroy(); resolve(ms); };
    s.setTimeout(timeoutMs);
    s.connect(port, ip, () => finish(Date.now() - t));
    s.on('timeout', () => finish(null));
    s.on('error',   () => finish(null));
  });
}

function tlsProbe(ip, port, hostname, timeoutMs = 4000) {
  return new Promise(resolve => {
    const start = Date.now();
    let done = false;
    const finish = ok => {
      if (done) return; done = true;
      try { sock.destroy(); } catch {}
      resolve(ok ? Date.now() - start : null);
    };
    const sock = tls.connect({
      host: ip, port,
      servername: hostname,
      rejectUnauthorized: false,
      timeout: timeoutMs,
    });
    sock.on('secureConnect', () => finish(true));
    sock.on('error',         () => finish(false));
    sock.on('timeout',       () => finish(false));
  });
}

function icmpPing(target, timeoutMs = 2000) {
  return new Promise(resolve => {
    const cmd = process.platform === 'win32'
      ? `ping -n 1 -w ${timeoutMs} ${target}`
      : `ping -c 1 -W ${Math.ceil(timeoutMs / 1000)} ${target}`;
    exec(cmd, { timeout: timeoutMs + 2000 }, (err, stdout) => {
      if (!stdout) return resolve(null);
      const m = stdout.match(/Average\s*=\s*(\d+)ms/i) || stdout.match(/[Tt]ime[<=](\d+)ms/);
      if (m) return resolve(parseInt(m[1]));
      if (/TTL=/i.test(stdout)) return resolve(1);
      resolve(null);
    });
  });
}

// ==================== bestPing ====================
// مشکل اصلی ایران: DNS poisoning + IP block
// راه‌حل: DoH برای DNS، بعد TLS probe
async function bestPing(hostname) {
  // DNS با DoH fallback
  const realIP = await resolveDoH(hostname);

  // TLS 443 و TCP 443 موازی
  const [tls443, tcp443] = await Promise.all([
    tlsProbe(realIP, 443, hostname, 4000),
    tcpTest(realIP,  443, 3000),
  ]);

  if (tls443 !== null) return { ms: tls443, method: 'tls443', vpnAccessible: true, ip: realIP };

  // TCP وصل شد ولی TLS fail = DPI
  if (tcp443 !== null) return { ms: tcp443, method: 'tcp443-syn', vpnAccessible: false, ip: realIP };

  // ICMP
  const icmp = await icmpPing(realIP, 2000);
  if (icmp !== null) return { ms: icmp, method: 'icmp', vpnAccessible: false, ip: realIP };

  return { ms: null, method: null, vpnAccessible: false, ip: realIP };
}

// ==================== HTTP Server ====================
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  let pathname = '', query = {};
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);
    pathname = u.pathname;
    query = Object.fromEntries(u.searchParams);
  } catch { pathname = req.url.split('?')[0]; }

  if (pathname === '/' || pathname === '/dashboard.html') {
    fs.readFile(path.join(__dirname, 'surf_dashboard.html'), (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200); res.end(data);
    });
    return;
  }

  if (pathname === '/api/servers') {
    return sendJSON(res, 200, { servers: SURF_SERVERS, count: SURF_SERVERS.length });
  }

  if (pathname === '/api/data/status') {
    return sendJSON(res, 200, { count: SURF_SERVERS.length, source: 'static' });
  }

  if (pathname === '/api/ping') {
    const hostname = query.host;
    if (!hostname) return sendJSON(res, 400, { error: 'Missing host' });
    bestPing(hostname)
      .then(d  => sendJSON(res, 200, { host: hostname, ...d }))
      .catch(() => sendJSON(res, 200, { host: hostname, ms: null, method: null, vpnAccessible: false }));
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Surfshark Dashboard → http://localhost:${PORT}/dashboard.html`);
  console.log(`📡 ${SURF_SERVERS.length} servers loaded`);
  console.log(`🔑 DNS: System DNS with Cloudflare DoH fallback`);
});