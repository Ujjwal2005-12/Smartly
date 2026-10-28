const pool = require('../config/db');

/**
 * Repository layer isolating database queries for the requests table.
 * Manages booking & access requests, reviewer workflows, and conflict detection.
 */
const requestRepository = {
  /**
   * Creates a new access or booking request.
   * @param {Object} requestData
   * @param {number|string} requestData.user_id
   * @param {number|string} requestData.resource_id
   * @param {string|Date} requestData.start_time
   * @param {string|Date} requestData.end_time
   * @param {string} requestData.purpose
   * @returns {Promise<Object>} Created request entity with populated relationships.
   */
  async create({ user_id, resource_id, start_time, end_time, purpose }) {
    if (!user_id || !resource_id || !start_time || !end_time || !purpose) {
      throw new Error('user_id, resource_id, start_time, end_time, and purpose are all required');
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid start_time or end_time format');
    }

    if (endDate <= startDate) {
      throw new Error('end_time must be strictly after start_time');
    }

    const query = `
      INSERT INTO requests (user_id, resource_id, start_time, end_time, purpose, status)
      VALUES (?, ?, ?, ?, ?, 'PENDING')
    `;
    const params = [user_id, resource_id, start_time, end_time, purpose.trim()];
    const [result] = await pool.query(query, params);

    return this.findById(result.insertId);
  },

  /**
   * Retrieves a single request by its primary key ID with associated user and resource details.
   * @param {number|string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const query = `
      SELECT
        req.id,
        req.user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        req.resource_id,
        r.name AS resource_name,
        r.type AS resource_type,
        r.location AS resource_location,
        req.start_time,
        req.end_time,
        req.purpose,
        req.status,
        req.reviewed_by,
        rev.name AS reviewer_name,
        rev.email AS reviewer_email,
        req.reviewed_at,
        req.rejection_reason,
        req.created_at,
        req.updated_at
      FROM requests req
      INNER JOIN users u ON req.user_id = u.id
      INNER JOIN resources r ON req.resource_id = r.id
      LEFT JOIN users rev ON req.reviewed_by = rev.id
      WHERE req.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Retrieves requests submitted by a specific user.
   * @param {number|string} userId
   * @param {Object} [filters]
   * @param {string} [filters.status]
   * @param {number} [filters.limit]
   * @param {number} [filters.offset]
   * @returns {Promise<Array<Object>>}
   */
  async findByUserId(userId, filters = {}) {
    let query = `
      SELECT
        req.id,
        req.user_id,
        req.resource_id,
        r.name AS resource_name,
        r.type AS resource_type,
        r.location AS resource_location,
        req.start_time,
        req.end_time,
        req.purpose,
        req.status,
        req.reviewed_by,
        rev.name AS reviewer_name,
        rev.email AS reviewer_email,
        req.reviewed_at,
        req.rejection_reason,
        req.created_at,
        req.updated_at
      FROM requests req
      INNER JOIN resources r ON req.resource_id = r.id
      LEFT JOIN users rev ON req.reviewed_by = rev.id
      WHERE req.user_id = ?
    `;
    const params = [userId];

    if (filters.status) {
      query += ' AND req.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY req.start_time DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(Number(filters.limit));
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(Number(filters.offset));
      }
    }

    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * Retrieves all requests with optional status, resource, or date range filtering.
   * @param {Object} [filters]
   * @param {string} [filters.status]
   * @param {number|string} [filters.resource_id]
   * @param {number|string} [filters.user_id]
   * @param {string|Date} [filters.startDate]
   * @param {string|Date} [filters.endDate]
   * @param {number} [filters.limit]
   * @param {number} [filters.offset]
   * @returns {Promise<Array<Object>>}
   */
  async findAll(filters = {}) {
    let query = `
      SELECT
        req.id,
        req.user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        req.resource_id,
        r.name AS resource_name,
        r.type AS resource_type,
        r.location AS resource_location,
        req.start_time,
        req.end_time,
        req.purpose,
        req.status,
        req.reviewed_by,
        rev.name AS reviewer_name,
        rev.email AS reviewer_email,
        req.reviewed_at,
        req.rejection_reason,
        req.created_at
      FROM requests req
      INNER JOIN users u ON req.user_id = u.id
      INNER JOIN resources r ON req.resource_id = r.id
      LEFT JOIN users rev ON req.reviewed_by = rev.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND req.status = ?';
      params.push(filters.status);
    }

    const resourceId = filters.resource_id ?? filters.resourceId;
    if (resourceId) {
      query += ' AND req.resource_id = ?';
      params.push(resourceId);
    }

    if (filters.user_id) {
      query += ' AND req.user_id = ?';
      params.push(filters.user_id);
    }

    if (filters.startDate) {
      query += ' AND req.start_time >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND req.end_time <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY req.start_time DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(Number(filters.limit));
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(Number(filters.offset));
      }
    }

    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * Finds any overlapping APPROVED requests for a given resource and time frame.
   * Standard interval overlap condition: start_time < candidateEnd AND end_time > candidateStart
   * @param {number|string} resourceId
   * @param {string|Date} startTime
   * @param {string|Date} endTime
   * @param {number|string|null} [excludeRequestId=null]
   * @returns {Promise<Array<Object>>}
   */
  async findConflictingRequests(resourceId, startTime, endTime, excludeRequestId = null) {
    let query = `
      SELECT id, user_id, resource_id, start_time, end_time, status, purpose
      FROM requests
      WHERE resource_id = ?
        AND status = 'APPROVED'
        AND start_time < ?
        AND end_time > ?
    `;
    const params = [resourceId, endTime, startTime];

    if (excludeRequestId) {
      query += ' AND id != ?';
      params.push(excludeRequestId);
    }

    const [rows] = await pool.query(query, params);
    return rows;
  },

  /**
   * Boolean check for schedule conflicts.
   * @param {number|string} resourceId
   * @param {string|Date} startTime
   * @param {string|Date} endTime
   * @param {number|string|null} [excludeRequestId=null]
   * @returns {Promise<boolean>}
   */
  async hasConflict(resourceId, startTime, endTime, excludeRequestId = null) {
    const conflicts = await this.findConflictingRequests(resourceId, startTime, endTime, excludeRequestId);
    return conflicts.length > 0;
  },

  /**
   * Updates the workflow status of a request (e.g. APPROVED, REJECTED, CANCELLED).
   * @param {number|string} id
   * @param {Object} statusUpdate
   * @param {'PENDING'|'APPROVED'|'REJECTED'|'CANCELLED'} statusUpdate.status
   * @param {number|string|null} [statusUpdate.reviewed_by=null]
   * @param {string|null} [statusUpdate.rejection_reason=null]
   * @returns {Promise<Object|null>}
   */
  async updateStatus(id, { status, reviewed_by = null, rejection_reason = null }) {
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid request status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    let query;
    let params;

    if (status === 'APPROVED' || status === 'REJECTED') {
      query = `
        UPDATE requests
        SET status = ?,
            reviewed_by = ?,
            reviewed_at = NOW(),
            rejection_reason = ?
        WHERE id = ? AND status = 'PENDING'
      `;
      params = [status, reviewed_by, status === 'REJECTED' ? rejection_reason : null, id];
    } else {
      query = `
        UPDATE requests
        SET status = ?,
            rejection_reason = ?
        WHERE id = ? AND status = 'PENDING'
      `;
      params = [status, rejection_reason, id];
    }

    const [result] = await pool.query(query, params);
    if (result.affectedRows === 0) {
      return null;
    }

    return this.findById(id);
  },

  /** Approve under a resource row lock so simultaneous approvals serialize. */
  async approve(id, reviewed_by) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [requestRows] = await connection.query(
        'SELECT id, resource_id, start_time, end_time, status FROM requests WHERE id = ? FOR UPDATE', [id]
      );
      if (!requestRows.length) {
        await connection.rollback();
        return null;
      }
      const request = requestRows[0];
      if (request.status !== 'PENDING') {
        const error = new Error('Only pending requests can be reviewed');
        error.statusCode = 409;
        throw error;
      }

      const [resourceRows] = await connection.query(
        'SELECT id, status, is_active FROM resources WHERE id = ? FOR UPDATE', [request.resource_id]
      );
      if (!resourceRows.length) {
        const error = new Error('Resource no longer exists');
        error.statusCode = 409;
        throw error;
      }
      if (resourceRows[0].status !== 'AVAILABLE' || !resourceRows[0].is_active) {
        const error = new Error('Resource is not currently available for approval');
        error.statusCode = 409;
        throw error;
      }
      if (new Date(request.start_time).getTime() <= Date.now()) {
        const error = new Error('Past bookings cannot be approved');
        error.statusCode = 409;
        throw error;
      }

      const [conflicts] = await connection.query(
        `SELECT id FROM requests
         WHERE resource_id = ? AND status = 'APPROVED'
           AND start_time < ? AND end_time > ? AND id <> ?
         LIMIT 1`,
        [request.resource_id, request.end_time, request.start_time, id]
      );
      if (conflicts.length) {
        const error = new Error('An overlapping approved reservation exists for this resource');
        error.statusCode = 409;
        throw error;
      }

      const [result] = await connection.query(
        `UPDATE requests SET status = 'APPROVED', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = NULL
         WHERE id = ? AND status = 'PENDING'`, [reviewed_by, id]
      );
      if (!result.affectedRows) {
        const error = new Error('Request is no longer pending');
        error.statusCode = 409;
        throw error;
      }
      await connection.commit();
      return this.findById(id);
    } catch (error) {
      try { await connection.rollback(); } catch (_) { /* preserve original error */ }
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Cancels a pending or approved request.
   * @param {number|string} id
   * @param {number|string} [userId] Optional validation to ensure requester owns the request
   * @returns {Promise<Object|null>}
   */
  async cancel(id, userId = null) {
    let query = "UPDATE requests SET status = 'CANCELLED' WHERE id = ? AND status IN ('PENDING', 'APPROVED')";
    const params = [id];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    const [result] = await pool.query(query, params);
    if (result.affectedRows === 0) {
      return null;
    }

    return this.findById(id);
  },

  /**
   * Permanently deletes a request.
   * @param {number|string} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const query = 'DELETE FROM requests WHERE id = ?';
    const [result] = await pool.query(query, [id]);
    return result.affectedRows > 0;
  }
};

module.exports = requestRepository;
