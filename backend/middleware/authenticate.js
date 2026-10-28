const { verifyToken } = require('../utils/token');
const userRepository = require('../repositories/userRepository');

/**
 * Authentication middleware to verify JWT in the Authorization header.
 * Enforces 'Bearer <token>' pattern.
 * Rejects missing, malformed, invalid, or expired tokens with HTTP 401.
 * Attaches verified identity strictly to req.user.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = parts[1];

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!decoded || !Number.isInteger(Number(decoded.id)) || Number(decoded.id) < 1) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const user = await userRepository.findUserById(decoded.id);
    if (!user || user.is_active === 0 || user.is_active === false) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Resolve role and account status from the database, not stale token or client claims.
    req.user = { id: user.id, role: user.role };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticate;
