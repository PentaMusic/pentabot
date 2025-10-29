export interface User {
  id: string;
  email: string;
  display_name?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  resetPassword: (email: string, redirectTo: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string, accessToken: string, refreshToken?: string) => Promise<{ success: boolean; error?: string }>;
}