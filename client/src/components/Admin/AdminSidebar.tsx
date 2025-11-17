import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AdminSidebar.css';

interface AdminSidebarProps {
  onNavigate?: (path: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      id: 'dashboard',
      path: '/admin/dashboard',
      label: '대시보드',
      icon: '📊',
    },
    {
      id: 'organizations',
      path: '/admin/dashboard/organizations',
      label: '조직관리',
      icon: '🏢',
    },
    {
      id: 'usage',
      path: '/admin/dashboard/usage',
      label: '사용량관리',
      icon: '📈',
    },
    {
      id: 'admins',
      path: '/admin/dashboard/admins',
      label: '관리자 관리',
      icon: '👥',
    },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onNavigate?.(path);
  };

  const isActive = (path: string) => {
    if (path === '/admin/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="admin-sidebar">
      <div className="admin-sidebar-header">
        <h2>관리자 페이지</h2>
        <p>Pentabot Admin</p>
      </div>

      <nav className="admin-sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`admin-sidebar-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => handleNavigation(item.path)}
          >
            <span className="admin-sidebar-icon">{item.icon}</span>
            <span className="admin-sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <button
          className="admin-sidebar-back"
          onClick={() => window.close()}
        >
          ← 메인으로 돌아가기
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
