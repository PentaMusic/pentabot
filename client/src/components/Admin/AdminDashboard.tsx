import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <h1>대시보드</h1>
        <p>관리자 페이지에 오신 것을 환영합니다, {user?.display_name || user?.email}</p>
      </div>

      <div className="admin-dashboard-content">
        <div className="dashboard-cards">
          <div className="dashboard-card">
            <div className="card-icon">🏢</div>
            <div className="card-content">
              <h3>조직관리</h3>
              <p>조직 및 부서를 관리합니다</p>
              <span className="card-status">준비중</span>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📈</div>
            <div className="card-content">
              <h3>사용량관리</h3>
              <p>전체 사용자의 사용량을 모니터링합니다</p>
              <span className="card-status">준비중</span>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">👥</div>
            <div className="card-content">
              <h3>관리자 관리</h3>
              <p>관리자 권한을 부여하고 관리합니다</p>
              <span className="card-status">준비중</span>
            </div>
          </div>
        </div>

        <div className="dashboard-info">
          <div className="info-box">
            <h3>📌 안내사항</h3>
            <ul>
              <li>관리자 페이지는 Phase 1 구현이 완료되었습니다.</li>
              <li>조직관리, 사용량관리, 관리자 관리 기능은 Phase 2에서 구현됩니다.</li>
              <li>현재는 관리자 로그인 및 권한 확인 기능이 활성화되어 있습니다.</li>
            </ul>
          </div>

          <div className="info-box">
            <h3>✅ 완료된 기능</h3>
            <ul>
              <li>user_type 컬럼 추가 (admin/user 구분)</li>
              <li>관리자 권한 미들웨어 (requireAdmin)</li>
              <li>관리자 로그인 페이지</li>
              <li>관리자 페이지 라우팅</li>
              <li>사이드바 메뉴 (조직관리, 사용량관리, 관리자 관리)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
