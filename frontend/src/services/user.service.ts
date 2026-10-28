import { api } from './api';
import { User } from '../types';

export const userService = {
  async getAllUsers(params?: { search?: string; role?: string; isActive?: boolean }): Promise<User[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    if (params?.isActive !== undefined) query.append('isActive', params.isActive.toString());

    const queryString = query.toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';
    const res = await api.get<{ users: User[] }>(endpoint);
    return (res && res.users) || [];
  },

  async getUserById(id: number | string): Promise<User> {
    const res = await api.get<{ user: User }>(`/users/${id}`);
    if (res && res.user) {
      return res.user;
    }
    throw new Error('User not found');
  },

  async updateUser(
    id: number | string,
    data: { name?: string; role?: string; is_active?: number | boolean }
  ): Promise<{ message: string; user: User }> {
    return api.put(`/users/${id}`, data);
  },

  async deleteUser(id: number | string): Promise<{ message: string }> {
    return api.delete(`/users/${id}`);
  },
};
