import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSessionChecker } from './useSessionChecker';
import type { AuthContextType } from '../types/auth';

export const useAuth = (): AuthContextType => {
  const { 
    user, 
    token, 
    isLoading, 
    signIn, 
    signUp, 
    signOut, 
    validateToken,
    setLoading 
  } = useAuthStore();
  
  useSessionChecker();

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      await validateToken();
    };
    
    initAuth();
  }, [setLoading, validateToken]);

  return {
    user,
    token,
    isLoading,
    signIn,
    signUp,
    signOut,
  };
};