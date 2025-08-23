import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AuthModal from '../Auth/AuthModal';
import { NewChatIcon, SidebarToggleIcon, SidebarCloseIcon, MessageIcon, TrashIcon, EditIcon, SearchIcon, UserIcon, ChevronDownIcon, SignOutIcon, LoadingSpinnerIcon, SignInIcon, SettingsIcon, KnowledgeIcon } from '../icons/Icons';
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
  onOpenProfileModal?: () => void;
  onNavigateToKnowledge?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  onThreadSelect,
  onNewChat,
  currentThreadId,
  onThreadCreated,
  onOpenProfileModal,
  onNavigateToKnowledge
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
      setIsLoadingThreads(false);
      return;
    }

    // 첫 로드가 아닌 경우 로딩 상태를 표시하지 않음
    const isFirstLoad = threads.length === 0;
    if (isFirstLoad) {
      setIsLoadingThreads(true);
    }

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
        
        // 이전 데이터와 비교하여 변경된 경우에만 업데이트
        setThreads(prevThreads => {
          if (JSON.stringify(prevThreads) === JSON.stringify(threadsList)) {
            return prevThreads;
          }
          return threadsList;
        });
        
        // 최근 사용한 스레드 자동 선택 (첫 번째가 가장 최근)
        if (threadsList.length > 0 && !currentThreadId) {
          const mostRecentThread = threadsList[0];
          setTimeout(() => {
            onThreadSelect(mostRecentThread.id);
            onThreadCreated?.(mostRecentThread.id);
          }, 0);
        }
      } else {
        if (response.status === 401) {
          // 토큰 만료 - useAuth에서 자동 로그아웃 처리됨
          setThreads([]);
          return;
        }
        console.error('Failed to fetch threads:', response.status);
        if (isFirstLoad) {
          setThreads([]);
        }
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
      if (isFirstLoad) {
        setThreads([]);
      }
    } finally {
      if (isFirstLoad) {
        setIsLoadingThreads(false);
      }
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
  }, [user, token]);

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
          <>
            <div className="navigation-menu">
              <button 
                className="nav-menu-item"
                onClick={() => onNavigateToKnowledge?.()}
              >
                <KnowledgeIcon />
                지식 베이스
              </button>
            </div>
            
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
          </>
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
          ) : isLoadingThreads && threads.length === 0 ? (
            <div className="loading-threads">
              <div className="loading-message">
                <div className="loading-spinner">
                  <LoadingSpinnerIcon />
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
                <UserIcon />
              </div>
              <div className="user-details">
                <span className="user-name">{user.display_name || user.email.split('@')[0]}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <div className="user-menu-icon">
                <ChevronDownIcon />
              </div>
            </button>
            
            {isUserMenuOpen && (
              <div className="user-menu">
                <button 
                  className="user-menu-item"
                  onClick={() => {
                    onOpenProfileModal?.();
                    setIsUserMenuOpen(false);
                  }}
                >
                  <SettingsIcon />
                  개인정보 설정
                </button>
                <button 
                  className="user-menu-item"
                  onClick={() => {
                    signOut();
                    setIsUserMenuOpen(false);
                  }}
                >
                  <SignOutIcon />
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
            <SignInIcon />
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