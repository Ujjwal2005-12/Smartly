require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`Smartly Backend running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);

  // Non-blocking initial database connectivity check
  pool.getConnection()
    .then((connection) => {
      console.log('Database connected successfully.');
      connection.release();
    })
    .catch((err) => {
      console.warn('[Database Notice]: Database not yet reachable or schema not initialized:', err.code || err.message);
    });
const server = app.listen(PORT, async () => {
  console.log(`Smartly Backend running on port ${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log('Database connected successfully.');
  } catch (err) {
    console.warn('[Database Notice]: Database is unavailable:', err.code || err.name);
  }
});

module.exports = server;
