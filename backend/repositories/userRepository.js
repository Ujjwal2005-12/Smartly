const pool = require('../config/db');

/**
 * Repository layer isolating database queries for the users table.
 * Adheres to the contract: id, name, email, password_hash, role, is_active.
 */
const userRepository = {
  /**
   * Finds a user by email for authentication.
   * @param {string} email
   * @returns {Promise<Object|null>} User object including password_hash and is_active, or null.
   */
  async findUserByEmail(email) {
    const query = 'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ?';
    const [rows] = await pool.query(query, [email]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Finds a user by primary key ID for session restoration.
   * Excludes password_hash for safety.
   * @param {number|string} id
   * @returns {Promise<Object|null>} Safe user object with is_active, or null.
   */
  async findUserById(id) {
    const query = 'SELECT id, name, email, role, is_active FROM users WHERE id = ?';
    const [rows] = await pool.query(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  }
};

module.exports = userRepository;
