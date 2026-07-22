'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from './auth-store';
import { AuthSession, ScopeLevelType, User } from './types';

interface AuthContextType {
  session: AuthSession | null;
  user: User | null;
  isLoading: boolean;
  primaryRole: ScopeLevelType | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: ScopeLevelType) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, user, isLoading, primaryRole, setSession, setUser, setLoading, setPrimaryRole, logout } = useAuthStore();

  // Initialize session from localStorage (mock auth for now)
  useEffect(() => {
    const stored = localStorage.getItem('workworth_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSession(parsed);
      } catch (err) {
        console.error('Failed to restore session:', err);
      }
    }
    setLoading(false);
  }, [setSession, setLoading]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Mock authentication - replace with real API call
      const mockSession: AuthSession = {
        user: {
          id: 'user_' + Math.random().toString(36).substr(2, 9),
          email,
          name: email.split('@')[0],
          org_id: 'org_1',
          org_unit_id: 'unit_1',
          roles: ['MEMBER', 'ORG_UNIT_LEAD'] as ScopeLevelType[],
        },
        token: 'mock_token_' + Date.now(),
      };
      
      setSession(mockSession);
      setPrimaryRole('MEMBER');
      localStorage.setItem('workworth_session', JSON.stringify(mockSession));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('workworth_session');
  };

  const switchRole = (role: ScopeLevelType) => {
    if (session?.user.roles.includes(role)) {
      setPrimaryRole(role);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, primaryRole, login, logout: handleLogout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
