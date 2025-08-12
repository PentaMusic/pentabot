import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AuthModal from '../Auth/AuthModal';
import './Sidebar.css';

interface Thread {
  id: string;
  title: string;
  updated_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onThreadSelect: (threadId: string) => void;
  onNewChat: () => void;
  currentThreadId: string | null;
  onThreadCreated?: (threadId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onToggle,
  onThreadSelect,
  onNewChat,
  currentThreadId,
  onThreadCreated
}) => {
  const { user, token, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  // Thread 목록을 가져오는 함수
  const fetchThreads = useCallback(async () => {
    if (!user || !token) {
      setThreads([]);
      return;
    }

    setIsLoadingThreads(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/threads`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setThreads(data.threads || []);
      } else {
        if (response.status === 401) {
          // 토큰 만료 - useAuth에서 자동 로그아웃 처리됨
          setThreads([]);
          return;
        }
        console.error('Failed to fetch threads:', response.status);
        setThreads([]);
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
      setThreads([]);
    } finally {
      setIsLoadingThreads(false);
    }
  }, [user, token]);

  // 새로운 thread 생성 함수
  const createNewThread = async () => {
    if (!user || !token) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/threads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Chat',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newThread = data.thread;
        setThreads(prev => [newThread, ...prev]);
        onThreadSelect(newThread.id);
        onThreadCreated?.(newThread.id);
      } else {
        if (response.status === 401) {
          // 토큰 만료 - 로그인 모달 표시
          setIsAuthModalOpen(true);
          return;
        }
        console.error('Failed to create new thread:', response.status);
      }
    } catch (error) {
      console.error('Error creating new thread:', error);
    }
  };

  // 사용자 로그인 상태 변경시 threads 다시 가져오기
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // New Chat 버튼 핸들러 업데이트
  const handleNewChat = () => {
    if (user) {
      createNewThread();
    } else {
      onNewChat();
      setIsAuthModalOpen(true);
    }
  };

  const NewChatIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14"/>
      <path d="M5 12h14"/>
    </svg>
  );

  const MenuIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );

  const MessageIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button 
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label="Toggle sidebar"
        >
          <MenuIcon />
        </button>
        
        <button 
          className="new-chat-btn"
          onClick={handleNewChat}
          aria-label="Start new chat"
        >
          <NewChatIcon />
          <span>New Chat</span>
        </button>
      </div>

      <div className="sidebar-content">
        <div className="threads-list">
          {!user ? (
            <div className="empty-threads">
              <div className="empty-message">
                <MessageIcon />
                <p>Sign in to view your chats</p>
                <span>Your conversations will appear here</span>
              </div>
            </div>
          ) : isLoadingThreads ? (
            <div className="loading-threads">
              <div className="loading-message">
                <div className="loading-spinner">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                </div>
                <span>Loading conversations...</span>
              </div>
            </div>
          ) : threads.length === 0 ? (
            <div className="empty-threads">
              <div className="empty-message">
                <MessageIcon />
                <p>No conversations yet</p>
                <span>Start a new chat to begin</span>
              </div>
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                className={`thread-item ${currentThreadId === thread.id ? 'active' : ''}`}
                onClick={() => onThreadSelect(thread.id)}
                title={thread.title}
              >
                <MessageIcon />
                <span className="thread-title">{thread.title}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        {user ? (
          <div className="user-info-container">
            <button 
              className="user-info"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <div className="user-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="user-details">
                <span className="user-name">{user.display_name || user.email.split('@')[0]}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <div className="user-menu-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </div>
            </button>
            
            {isUserMenuOpen && (
              <div className="user-menu">
                <button 
                  className="user-menu-item"
                  onClick={() => {
                    signOut();
                    setIsUserMenuOpen(false);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            className="sign-in-btn"
            onClick={() => setIsAuthModalOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10,17 15,12 10,7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Sign In
          </button>
        )}
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default Sidebar;