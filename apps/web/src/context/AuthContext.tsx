import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiUrl } from '../config/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User, refreshToken?: string) => void;
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
    }
    setIsLoading(false);
  }, []);

  const login = (jwtToken: string, userData: User, refreshToken?: string) => {
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem('agriedge_token', jwtToken);
    localStorage.setItem('agriedge_user', JSON.stringify(userData));
    if (refreshToken) {
      localStorage.setItem('agriedge_refresh_token', refreshToken);
    }
  };

  const demoLogin = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const resp = await fetch(apiUrl(`/api/v1/auth/demo-login/${role}`), {
        method: 'POST',
      });
      if (resp.ok) {
        const data = await resp.json();
        const userData: User = {
          id: data.user_id,
          email: `${role.toLowerCase()}@agriedge.internal`,
          full_name: data.full_name,
          role: role,
          language_preference: data.language_preference || 'en',
          consent_given: true,
          consent_version: 'dpdp-v1.0'
        };
        login(data.access_token, userData, data.refresh_token);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Backend demo-login endpoint unavailable, activating instant offline demo session:', err);
    }

    // Seamless client-side fallback ensures demo accounts are always testable
    const demoProfiles: Record<UserRole, { id: number; name: string; email: string }> = {
      FARMER: {
        id: 1,
        name: 'Ramesh Gowda (Farmer Demo)',
        email: 'ramesh.farmer@agriedge.internal'
      },
      FPO_ADMIN: {
        id: 2,
        name: 'Cauvery FPO Manager',
        email: 'admin.cauveryfpo@agriedge.internal'
      },
      AGRONOMIST: {
        id: 4,
        name: 'Dr. Priya Sharma (Lead Agronomist)',
        email: 'priya.agronomist@agriedge.internal'
      },
      SYSTEM_ADMIN: {
        id: 3,
        name: 'System Observability Lead',
        email: 'admin@agriedge.internal'
      }
    };

    const profile = demoProfiles[role] || demoProfiles.FARMER;
    const fallbackUser: User = {
      id: profile.id,
      email: profile.email,
      full_name: profile.name,
      role: role,
      language_preference: 'en',
      consent_given: true,
      consent_version: 'dpdp-v1.0'
    };
    login(`demo_mock_jwt_${role.toLowerCase()}`, fallbackUser);
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('agriedge_token');
    localStorage.removeItem('agriedge_refresh_token');
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
