import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AuthModal from '../Auth/AuthModal';
import { NewChatIcon, SidebarToggleIcon, SidebarCloseIcon, MessageIcon, TrashIcon, EditIcon, SearchIcon } from '../icons/Icons';
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
  isOpen,
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
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
        const threadsList = data.threads || [];
        setThreads(threadsList);
        
        // 최근 사용한 스레드 자동 선택 (첫 번째가 가장 최근)
        if (threadsList.length > 0 && !currentThreadId) {
          const mostRecentThread = threadsList[0];
          onThreadSelect(mostRecentThread.id);
          onThreadCreated?.(mostRecentThread.id);
        }
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
  }, [user, token, currentThreadId, onThreadSelect, onThreadCreated]);

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

  // Thread 삭제 함수
  const deleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user || !token) return;

    // 삭제 확인 대화상자
    const confirmed = window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/threads/${threadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setThreads(prev => prev.filter(t => t.id !== threadId));
        if (currentThreadId === threadId) {
          onThreadSelect(threads[0]?.id || '');
        }
        console.log('Thread deleted successfully');
      } else {
        const errorData = await response.text();
        console.error('Failed to delete thread:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  // Thread 이름 편집 시작
  const startEditingThread = (thread: Thread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(thread.id);
    setEditingTitle(thread.title);
  };

  // Thread 이름 편집 저장
  const saveThreadTitle = async (threadId: string) => {
    if (!user || !token || !editingTitle.trim()) {
      setEditingThreadId(null);
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingTitle.trim(),
        }),
      });

      if (response.ok) {
        await response.json();
        setThreads(prev => prev.map(t => 
          t.id === threadId 
            ? { ...t, title: editingTitle.trim() }
            : t
        ));
        console.log('Thread title updated successfully');
      } else {
        const errorData = await response.text();
        console.error('Failed to update thread title:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        // 실패 시 원래 제목으로 복원
        const originalThread = threads.find(t => t.id === threadId);
        if (originalThread) {
          setEditingTitle(originalThread.title);
        }
      }
    } catch (error) {
      console.error('Error updating thread title:', error);
      // 네트워크 에러 등의 경우 원래 제목으로 복원
      const originalThread = threads.find(t => t.id === threadId);
      if (originalThread) {
        setEditingTitle(originalThread.title);
      }
    } finally {
      setEditingThreadId(null);
      setEditingTitle('');
    }
  };

  // Thread 이름 편집 취소
  const cancelEditing = () => {
    setEditingThreadId(null);
    setEditingTitle('');
  };

  // Thread 이름 편집 키 핸들러
  const handleEditKeyDown = (e: React.KeyboardEvent, threadId: string) => {
    if (e.key === 'Enter') {
      saveThreadTitle(threadId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // 검색된 스레드 필터링
  const filteredThreads = threads.filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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








  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button 
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label="Toggle sidebar"
        >
          {isOpen ? <SidebarCloseIcon /> : <SidebarToggleIcon />}
        </button>
        
        <button 
          className="new-chat-btn"
          onClick={handleNewChat}
          aria-label="Start new chat"
        >
          <NewChatIcon />
        </button>
      </div>

      <div className="sidebar-content">
        {user && (
          <div className="search-container">
            <div className="search-input-wrapper">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        )}
        
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
          ) : filteredThreads.length === 0 ? (
            <div className="empty-threads">
              <div className="empty-message">
                <MessageIcon />
                <p>{searchQuery ? 'No matching conversations' : 'No conversations yet'}</p>
                <span>{searchQuery ? 'Try adjusting your search' : 'Start a new chat to begin'}</span>
              </div>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={`thread-item ${currentThreadId === thread.id ? 'active' : ''}`}
                onMouseEnter={() => setHoveredThreadId(thread.id)}
                onMouseLeave={() => setHoveredThreadId(null)}
                onClick={() => editingThreadId !== thread.id && onThreadSelect(thread.id)}
              >
                <MessageIcon />
                {editingThreadId === thread.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, thread.id)}
                    onBlur={() => saveThreadTitle(thread.id)}
                    className="thread-title-input"
                    autoFocus
                  />
                ) : (
                  <span className="thread-title" title={thread.title}>{thread.title}</span>
                )}
                {hoveredThreadId === thread.id && editingThreadId !== thread.id && (
                  <div className="thread-actions">
                    <button
                      className="edit-thread-btn"
                      onClick={(e) => startEditingThread(thread, e)}
                      aria-label="Edit thread name"
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="delete-thread-btn"
                      onClick={(e) => deleteThread(thread.id, e)}
                      aria-label="Delete thread"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                )}
              </div>
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