import { api } from './api';
import { Room } from '../types';

export const roomService = {
  async getAllRooms(params?: { search?: string; status?: string; minCapacity?: number }): Promise<Room[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.minCapacity) query.append('minCapacity', params.minCapacity.toString());

    const queryString = query.toString();
    const endpoint = queryString ? `/rooms?${queryString}` : '/rooms';
    const res = await api.get<{ rooms: any[] }>(endpoint);

    if (res && Array.isArray(res.rooms)) {
      return res.rooms.map((r) => ({
        id: r.id,
        name: r.name,
        capacity: Number(r.capacity) || 1,
        location: r.location || 'Campus Facility',
        building: r.location || 'Campus Facility',
        description: r.description || '',
        status: r.status,
        type: r.type || 'ROOM',
        is_active: r.is_active,
        equipment: ['Projector', 'Wi-Fi Access', 'Power Sockets'],
        nextFree: r.status === 'AVAILABLE' ? 'Now' : 'Check Schedule',
      }));
    }

    return [];
  },

  async getAvailableRooms(params: { startTime: string; endTime: string; minCapacity?: number }): Promise<Room[]> {
    const query = new URLSearchParams();
    query.append('startTime', params.startTime);
    query.append('endTime', params.endTime);
    if (params.minCapacity) query.append('minCapacity', params.minCapacity.toString());

    const res = await api.get<{ rooms: any[] }>(`/rooms/available?${query.toString()}`);
    return (res && res.rooms) || [];
  },

  async getRoomById(id: string | number): Promise<Room> {
    const res = await api.get<{ room: any }>(`/rooms/${id}`);
    if (res && res.room) {
      const r = res.room;
      return {
        id: r.id,
        name: r.name,
        capacity: Number(r.capacity) || 1,
        location: r.location || 'Campus Facility',
        building: r.location || 'Campus Facility',
        description: r.description || '',
        status: r.status,
        type: r.type || 'ROOM',
        is_active: r.is_active,
        equipment: ['Projector', 'Wi-Fi Access', 'Power Sockets'],
        nextFree: r.status === 'AVAILABLE' ? 'Now' : 'Check Schedule',
      };
    }
    throw new Error('Room not found');
  },

  async createRoom(data: {
    name: string;
    capacity: number;
    location?: string;
    description?: string;
    status?: string;
  }): Promise<{ message: string; room: Room }> {
    return api.post('/rooms', data);
  },

  async updateRoom(id: number | string, data: any): Promise<{ message: string; room: Room }> {
    return api.put(`/rooms/${id}`, data);
  },

  async deleteRoom(id: number | string): Promise<{ message: string }> {
    return api.delete(`/rooms/${id}`);
  },
};
