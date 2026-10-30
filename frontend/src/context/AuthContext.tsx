import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/auth.service';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  token: string | null;
  isAuthenticated: boolean;
  isBackendConnected: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  registerAdmin: (name: string, email: string, password: string, bootstrapToken: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  checkConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('smartly_user');
    const savedToken = localStorage.getItem('smartly_token');
    return saved && savedToken ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('smartly_token'));
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkConnection = async () => {
    const alive = await api.checkHealth();
    setIsBackendConnected(alive);
  };

  useEffect(() => {
    const init = async () => {
      await checkConnection();
      const savedToken = localStorage.getItem('smartly_token');

      if (savedToken) {
        try {
          const profile = await authService.getMe();
          if (profile) {
            setUser(profile);
            setToken(savedToken);
          } else {
            setUser(null);
            setToken(null);
          }
        } catch {
          // In case session expired or backend rejected token
          authService.logout();
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
    };

    init();

    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await authService.login(email, password);
    setUser(res.user);
    setToken(res.token);
    return res.user;
  };

  const register = async (name: string, email: string, password: string): Promise<User> => {
    const res = await authService.register(name, email, password);
    setUser(res.user);
    setToken(res.token);
    return res.user;
  };

  const registerAdmin = async (name: string, email: string, password: string, bootstrapToken: string): Promise<User> => {
    const res = await authService.registerAdmin(name, email, password, bootstrapToken);
    setUser(res.user);
    setToken(res.token);
    return res.user;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const refreshUser = async () => {
    try {
      const u = await authService.getMe();
      if (u) setUser(u);
    } catch {
      // Session error handled by getMe
    }
  };

  const currentRole: UserRole = user?.role || 'STUDENT';

  return (
    <AuthContext.Provider
      value={{
        user,
        role: currentRole,
        token,
        isAuthenticated: !!user && !!token,
        isBackendConnected,
        isLoading,
        login,
        register,
        registerAdmin,
        logout,
        refreshUser,
        checkConnection,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
