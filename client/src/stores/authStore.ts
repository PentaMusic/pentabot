import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  sessionExpired: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setSessionExpired: (expired: boolean) => void;
  signOut: () => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  validateToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      sessionExpired: false,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      setSessionExpired: (sessionExpired) => set({ sessionExpired }),

      signOut: () => {
        set({ user: null, token: null, sessionExpired: false });
        localStorage.removeItem('auth-storage');
      },

      signIn: async (email: string, password: string) => {
        try {
          const apiUrl = import.meta.env.VITE_API_URL;
          const response = await fetch(`${apiUrl}/auth/signin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            return { success: false, error: data.error || 'Login failed' };
          }

          const authToken = data.session?.access_token;
          if (authToken) {
            set({ 
              token: authToken, 
              user: data.user, 
              sessionExpired: false 
            });
          }

          return { success: true };
        } catch (error) {
          console.error('Sign in error:', error);
          return { success: false, error: 'Network error. Please try again.' };
        }
      },

      signUp: async (email: string, password: string, displayName?: string) => {
        try {
          const apiUrl = import.meta.env.VITE_API_URL;
          const response = await fetch(`${apiUrl}/auth/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, displayName }),
          });

          const data = await response.json();

          if (!response.ok) {
            return { success: false, error: data.error || 'Registration failed' };
          }

          const authToken = data.session?.access_token;
          if (authToken) {
            set({ 
              token: authToken, 
              user: data.user, 
              sessionExpired: false 
            });
          }

          return { success: true };
        } catch (error) {
          console.error('Sign up error:', error);
          return { success: false, error: 'Network error. Please try again.' };
        }
      },

      validateToken: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false });
          return;
        }

        try {
          const apiUrl = import.meta.env.VITE_API_URL;
          const response = await fetch(`${apiUrl}/auth/user`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            if (response.status === 401) {
              set({ 
                user: null, 
                token: null, 
                sessionExpired: true,
                isLoading: false 
              });
              return;
            }
            throw new Error('Token validation failed');
          }

          const data = await response.json();
          set({ user: data.user, sessionExpired: false, isLoading: false });
        } catch (error) {
          console.error('Token validation failed:', error);
          if (error instanceof Error && !error.message.includes('NetworkError')) {
            set({ 
              user: null, 
              token: null, 
              sessionExpired: true,
              isLoading: false 
            });
          } else {
            set({ isLoading: false });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);