require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');

const PORT = process.env.PORT || 5000;

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
