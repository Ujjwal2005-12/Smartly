import { api } from './api';
import { DashboardStats } from '../types';

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const res = await api.get<{ stats: DashboardStats }>('/dashboard/stats');
    if (res && res.stats) {
      return res.stats;
    }
    throw new Error('Failed to retrieve dashboard analytics');
  },
};
