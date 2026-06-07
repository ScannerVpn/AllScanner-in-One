'use strict';
const path    = require('path');
const express = require('express');
const apiRouter = require('./src/routes/api');
const { loadServers, getServers, getSource } = require('./src/data');

const PORT = process.env.PORT || 3003;
const app  = express();

// CORS برای همه‌ی route ها
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// فایل‌های استاتیک (داشبورد)
app.use(express.static(path.join(__dirname, 'public')));

// API
app.use('/api', apiRouter);

// 404 برای بقیه مسیرها
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

async function startServer() {
  await loadServers();
  const SERVERS = getServers();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Express Scanner → http://localhost:${PORT}/`);
    console.log(`📡 ${SERVERS.length} ExpressVPN servers loaded (source: ${getSource()})`);
    console.log(`🔑 DNS: System DNS with Cloudflare DoH fallback`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
