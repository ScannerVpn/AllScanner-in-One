'use strict';
const https = require('https');
const tls   = require('tls');
const net   = require('net');
const dns   = require('dns');
const { exec } = require('child_process');

const dnsCache = new Map();

function resolveDoH(hostname) {
  if (dnsCache.has(hostname)) return Promise.resolve(dnsCache.get(hostname));

  return new Promise(resolve => {
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

    return new Promise(resolve => {
      const req = https.get(
        `https://1.1.1.1/dns-query?name=${hostname}&type=A`,
        { headers: { Accept: 'application/dns-json' }, timeout: 4000 },
        res => {
          let body = '';
          res.on('data', d => (body += d));
          res.on('end', () => {
            try {
              const j = JSON.parse(body);
              const a = j.Answer?.find(r => r.type === 1);
              if (a?.data) { dnsCache.set(hostname, a.data); return resolve(a.data); }
            } catch { }
            // NXDOMAIN یا بدون رکورد A → نام واقعاً قابل‌حل نیست
            resolve(null);
          });
        }
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  });
}

function tcpTest(ip, port, timeoutMs = 2500) {
  return new Promise(resolve => {
    const s = new net.Socket();
    const t = Date.now();
    let done = false;
    const finish = ms => { if (done) return; done = true; s.destroy(); resolve(ms); };
    s.setTimeout(timeoutMs);
    s.connect(port, ip, () => finish(Date.now() - t));
    s.on('timeout', () => finish(null));
    s.on('error', () => finish(null));
  });
}

function tlsProbe(ip, port, hostname, timeoutMs = 4000) {
  return new Promise(resolve => {
    const start = Date.now();
    let done = false;
    const finish = ok => {
      if (done) return; done = true;
      try { sock.destroy(); } catch { }
      resolve(ok ? Date.now() - start : null);
    };
    const sock = tls.connect({
      host: ip, port,
      servername: hostname,
      rejectUnauthorized: false,
      timeout: timeoutMs,
    });
    sock.on('secureConnect', () => finish(true));
    sock.on('error', () => finish(false));
    sock.on('timeout', () => finish(false));
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
      if (m) return resolve(parseInt(m[1], 10));
      if (/TTL=/i.test(stdout)) return resolve(1);
      resolve(null);
    });
  });
}

async function bestPing(hostname) {
  const realIP = await resolveDoH(hostname);

  // اگر نام به هیچ IP ای حل نشد (NXDOMAIN)، فرقش با «مسدودشده» را مشخص می‌کنیم
  if (!realIP) {
    return { ms: null, method: 'dns-fail', vpnAccessible: false, ip: null };
  }

  // هم‌زمان: هندشیک کامل TLS روی 443 و اتصال خام TCP روی 443/80 را تست می‌کنیم.
  // نکته: سرورهای VPN معمولاً HTTPS استاندارد سرو نمی‌کنند، پس هندشیک کامل TLS
  // اغلب کامل نمی‌شود؛ بنابراین «اتصال موفق TCP» را به‌عنوان «در دسترس» می‌پذیریم.
  const [tls443, tcp443, tcp80] = await Promise.all([
    tlsProbe(realIP, 443, hostname, 4000),
    tcpTest(realIP, 443, 3000),
    tcpTest(realIP, 80, 3000),
  ]);

  // بهترین حالت: هندشیک کامل TLS انجام شد
  if (tls443 !== null) return { ms: tls443, method: 'tls443', vpnAccessible: true, ip: realIP };
  // اتصال TCP برقرار شد = سرور از پشت DPI قابل‌دسترس است
  if (tcp443 !== null) return { ms: tcp443, method: 'tcp443', vpnAccessible: true, ip: realIP };
  if (tcp80  !== null) return { ms: tcp80,  method: 'tcp80',  vpnAccessible: true, ip: realIP };

  // TCP وصل نشد ولی هاست زنده است (ICMP) → پورت‌ها فیلتر شده‌اند = DPI
  const icmp = await icmpPing(realIP, 2000);
  if (icmp !== null) return { ms: icmp, method: 'icmp', vpnAccessible: false, ip: realIP };

  return { ms: null, method: null, vpnAccessible: false, ip: realIP };
}

module.exports = { bestPing, resolveDoH, tcpTest, tlsProbe, icmpPing };
