import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  return (
    <div className="main-layout">
      <div className={`sidebar-container ${isSidebarOpen ? 'open' : 'closed'}`}>
        <Sidebar 
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
          onThreadSelect={handleThreadSelect}
          onNewChat={handleNewChat}
          currentThreadId={currentThreadId}
          onThreadCreated={handleThreadCreated}
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
    </div>
  );
};

export default MainLayout;