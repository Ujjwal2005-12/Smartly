import { api } from './api';
import { Booking } from '../types';

function mapBooking(b: any): Booking {
  return {
    id: b.id,
    displayId: `REQ-2026-${String(b.id).padStart(3, '0')}`,
    user_id: b.user_id,
    user_name: b.user_name || 'Campus Student',
    user_email: b.user_email || '',
    user_role: b.user_role,
    resource_id: b.resource_id,
    resource_name: b.resource_name || 'Facility',
    resource_type: b.resource_type || 'ROOM',
    resource_location: b.resource_location,
    building: b.resource_location || 'Campus Facility',
    start_time: b.start_time,
    end_time: b.end_time,
    purpose: b.purpose,
    status: b.status,
    reviewed_by: b.reviewed_by,
    reviewer_name: b.reviewer_name,
    reviewed_at: b.reviewed_at,
    rejection_reason: b.rejection_reason,
    created_at: b.created_at,
  };
}

export const bookingService = {
  async getAllBookings(params?: { status?: string; roomId?: number }): Promise<Booking[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.roomId) query.append('roomId', params.roomId.toString());

    const queryString = query.toString();
    const endpoint = queryString ? `/bookings?${queryString}` : '/bookings';
    const res = await api.get<{ bookings: any[] }>(endpoint);

    if (res && Array.isArray(res.bookings)) {
      return res.bookings.map(mapBooking);
    }
    return [];
  },

  async getMyBookings(): Promise<Booking[]> {
    const res = await api.get<{ bookings: any[] }>('/bookings/my');
    if (res && Array.isArray(res.bookings)) {
      return res.bookings.map(mapBooking);
    }
    return [];
  },

  async getBookingById(id: number | string): Promise<Booking> {
    const res = await api.get<{ booking: any }>(`/bookings/${id}`);
    if (res && res.booking) {
      return mapBooking(res.booking);
    }
    throw new Error('Booking not found');
  },

  async createBooking(data: {
    roomId: number;
    startTime: string;
    endTime: string;
    purpose: string;
  }): Promise<{ message: string; booking: any }> {
    return api.post('/bookings', data);
  },

  async updateStatus(
    id: number | string,
    status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
    rejection_reason?: string
  ): Promise<{ message: string; booking: any }> {
    return api.put(`/bookings/${id}/status`, { status, rejection_reason });
  },

  async cancelBooking(id: number | string): Promise<{ message: string; booking: any }> {
    return api.post(`/bookings/${id}/cancel`);
  },
};
