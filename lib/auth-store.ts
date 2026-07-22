import { create } from 'zustand';
import { AuthSession, ScopeLevelType, User } from './types';

interface AuthState {
  session: AuthSession | null;
  user: User | null;
  isLoading: boolean;
  primaryRole: ScopeLevelType | null;
  
  setSession: (session: AuthSession | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setPrimaryRole: (role: ScopeLevelType | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: false,
  primaryRole: null,
  
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setPrimaryRole: (primaryRole) => set({ primaryRole }),
  
  logout: () => set({ 
    session: null, 
    user: null, 
    primaryRole: null,
    isLoading: false 
  }),
}));
