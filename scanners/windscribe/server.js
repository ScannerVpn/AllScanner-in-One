'use strict';
const path    = require('path');
const express = require('express');
const apiRouter = require('./src/routes/api');
const { loadServers, getServers, getSource } = require('./src/data');

const PORT = process.env.PORT || 3007;
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
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`✅ Windscribe Scanner → http://localhost:${PORT}/`);
    console.log(`📡 ${SERVERS.length} servers loaded (source: ${getSource()})`);
  });
}
startServer().catch(err => { console.error('Failed to start Windscribe server:', err); process.exit(1); });
