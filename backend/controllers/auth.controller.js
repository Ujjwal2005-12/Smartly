const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const userRepository = require('../repositories/userRepository');
const { generateToken } = require('../utils/token');

// Basic email regex pattern for format validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Controller for user authentication & session management.
 */
const authController = {
  /**
   * POST /api/auth/register-admin
   * Creates the initial administrator once, with a server-configured setup token.
   */
  async registerAdmin(req, res, next) {
    const { name, email, password, bootstrapToken } = req.body;
    const configuredToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
    if (!configuredToken) {
      return res.status(503).json({ message: 'Initial admin setup is not enabled on this server' });
    }
    if (typeof bootstrapToken !== 'string') {
      return res.status(401).json({ message: 'Invalid admin setup token' });
    }
    const provided = Buffer.from(bootstrapToken);
    const expected = Buffer.from(configuredToken);
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return res.status(401).json({ message: 'Invalid admin setup token' });
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters long' });
    }
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    if (typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ message: 'Admin password must be at least 12 characters long' });
    }

    let connection;
    let lockAcquired = false;
    try {
      const normalizedEmail = email.trim();
      if (await userRepository.findUserByEmail(normalizedEmail)) {
        return res.status(409).json({ message: 'Email is already registered' });
      }

      connection = await pool.getConnection();
      const [lockRows] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired', ['smartly_admin_bootstrap']);
      if (Number(lockRows[0]?.acquired) !== 1) {
        return res.status(503).json({ message: 'Admin setup is busy; please try again' });
      }
      lockAcquired = true;

      const [adminRows] = await connection.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
      if (adminRows.length) {
        return res.status(409).json({ message: 'An administrator account already exists' });
      }
      if (await userRepository.findUserByEmail(normalizedEmail)) {
        return res.status(409).json({ message: 'Email is already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await userRepository.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'ADMIN',
        isActive: 1
      });
      const token = generateToken({ id: user.id, role: user.role });
      return res.status(201).json({
        message: 'Initial administrator account created successfully',
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    } catch (error) {
      return next(error);
    } finally {
      if (connection) {
        if (lockAcquired) {
          try { await connection.query('SELECT RELEASE_LOCK(?)', ['smartly_admin_bootstrap']); } catch (_) { /* preserve request result */ }
        }
        connection.release();
      }
    }
  },

  /**
   * POST /api/auth/register
   * Registers a new student account, hashes password, and returns JWT session.
   */
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // 1. Validation
      if (!name || !email || !password || typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: 'Name, email, and password are required' });
      }

      const trimmedName = name.trim();
      const trimmedEmail = email.trim();

      if (trimmedName.length < 2) {
        return res.status(400).json({ message: 'Name must be at least 2 characters long' });
      }

      if (!EMAIL_REGEX.test(trimmedEmail)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      // 2. Check duplicate email
      const existingUser = await userRepository.findUserByEmail(trimmedEmail);
      if (existingUser) {
        return res.status(409).json({ message: 'Email is already registered' });
      }

      // 3. Hash password with salted bcrypt
      const passwordHash = await bcrypt.hash(password, 10);

      // 4. Persist in database
      const newUser = await userRepository.create({
        name: trimmedName,
        email: trimmedEmail,
        passwordHash,
        role: 'STUDENT',
        isActive: 1
      });
      const token = generateToken({ id: newUser.id, role: newUser.role });
      return res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/login
   * Validates credentials and returns JWT token and safe user profile.
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // 1. Validate required fields and formats
      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const trimmedEmail = email.trim();
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // 2. Query user from repository
      const user = await userRepository.findUserByEmail(trimmedEmail);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // 3. Reject inactive accounts (contract includes is_active)
      if (user.is_active === 0 || user.is_active === false) {
        return res.status(401).json({ message: 'Account is inactive' });
      }

      // 4. Compare bcrypt password hash
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // 5. Generate signed JWT token with minimal claims
      const token = generateToken({
        id: user.id,
        role: user.role
      });

      // 6. Return response with strictly safe user fields (never return password_hash)
      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   * Restores session for authenticated user from database.
   */
  async getMe(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await userRepository.findUserById(userId);

      if (!user || user.is_active === 0 || user.is_active === false) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/auth/change-password
   * Allows authenticated user to update their account password.
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword || typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({ message: 'New password must be different from current password' });
      }

      // Fetch user with hash
      const user = await userRepository.findUserWithPasswordById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect current password' });
      }

      // Hash new password and save
      const newHash = await bcrypt.hash(newPassword, 10);
      await userRepository.updatePassword(req.user.id, newHash);

      return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/admin-only
   * Demonstration endpoint for role-based authorization verification.
   */
  adminOnly(req, res) {
    return res.status(200).json({
      message: 'Admin access granted',
      user: req.user
    });
  }
};

module.exports = authController;
