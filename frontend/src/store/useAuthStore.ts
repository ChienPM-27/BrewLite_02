import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'BARISTA';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string | null;
  loyaltyPoints?: number;
  role: UserRole;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token: string, user: AuthUser) => {
        const normalizedUser: AuthUser = {
          ...user,
          role: user.role || 'CUSTOMER',
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
        }
        set({ token, user: normalizedUser });
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
        }
        set({ token: null, user: null });
      },
    }),
    {
      name: 'brewlite_auth',
      version: 1,
      migrate: (persistedState: any) => {
        if (persistedState && persistedState.user && !persistedState.user.role) {
          persistedState.user.role = 'CUSTOMER';
        }
        return persistedState as AuthState;
      },
      onRehydrateStorage: () => (state) => {
        if (state?.user && !state.user.role) {
          state.user.role = 'CUSTOMER';
        }
      },
    },
  ),
);
