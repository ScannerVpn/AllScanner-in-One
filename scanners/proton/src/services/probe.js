'use strict';
const https = require('https');
const tls   = require('tls');
const net   = require('net');
const dns   = require('dns');
const { exec } = require('child_process');

// ====================================================================
// منطق تشخیص دسترسی سرور — الگو گرفته از surf_server.js
// مشکل ایران: DNS poisoning + IP block. راه‌حل: DoH + TLS probe.
// ====================================================================

const dnsCache = new Map();

// DNS سیستم رو امتحان می‌کند؛ اگر fail شد از چند DoH provider استفاده می‌کند
function resolveDoH(hostname) {
  if (dnsCache.has(hostname)) {
    console.log(`[DNS] Using cached IP for ${hostname}`);
    return Promise.resolve(dnsCache.get(hostname));
  }

  return new Promise(resolve => {
    const sysTimer = setTimeout(() => resolve(null), 1500);
    dns.resolve4(hostname, (err, addrs) => {
      clearTimeout(sysTimer);
      if (!err && addrs?.length) {
        const ip = addrs[0];
        console.log(`[DNS] System resolved ${hostname} to ${ip}`);
        if (!ip.startsWith('10.') && !ip.startsWith('172.') && !ip.startsWith('192.168.')) {
          console.log(`[DNS] IP is public, caching ${ip}`);
          dnsCache.set(hostname, ip);
          return resolve(ip);
        }
        console.log(`[DNS] IP is private (${ip}), trying DoH`);
      }
      resolve(null);
    });
  }).then(async ip => {
    if (ip) return ip;

    const providers = [
      'https://1.1.1.1/dns-query',
      'https://8.8.8.8/dns-query',
      'https://1.0.0.1/dns-query'
    ];

    for (const provider of providers) {
      try {
        console.log(`[DNS] Trying DoH provider: ${provider}`);
        const result = await new Promise((res, rej) => {
          const timeout = setTimeout(() => rej(new Error('timeout')), 3000);
          const req = https.get(
            `${provider}?name=${hostname}&type=A`,
            { headers: { Accept: 'application/dns-json' } },
            response => {
              clearTimeout(timeout);
              let body = '';
              response.on('data', d => (body += d));
              response.on('end', () => {
                try {
                  const j = JSON.parse(body);
                  const a = j.Answer?.find(r => r.type === 1);
                  if (a?.data) {
                    console.log(`[DNS] DoH resolved ${hostname} to ${a.data}`);
                    return res(a.data);
                  }
                } catch { /* ignore */ }
                rej(new Error('no answer'));
              });
            }
          );
          req.on('error', rej);
          req.on('timeout', () => { req.destroy(); rej(new Error('timeout')); });
        });
        dnsCache.set(hostname, result);
        return result;
      } catch (e) { console.log(`[DNS] DoH failed: ${e.message}`); }
    }

    console.log(`[DNS] All DNS methods failed for ${hostname}`);
    return null;
  });
}

// آیا TCP handshake روی پورت برقرار می‌شود؟ → latency یا null
function tcpTest(ip, port, timeoutMs = 2500) {
  return new Promise(resolve => {
    if (!ip || typeof ip !== 'string') return resolve(null);
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

// آیا TLS handshake کامل می‌شود؟ (DPI معمولاً اینجا قطع می‌کند) → latency یا null
function tlsProbe(ip, port, hostname, timeoutMs = 4000) {
  return new Promise(resolve => {
    if (!ip || typeof ip !== 'string') return resolve(null);
    const start = Date.now();
    let done = false;
    const finish = ok => {
      if (done) return; done = true;
      try { sock.destroy(); } catch { /* ignore */ }
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

// ICMP ping از طریق دستور سیستمی → latency یا null
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

// استراتژی اصلی: DoH → TLS+TCP موازی → ICMP fallback
// knownIP: اگر IP سرور از قبل معلوم باشد (از لیست کشف‌شده)، DNS را دور می‌زنیم.
// این پشت فیلترینگ حیاتی است چون DNS برای protonvpn.net poison می‌شود و
// در نتیجه همه‌ی سرورها اشتباهاً «بسته» نشان داده می‌شوند.
async function bestPing(hostname, knownIP) {
  const realIP = (knownIP && /^\d+\.\d+\.\d+\.\d+$/.test(knownIP)) ? knownIP : await resolveDoH(hostname);

  if (!realIP) return { ms: null, method: 'dns-fail', vpnAccessible: false, ip: null };

  const [tls443, tcp443] = await Promise.all([
    tlsProbe(realIP, 443, hostname, 4000),
    tcpTest(realIP,  443, 3000),
  ]);

  if (tls443 !== null) return { ms: tls443, method: 'tls443',     vpnAccessible: true,  ip: realIP };
  if (tcp443 !== null) return { ms: tcp443, method: 'tcp443-syn', vpnAccessible: false, ip: realIP };

  const icmp = await icmpPing(realIP, 2000);
  if (icmp !== null)   return { ms: icmp,   method: 'icmp',       vpnAccessible: false, ip: realIP };

  return { ms: null, method: null, vpnAccessible: false, ip: realIP };
}

module.exports = { bestPing, resolveDoH, tcpTest, tlsProbe, icmpPing };
