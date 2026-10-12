const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { generateToken } = require('../utils/token');

// Basic email regex pattern for format validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Controller for user authentication & session management.
 */
const authController = {
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
      // req.user is guaranteed by authenticate middleware
      const userId = req.user.id;
      const user = await userRepository.findUserById(userId);

      // Verify user still exists in database and remains active
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
