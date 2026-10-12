const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const router = express.Router();

/**
 * Public Authentication Route
 * POST /api/auth/login
 */
router.post('/login', authController.login);

/**
 * Authenticated User Session Route
 * GET /api/auth/me
 */
router.get('/me', authenticate, authController.getMe);

/**
 * Role-Restricted Demonstration Route
 * GET /api/auth/admin-only
 * Requires valid JWT and ADMIN role.
 */
router.get('/admin-only', authenticate, authorize('ADMIN'), authController.adminOnly);

module.exports = router;
