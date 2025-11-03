import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import ProfileModal from '../Profile/ProfileModal';
import UsageStatsModal from '../UsageStats/UsageStatsModal';
import KnowledgeBase from '../KnowledgeBase/KnowledgeBase';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUsageStatsModalOpen, setIsUsageStatsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'knowledge'>('chat');

  // Initialize sidebar state based on screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 800) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleThreadSelect = (threadId: string) => {
    setCurrentThreadId(threadId);
  };

  const handleNewChat = () => {
    setCurrentThreadId(null);
  };

  const handleThreadCreated = (threadId: string) => {
    setCurrentThreadId(threadId);
  };

  const handleOpenProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const handleProfileUpdated = () => {
    // 프로필 업데이트 시 Sidebar는 자동으로 새로고침됨 (fetchUserProfile의 user/token 의존성)
  };

  const handleOpenUsageStatsModal = () => {
    setIsUsageStatsModalOpen(true);
  };

  const handleCloseUsageStatsModal = () => {
    setIsUsageStatsModalOpen(false);
  };

  const handleNavigateToKnowledge = () => {
    setCurrentView('knowledge');
  };

  const handleBackToChat = () => {
    setCurrentView('chat');
  };

  const handleSignOut = () => {
    setCurrentThreadId(null);
  };

  return (
    <div className="main-layout">
      {currentView === 'chat' && (
        <>
          <div className={`sidebar-container ${isSidebarOpen ? 'open' : 'closed'}`}>
            <Sidebar
              isOpen={isSidebarOpen}
              onToggle={toggleSidebar}
              onThreadSelect={handleThreadSelect}
              onNewChat={handleNewChat}
              currentThreadId={currentThreadId}
              onThreadCreated={handleThreadCreated}
              onOpenProfileModal={handleOpenProfileModal}
              onOpenUsageStatsModal={handleOpenUsageStatsModal}
              onNavigateToKnowledge={handleNavigateToKnowledge}
              onSignOut={handleSignOut}
            />
          </div>
          
          <div className="chat-container-main">
            <ChatArea 
              threadId={currentThreadId}
              onToggleSidebar={toggleSidebar}
              isSidebarOpen={isSidebarOpen}
              onNewThreadCreated={handleThreadCreated}
            />
          </div>
        </>
      )}

      {currentView === 'knowledge' && (
        <KnowledgeBase onBackToChat={handleBackToChat} />
      )}

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={handleCloseProfileModal}
        onProfileUpdated={handleProfileUpdated}
      />

      <UsageStatsModal
        isOpen={isUsageStatsModalOpen}
        onClose={handleCloseUsageStatsModal}
      />
    </div>
  );
};

export default MainLayout;