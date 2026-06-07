'use strict';
/**
 * گرفتن یک پورت آزاد از سیستم‌عامل.
 * یک سرور موقت روی پورت 0 و 127.0.0.1 بالا می‌آوریم تا OS یک پورت آزاد
 * تخصیص دهد، بلافاصله می‌بندیم و همان شماره را برمی‌گردانیم.
 */
const net = require('net');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

module.exports = { getFreePort };
