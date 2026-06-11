'use strict';
const express = require('express');
const { loadServers, getServers, getSource } = require('../data');
const { bestPing } = require('../services/probe');

const router = express.Router();

// لیست سرورها (به‌صورت زنده از منبع ExpressVPN، با fallback به لیست محلی)
router.get('/servers', async (req, res) => {
  await loadServers();
  const servers = getServers();
  res.json({ servers, count: servers.length, source: getSource() });
});

// وضعیت دیتاست
router.get('/data/status', async (req, res) => {
  await loadServers();
  const servers = getServers();
  res.json({ count: servers.length, source: getSource() });
});

// خروجی سرورها به صورت CSV یا JSON
router.get('/export', async (req, res) => {
  await loadServers();
  const servers = getServers();
  const format = req.query.format || 'json';

  if (format === 'csv') {
    const csv = ['hostname,country,city,code']
      .concat(servers.map(s => `${s.hostname},${s.country},${s.city},${s.code}`))
      .join('\n');
    res.type('text/csv').send(csv);
  } else {
    res.json({ servers, count: servers.length, source: getSource() });
  }
});

// probe یک سرور: /api/ping?host=node-nl-01.protonvpn.net
// اگر IP سرور در لیست کشف‌شده موجود باشد، همان را استفاده می‌کنیم تا DNS
// (که پشت فیلترینگ poison می‌شود) دور زده شود. می‌توان با ?ip= هم داد.
router.get('/ping', async (req, res) => {
  const hostname = req.query.host;
  if (!hostname) return res.status(400).json({ error: 'Missing host' });

  // IP معلوم: از کوئری یا از لیست سرورهای بارگذاری‌شده
  let knownIP = req.query.ip;
  if (!knownIP) {
    const match = getServers().find(s => s.hostname === hostname);
    if (match && match.ip) knownIP = match.ip;
  }

  try {
    const result = await bestPing(hostname, knownIP);
    res.json({ host: hostname, ...result });
  } catch {
    res.json({ host: hostname, ms: null, method: null, vpnAccessible: false });
  }
});

module.exports = router;

