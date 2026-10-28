const userRepository = require('../repositories/userRepository');
const validId = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;
const validPage = (limit, offset) =>
  (limit === undefined || (/^\d+$/.test(String(limit)) && Number(limit) >= 1 && Number(limit) <= 100)) &&
  (offset === undefined || (/^\d+$/.test(String(offset)) && Number(offset) >= 0));

/**
 * Controller handling user administration operations (Admin only).
 */
const userController = {
  /**
   * GET /api/users
   * Lists users with optional filters (role, search by name/email, isActive).
   */
  async getAllUsers(req, res, next) {
    try {
      const { search, role, isActive, limit, offset } = req.query;
      if (role !== undefined && (typeof role !== 'string' || !['ADMIN', 'FACULTY', 'STUDENT'].includes(role.toUpperCase()))) return res.status(400).json({ message: 'Invalid role filter' });
      if (search !== undefined && (typeof search !== 'string' || search.length > 200)) return res.status(400).json({ message: 'search must be a string of at most 200 characters' });
      if (isActive !== undefined && !['true', 'false', '1', '0'].includes(isActive)) return res.status(400).json({ message: 'isActive must be true, false, 1, or 0' });
      if (!validPage(limit, offset)) return res.status(400).json({ message: 'limit must be 1-100 and offset must be a non-negative integer' });
      const filters = {};

      if (search) filters.search = search;
      if (role) filters.role = role.toUpperCase();
      if (isActive !== undefined) filters.isActive = isActive === 'true' || isActive === '1';
      if (limit || offset !== undefined) filters.limit = limit ? parseInt(limit, 10) : 50;
      if (offset !== undefined) filters.offset = parseInt(offset, 10);

      const users = await userRepository.findAll(filters);
      return res.status(200).json({ users });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/users/:id
   * Retrieves single user details.
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      if (!validId(id)) return res.status(400).json({ message: 'Invalid user id' });
      const user = await userRepository.findUserById(id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/users/:id
   * Updates user profile, role, or active status.
   */
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      if (!validId(id)) return res.status(400).json({ message: 'Invalid user id' });
      const { name, role, is_active } = req.body;

      const existing = await userRepository.findUserById(id);
      if (!existing) {
        return res.status(404).json({ message: 'User not found' });
      }

      const targetId = parseInt(id, 10);
      // Prevent Admin from accidentally demoting or locking themselves out
      if (req.user.id === targetId) {
        if (role && role.toUpperCase() !== 'ADMIN') {
          return res.status(400).json({ message: 'Admins cannot demote their own account' });
        }
        if (is_active === 0 || is_active === false) {
          return res.status(400).json({ message: 'Admins cannot deactivate their own account' });
        }
      }

      // Validate role if updating
      if (role !== undefined && (typeof role !== 'string' || !['ADMIN', 'FACULTY', 'STUDENT'].includes(role.toUpperCase()))) {
        return res.status(400).json({ message: 'Invalid role. Permitted: ADMIN, FACULTY, STUDENT' });
      }
      if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) return res.status(400).json({ message: 'Name must be at least 2 characters long' });
      if (is_active !== undefined && ![0, 1, true, false].includes(is_active)) return res.status(400).json({ message: 'is_active must be a boolean or 0/1' });

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (role !== undefined) updateData.role = role.toUpperCase();
      if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;
      if (!Object.keys(updateData).length) return res.status(400).json({ message: 'At least one field must be provided' });
      if (existing.role === 'ADMIN' && existing.is_active && (updateData.is_active === 0 || (updateData.role && updateData.role !== 'ADMIN'))) {
        const activeAdmins = await userRepository.countActiveAdmins();
        if (activeAdmins <= 1) return res.status(409).json({ message: 'The last active admin cannot be deactivated' });
      }

      const updated = await userRepository.update(id, updateData);
      return res.status(200).json({
        message: 'User updated successfully',
        user: updated
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/users/:id
   * Soft-deactivates user account.
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      if (!validId(id)) return res.status(400).json({ message: 'Invalid user id' });
      const targetId = parseInt(id, 10);

      if (req.user.id === targetId) {
        return res.status(400).json({ message: 'Admins cannot deactivate their own account' });
      }

      const existing = await userRepository.findUserById(id);
      if (!existing) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (existing.role === 'ADMIN' && existing.is_active) {
        const activeAdmins = await userRepository.countActiveAdmins();
        if (activeAdmins <= 1) return res.status(409).json({ message: 'The last active admin cannot be deactivated' });
      }

      await userRepository.softDelete(id);
      return res.status(200).json({ message: 'User account deactivated successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = userController;
