const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Determine allowed origins from environment or default local frontend origins
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

// Core Middleware
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  }
}));
app.use(express.json());
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body !== undefined && (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return res.status(400).json({ message: 'Request body must be a JSON object' });
  }
  next();
});

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const pool = require('./config/db');
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(503).json({ status: 'degraded', database: 'unavailable', timestamp: new Date().toISOString() });
  }
});

// Mount Modules
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Centralized error handling middleware
// Prevents exposing error stack traces, database credentials, or internal details to clients
app.use((err, req, res, next) => {
  // Log message safely for server debugging (never expose sensitive data)
  console.error('[Unhandled Server Error]:', err.code || err.name || 'Error');

  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON request body' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large' });
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A record with these unique values already exists' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ message: 'Referenced record does not exist' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ message: 'Record is still referenced and cannot be deleted' });
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) return res.status(err.statusCode).json({ message: err.message });
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
