import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { CloseIcon, ChartBarIcon } from '../icons/Icons';
import type { UsageStats, PeriodFilter } from '../../types/usage';
import './UsageStatsModal.css';

interface UsageStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UsageStatsModal: React.FC<UsageStatsModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>('30days');

  const apiUrl = import.meta.env.VITE_API_URL;

  // 기간별 날짜 계산
  const getDateRange = (periodFilter: PeriodFilter): { startDate?: string; endDate?: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (periodFilter) {
      case 'today': {
        const start = today.toISOString();
        return { startDate: start };
      }
      case '7days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        return { startDate: start.toISOString() };
      }
      case '30days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        return { startDate: start.toISOString() };
      }
      case 'all':
      default:
        return {};
    }
  };

  // 사용량 통계 조회
  const fetchStats = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange(period);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`${apiUrl}/usage/stats?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('사용량 통계를 불러올 수 없습니다.');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching usage stats:', err);
      setError('사용량 통계를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 모달이 열릴 때마다 데이터 로드
  useEffect(() => {
    if (isOpen && token) {
      fetchStats();
    }
  }, [isOpen, token, period]);

  // 툴 타입을 한글로 변환
  const getToolDisplayName = (toolType: string): string => {
    const toolNames: Record<string, string> = {
      'claude_chat': 'Claude Chat',
      'javascript_executor': 'JavaScript Executor',
      'weather_tool': 'Weather Tool',
      'web_search': 'Web Search',
      'image_generation': 'Image Generation',
      'code_analysis': 'Code Analysis',
    };
    return toolNames[toolType] || toolType;
  };

  // 숫자 포맷팅
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
  };

  // 비용 포맷팅
  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(4)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="usage-stats-modal-overlay" onClick={onClose}>
      <div className="usage-stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="usage-stats-modal-header">
          <div className="usage-stats-modal-title">
            <ChartBarIcon />
            <h2>사용량 통계</h2>
          </div>
          <button
            className="usage-stats-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="usage-stats-modal-content">
          {/* 기간 선택 탭 */}
          <div className="period-tabs">
            <button
              className={`period-tab ${period === 'today' ? 'active' : ''}`}
              onClick={() => setPeriod('today')}
            >
              오늘
            </button>
            <button
              className={`period-tab ${period === '7days' ? 'active' : ''}`}
              onClick={() => setPeriod('7days')}
            >
              7일
            </button>
            <button
              className={`period-tab ${period === '30days' ? 'active' : ''}`}
              onClick={() => setPeriod('30days')}
            >
              30일
            </button>
            <button
              className={`period-tab ${period === 'all' ? 'active' : ''}`}
              onClick={() => setPeriod('all')}
            >
              전체
            </button>
          </div>

          {isLoading ? (
            <div className="usage-stats-loading">
              <div className="loading-spinner" />
              <span>통계를 불러오는 중...</span>
            </div>
          ) : error ? (
            <div className="usage-stats-error">
              <p>{error}</p>
              <button onClick={fetchStats} className="retry-button">
                다시 시도
              </button>
            </div>
          ) : stats ? (
            <>
              {/* 전체 요약 */}
              <div className="stats-summary">
                <h3>전체 요약</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">총 사용 횟수</span>
                    <span className="summary-value">{formatNumber(stats.totalRequests)}회</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">총 토큰</span>
                    <span className="summary-value">{formatNumber(stats.totalTokens)} tokens</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">입력 토큰</span>
                    <span className="summary-value">{formatNumber(stats.totalInputTokens)} tokens</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">출력 토큰</span>
                    <span className="summary-value">{formatNumber(stats.totalOutputTokens)} tokens</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">총 비용</span>
                    <span className="summary-value cost">{formatCost(stats.totalCost)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">평균 실행 시간</span>
                    <span className="summary-value">{Math.round(stats.averageExecutionTime)}ms</span>
                  </div>
                </div>
              </div>

              {/* 모델별 상세 통계 */}
              <div className="tool-breakdown">
                <h3>모델별 상세 통계</h3>
                {Object.keys(stats.toolBreakdown).length > 0 ? (
                  <div className="tool-cards">
                    {Object.entries(stats.toolBreakdown).map(([toolType, toolStats]) => (
                      <div key={toolType} className="tool-card">
                        <div className="tool-card-header">
                          <h4>{getToolDisplayName(toolType)}</h4>
                        </div>
                        <div className="tool-card-body">
                          <div className="tool-stat">
                            <span className="tool-stat-label">사용 횟수</span>
                            <span className="tool-stat-value">{formatNumber(toolStats.count)}회</span>
                          </div>
                          <div className="tool-stat">
                            <span className="tool-stat-label">총 토큰</span>
                            <span className="tool-stat-value">{formatNumber(toolStats.tokens)} tokens</span>
                          </div>
                          <div className="tool-stat">
                            <span className="tool-stat-label">비용</span>
                            <span className="tool-stat-value cost">{formatCost(toolStats.cost)}</span>
                          </div>
                          <div className="tool-stat">
                            <span className="tool-stat-label">평균 실행 시간</span>
                            <span className="tool-stat-value">{Math.round(toolStats.averageExecutionTime)}ms</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-data">
                    <p>선택한 기간에 사용 내역이 없습니다.</p>
                  </div>
                )}
              </div>

              {/* 상태별 통계 */}
              <div className="status-breakdown">
                <h3>상태별 통계</h3>
                <div className="status-grid">
                  <div className="status-item success">
                    <span className="status-label">성공</span>
                    <span className="status-value">{formatNumber(stats.statusBreakdown.success)}회</span>
                  </div>
                  <div className="status-item error">
                    <span className="status-label">오류</span>
                    <span className="status-value">{formatNumber(stats.statusBreakdown.error)}회</span>
                  </div>
                  <div className="status-item timeout">
                    <span className="status-label">타임아웃</span>
                    <span className="status-value">{formatNumber(stats.statusBreakdown.timeout)}회</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="no-data">
              <p>사용량 통계가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsageStatsModal;
