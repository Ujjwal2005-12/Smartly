const roomRepository = require('../repositories/roomRepository');
const RESOURCE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE'];
const positiveInteger = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;
const pagination = (limit, offset) => {
  if (limit !== undefined && (!/^\d+$/.test(String(limit)) || Number(limit) < 1 || Number(limit) > 100)) return false;
  if (offset !== undefined && (!/^\d+$/.test(String(offset)) || Number(offset) < 0)) return false;
  return true;
};

/**
 * Controller handling room and facility resource endpoints.
 */
const roomController = {
  /**
   * GET /api/rooms
   * List all rooms with optional filtering (search, status, capacity).
   */
  async getAllRooms(req, res, next) {
    try {
      const { search, status, minCapacity, limit, offset } = req.query;
      if (status !== undefined && (typeof status !== 'string' || !RESOURCE_STATUSES.includes(status.toUpperCase()))) return res.status(400).json({ message: 'Invalid resource status' });
      if (search !== undefined && (typeof search !== 'string' || search.length > 200)) return res.status(400).json({ message: 'search must be a string of at most 200 characters' });
      if (minCapacity !== undefined && (!/^\d+$/.test(String(minCapacity)) || Number(minCapacity) < 1)) return res.status(400).json({ message: 'minCapacity must be a positive integer' });
      if (!pagination(limit, offset)) return res.status(400).json({ message: 'limit must be 1-100 and offset must be a non-negative integer' });
      const filters = {};

      if (search) filters.search = search;
      if (status) filters.status = status.toUpperCase();
      if (minCapacity) filters.minCapacity = parseInt(minCapacity, 10);
      if (limit || offset !== undefined) filters.limit = limit ? parseInt(limit, 10) : 50;
      if (offset !== undefined) filters.offset = parseInt(offset, 10);

      const rooms = await roomRepository.findAll(filters);
      return res.status(200).json({ rooms });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/rooms/available
   * List rooms available within a specific time window.
   */
  async getAvailableRooms(req, res, next) {
    try {
      const { startTime, endTime, minCapacity } = req.query;

      if (typeof startTime !== 'string' || typeof endTime !== 'string' || !startTime || !endTime) {
        return res.status(400).json({ message: 'startTime and endTime query parameters are required' });
      }

      const start = new Date(startTime), end = new Date(endTime);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
        return res.status(400).json({ message: 'endTime must be greater than startTime' });
      }
      if (minCapacity !== undefined && (!/^\d+$/.test(String(minCapacity)) || Number(minCapacity) < 1)) return res.status(400).json({ message: 'minCapacity must be a positive integer' });

      const rooms = await roomRepository.findAvailable({
        startTime,
        endTime,
        minCapacity: minCapacity ? parseInt(minCapacity, 10) : undefined
      });

      return res.status(200).json({ rooms });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/rooms/:id
   * Get single room by ID.
   */
  async getRoomById(req, res, next) {
    try {
      const { id } = req.params;
      if (!positiveInteger(id)) return res.status(400).json({ message: 'Invalid room id' });
      const room = await roomRepository.findById(id);

      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      return res.status(200).json({ room });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/rooms
   * Create a new room (Admin only).
   */
  async createRoom(req, res, next) {
    try {
      const { name, capacity, location, description, status } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'Room name is required' });
      }
      if (capacity !== undefined && (!Number.isInteger(Number(capacity)) || Number(capacity) < 1)) return res.status(400).json({ message: 'capacity must be a positive integer' });
      if (status && !RESOURCE_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid resource status' });

      const newRoom = await roomRepository.create({
        name: name.trim(),
        capacity: capacity ? parseInt(capacity, 10) : 1,
        location: location || null,
        description: description || null,
        status: status || 'AVAILABLE'
      });

      return res.status(201).json({
        message: 'Room created successfully',
        room: newRoom
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/rooms/:id
   * Update existing room (Admin only).
   */
  async updateRoom(req, res, next) {
    try {
      const { id } = req.params;
      if (!positiveInteger(id)) return res.status(400).json({ message: 'Invalid room id' });
      const existing = await roomRepository.findById(id);

      if (!existing) {
        return res.status(404).json({ message: 'Room not found' });
      }

      const updates = { ...req.body };
      if (updates.name !== undefined && (typeof updates.name !== 'string' || !updates.name.trim())) return res.status(400).json({ message: 'name cannot be empty' });
      if (updates.capacity !== undefined && (!Number.isInteger(Number(updates.capacity)) || Number(updates.capacity) < 1)) return res.status(400).json({ message: 'capacity must be a positive integer' });
      if (updates.status !== undefined && !RESOURCE_STATUSES.includes(updates.status)) return res.status(400).json({ message: 'Invalid resource status' });
      if (updates.type !== undefined && updates.type !== 'ROOM') return res.status(400).json({ message: 'Room type cannot be changed through this endpoint' });
      const updated = await roomRepository.update(id, updates);
      return res.status(200).json({
        message: 'Room updated successfully',
        room: updated
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/rooms/:id
   * Soft-delete a room (Admin only).
   */
  async deleteRoom(req, res, next) {
    try {
      const { id } = req.params;
      if (!positiveInteger(id)) return res.status(400).json({ message: 'Invalid room id' });
      const existing = await roomRepository.findById(id);

      if (!existing) {
        return res.status(404).json({ message: 'Room not found' });
      }

      await roomRepository.softDelete(id);
      return res.status(200).json({ message: 'Room deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = roomController;
