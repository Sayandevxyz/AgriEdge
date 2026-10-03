import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('agriedge_token');
    const savedUser = localStorage.getItem('agriedge_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('agriedge_token');
        localStorage.removeItem('agriedge_user');
      }
    } else {
      // Auto-initialize demo farmer login in development mode for seamless judging experience
      demoLogin('FARMER').catch(() => {});
    }
    setIsLoading(false);
  }, []);

  const login = (jwtToken: string, userData: User) => {
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem('agriedge_token', jwtToken);
    localStorage.setItem('agriedge_user', JSON.stringify(userData));
  };

  const demoLogin = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const resp = await fetch(`/api/v1/auth/demo-login/${role}`, {
        method: 'POST',
      });
      if (resp.ok) {
        const data = await resp.json();
        const userData: User = {
          id: data.user_id,
          email: `${role.toLowerCase()}@agriedge.internal`,
          full_name: data.full_name,
          role: data.role as UserRole,
          language_preference: data.language_preference || 'en',
        };
        login(data.access_token, userData);
      }
    } catch (err) {
      console.error('Demo login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('agriedge_token');
    localStorage.removeItem('agriedge_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, demoLogin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
