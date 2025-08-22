import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';

export const useSessionChecker = () => {
  const { token, validateToken, sessionExpired, signOut } = useAuthStore();
  const intervalRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // 사용자 활동 감지
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);

  // 주기적 토큰 검증 및 비활성 시간 체크
  useEffect(() => {
    if (!token) return;

    const checkSession = async () => {
      const now = Date.now();
      const inactiveTime = now - lastActivityRef.current;
      
      // 30분(1800000ms) 비활성 시 자동 로그아웃
      if (inactiveTime > 1800000) {
        signOut();
        return;
      }

      // 토큰 유효성 검증
      await validateToken();
    };

    // 초기 검증
    validateToken();

    // 5분마다 세션 체크
    intervalRef.current = setInterval(checkSession, 300000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token, validateToken, signOut]);

  // 세션 만료 시 자동 로그아웃
  useEffect(() => {
    if (sessionExpired) {
      const timer = setTimeout(() => {
        signOut();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [sessionExpired, signOut]);
};