const bookingRepository = require('../repositories/bookingRepository');
const roomRepository = require('../repositories/roomRepository');
const positiveInteger = (value) => /^\d+$/.test(String(value)) && Number(value) > 0;
const validPagination = (limit, offset) =>
  (limit === undefined || (/^\d+$/.test(String(limit)) && Number(limit) >= 1 && Number(limit) <= 100)) &&
  (offset === undefined || (/^\d+$/.test(String(offset)) && Number(offset) >= 0));

/**
 * Controller handling room reservation and access request endpoints.
 */
const bookingController = {
  /**
   * GET /api/bookings
   * Retrieves bookings. Students view their own bookings; Admins/Faculty view all bookings.
   */
  async getAllBookings(req, res, next) {
    try {
      const { status, roomId, limit, offset } = req.query;
      if (status !== undefined && (typeof status !== 'string' || !['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status.toUpperCase()))) return res.status(400).json({ message: 'Invalid booking status' });
      if (roomId !== undefined && !positiveInteger(roomId)) return res.status(400).json({ message: 'roomId must be a positive integer' });
      if (!validPagination(limit, offset)) return res.status(400).json({ message: 'limit must be 1-100 and offset must be a non-negative integer' });
      const user = req.user;

      let bookings;
      if (user.role === 'STUDENT') {
        // Students can only see their own bookings
        bookings = await bookingRepository.findByUserId(user.id, { status: status?.toUpperCase(), limit: limit || (offset !== undefined ? 50 : undefined), offset });
      } else {
        // Admin and Faculty can view all bookings across campus
        bookings = await bookingRepository.findAll({ status: status?.toUpperCase(), resource_id: roomId, limit: limit || (offset !== undefined ? 50 : undefined), offset });
      }

      return res.status(200).json({ bookings });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/bookings/my
   * Retrieves bookings belonging strictly to the currently logged-in user.
   */
  async getMyBookings(req, res, next) {
    try {
      const bookings = await bookingRepository.findByUserId(req.user.id);
      return res.status(200).json({ bookings });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/bookings/:id
   * Get booking details by ID with authorization check.
   */
  async getBookingById(req, res, next) {
    try {
      const { id } = req.params;
      if (!positiveInteger(id)) return res.status(400).json({ message: 'Invalid booking id' });
      const booking = await bookingRepository.findById(id);

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Authorization guard: Students cannot inspect other students' bookings
      if (req.user.role === 'STUDENT' && booking.user_id !== req.user.id) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      return res.status(200).json({ booking });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/bookings
   * Create a new reservation request.
   */
  async createBooking(req, res, next) {
    try {
      const { roomId, startTime, endTime, purpose } = req.body;

      // 1. Input validation
      if (!positiveInteger(roomId) || typeof startTime !== 'string' || typeof endTime !== 'string' || !startTime || !endTime || typeof purpose !== 'string' || !purpose.trim()) {
        return res.status(400).json({
          message: 'roomId, startTime, endTime, and purpose are required'
        });
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Invalid datetime format for startTime or endTime' });
      }

      if (end <= start) {
        return res.status(400).json({ message: 'endTime must be strictly greater than startTime' });
      }
      if (start <= new Date()) return res.status(400).json({ message: 'Bookings must start in the future' });

      // 2. Validate room exists
      const room = await roomRepository.findById(roomId);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      if (room.status === 'MAINTENANCE' || room.status === 'UNAVAILABLE') {
        return res.status(400).json({ message: `Room is currently in ${room.status} status and cannot be booked` });
      }

      // 3. Conflict Detection
      const hasConflict = await bookingRepository.hasConflict(roomId, startTime, endTime);
      if (hasConflict) {
        return res.status(409).json({
          message: 'Booking conflict: An approved reservation already exists for this room during this time window'
        });
      }

      // 4. Create reservation request
      const booking = await bookingRepository.create({
        userId: req.user.id, // Strictly bound to verified JWT
        roomId,
        startTime,
        endTime,
        purpose: purpose.trim()
      });

      return res.status(201).json({
        message: 'Booking request submitted successfully',
        booking
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/bookings/:id/status
   * Review a booking (APPROVE / REJECT) - Faculty and Admin only.
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      if (!positiveInteger(id)) return res.status(400).json({ message: 'Invalid booking id' });
      const { status, rejection_reason } = req.body;

      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({
          message: 'Invalid status. Permitted values: APPROVED, REJECTED'
        });
      }
      if (status === 'REJECTED' && rejection_reason !== undefined && (typeof rejection_reason !== 'string' || rejection_reason.length > 255)) {
        return res.status(400).json({ message: 'rejection_reason must be a string of at most 255 characters' });
      }

      const booking = await bookingRepository.findById(id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      if (booking.status !== 'PENDING') return res.status(409).json({ message: 'Only pending bookings can be reviewed' });

      // If approving, re-check conflict in case another booking was approved in the interim
      if (status === 'APPROVED') {
        const updated = await bookingRepository.approve(id, req.user.id);
        if (!updated) return res.status(404).json({ message: 'Booking not found' });
        return res.status(200).json({ message: 'Booking has been approved', booking: updated });
      }

      const updated = await bookingRepository.updateStatus(id, {
        status,
        reviewed_by: req.user.id,
        rejection_reason: status === 'REJECTED' ? rejection_reason : null
      });
      if (!updated) return res.status(409).json({ message: 'Only pending bookings can be reviewed' });

      return res.status(200).json({
        message: `Booking has been ${status.toLowerCase()}`,
        booking: updated
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/bookings/:id/cancel
   * Cancel an active or pending reservation.
   */
  async cancelBooking(req, res, next) {
    try {
      const { id } = req.params;
      if (!positiveInteger(id)) return res.status(400).json({ message: 'Invalid booking id' });
      const booking = await bookingRepository.findById(id);

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Student can only cancel their own booking; Admin/Faculty can cancel any
      const isOwner = booking.user_id === req.user.id;
      const isStaff = ['ADMIN', 'FACULTY'].includes(req.user.role);

      if (!isOwner && !isStaff) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const cancelled = await bookingRepository.cancel(id, isStaff ? null : req.user.id);
      if (!cancelled) return res.status(409).json({ message: 'Booking cannot be cancelled in its current status' });
      return res.status(200).json({
        message: 'Booking cancelled successfully',
        booking: cancelled
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = bookingController;
