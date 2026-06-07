'use strict';
const express = require('express');
const { loadServers, getServers } = require('../data');
const { bestPing } = require('../services/probe');

const router = express.Router();

router.get('/servers', async (req, res) => {
  await loadServers();
  const servers = getServers();
  res.json({ servers, count: servers.length });
});

router.get('/data/status', async (req, res) => {
  await loadServers();
  const servers = getServers();
  res.json({ count: servers.length, source: process.env.PUREVPN_SERVER_LIST_URL ? 'remote' : 'static' });
});

router.get('/ping', async (req, res) => {
  const hostname = req.query.host;
  if (!hostname) return res.status(400).json({ error: 'Missing host' });

  try {
    const result = await bestPing(hostname);
    res.json({ host: hostname, ...result });
  } catch {
    res.json({ host: hostname, ms: null, method: null, vpnAccessible: false });
  }
});

module.exports = router;
