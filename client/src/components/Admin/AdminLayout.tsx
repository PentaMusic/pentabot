import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import AdminSidebar from './AdminSidebar';
import './AdminLayout.css';

const AdminLayout: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Admin 권한 확인
  useEffect(() => {
    const verifyAdmin = async () => {
      if (!user || !token) {
        // 로그인하지 않은 경우 로그인 페이지로
        navigate('/admin');
        return;
      }

      // Admin 권한 확인
      if (user.user_type !== 'admin') {
        alert('관리자 권한이 필요합니다.');
        navigate('/admin');
        return;
      }

      // 백엔드 API로 권한 재확인
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const response = await fetch(`${apiUrl}/admin/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 403) {
            alert('관리자 권한이 없습니다.');
            navigate('/admin');
          } else if (response.status === 401) {
            alert('인증이 만료되었습니다. 다시 로그인해주세요.');
            navigate('/admin');
          }
        }
      } catch (error) {
        console.error('Admin verification error:', error);
        alert('권한 확인 중 오류가 발생했습니다.');
        navigate('/admin');
      }
    };

    verifyAdmin();
  }, [user, token, navigate]);

  // 로딩 중이거나 권한이 없는 경우 빈 화면 표시
  if (!user || user.user_type !== 'admin') {
    return null;
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
