import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './AdminLogin.css';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 이미 로그인되어 있고 admin이면 대시보드로 리다이렉트
  useEffect(() => {
    const verifyAdmin = async () => {
      if (user && token) {
        // Admin 권한 확인
        if (user.user_type === 'admin') {
          navigate('/admin/dashboard');
        } else {
          setError('관리자 권한이 필요합니다.');
        }
      }
    };

    verifyAdmin();
  }, [user, token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn(email, password);

      if (!result.success) {
        setError(result.error || '로그인에 실패했습니다.');
        setIsLoading(false);
        return;
      }

      // 로그인 성공 후 admin 권한 확인
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/admin/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('관리자 권한이 필요합니다.');
        } else {
          setError('권한 확인에 실패했습니다.');
        }
        setIsLoading(false);
        return;
      }

      // Admin 권한 확인 완료, 대시보드로 이동
      navigate('/admin/dashboard');
    } catch (err) {
      console.error('Admin login error:', err);
      setError('로그인 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <h1>관리자 로그인</h1>
          <p>관리자 권한이 필요합니다</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && (
            <div className="admin-login-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="admin-login-button"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="admin-login-footer">
          <a href="/" className="back-to-home">
            ← 메인 페이지로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
