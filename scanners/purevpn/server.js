'use strict';
const path    = require('path');
const express = require('express');
const apiRouter = require('./src/routes/api');
const { loadServers, getServers } = require('./src/data');

const PORT = process.env.PORT || 3004;
const app  = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiRouter);
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

async function startServer() {
  await loadServers();
  const SERVERS = getServers();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ PureVPN Scanner → http://localhost:${PORT}/`);
    console.log(`📡 ${SERVERS.length} servers loaded (${process.env.PUREVPN_SERVER_LIST_URL ? 'remote' : 'static'})`);
    console.log(`🔑 DNS: System DNS with Cloudflare DoH fallback`);
  });
}

startServer().catch(err => {
  console.error('Failed to start PureVPN server:', err);
  process.exit(1);
});
