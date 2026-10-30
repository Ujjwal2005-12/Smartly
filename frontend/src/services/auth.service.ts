import { api, setToken, removeToken } from './api';
import { User } from '../types';

export const authService = {
  /**
   * Registers a new student account.
   */
  async register(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await api.post<{ message: string; token: string; user: User }>('/auth/register', {
      name,
      email,
      password,
    });
    setToken(res.token);
    localStorage.setItem('smartly_user', JSON.stringify(res.user));
    return res;
  },

  /** Creates the one-time initial administrator account. */
  async registerAdmin(name: string, email: string, password: string, bootstrapToken: string): Promise<{ token: string; user: User }> {
    const res = await api.post<{ message: string; token: string; user: User }>('/auth/register-admin', {
      name,
      email,
      password,
      bootstrapToken,
    });
    setToken(res.token);
    localStorage.setItem('smartly_user', JSON.stringify(res.user));
    return res;
  },

  /**
   * Authenticates user credentials against the backend.
   */
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await api.post<{ message: string; token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    setToken(res.token);
    localStorage.setItem('smartly_user', JSON.stringify(res.user));
    return res;
  },

  /**
   * Restores current authenticated user profile from /api/auth/me.
   */
  async getMe(): Promise<User | null> {
    try {
      const res = await api.get<{ user: User }>('/auth/me');
      if (res && res.user) {
        localStorage.setItem('smartly_user', JSON.stringify(res.user));
        return res.user;
      }
      return null;
    } catch (err: any) {
      if (err.status === 401) {
        removeToken();
        localStorage.removeItem('smartly_user');
      }
      throw err;
    }
  },

  /**
   * Updates user password via /api/auth/change-password.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return api.put<{ message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  /**
   * Cleans up authentication tokens and cached user session.
   */
  logout(): void {
    removeToken();
    localStorage.removeItem('smartly_user');
  },
};
