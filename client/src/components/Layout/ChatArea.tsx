import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AuthModal from '../Auth/AuthModal';
import './ChatArea.css';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatAreaProps {
  threadId: string | null;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onNewThreadCreated?: (threadId: string) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  threadId, 
  onToggleSidebar, 
  isSidebarOpen,
  onNewThreadCreated 
}) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(threadId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // threadId prop이 변경되면 currentThreadId도 업데이트
  useEffect(() => {
    setCurrentThreadId(threadId);
  }, [threadId]);

  // Thread 메시지를 불러오는 함수
  const loadThreadMessages = async (threadId: string) => {
    if (!user || !token) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const threadMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          isUser: msg.role === 'user',
          timestamp: new Date(msg.created_at),
        }));
        setMessages(threadMessages);
      } else {
        console.error('Failed to load thread messages');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading thread messages:', error);
      setMessages([]);
    }
  };

  useEffect(() => {
    // threadId가 변경되면 메시지를 초기화 (새로운 스레드)
    if (threadId === null) {
      setMessages([]);
    } else {
      // 실제 API에서 해당 스레드의 메시지를 가져옴
      loadThreadMessages(threadId);
    }
  }, [threadId, user, token]);

  // 새로운 thread 생성 함수
  const createNewThread = async (title: string = 'New Chat') => {
    console.log('createNewThread called:', { user: !!user, token: !!token, tokenLength: token?.length });
    
    if (!user || !token) return null;

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/threads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        const data = await response.json();
        const newThread = data.thread;
        setCurrentThreadId(newThread.id);
        onNewThreadCreated?.(newThread.id);
        return newThread.id;
      } else {
        const errorData = await response.text();
        console.error('Failed to create new thread:', response.status, errorData);
        return null;
      }
    } catch (error) {
      console.error('Error creating new thread:', error);
      return null;
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = window.innerWidth <= 768 ? 100 : 120;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    // Check if user is authenticated
    if (!user || !token) {
      setIsAuthModalOpen(true);
      return;
    }

    // 새로운 thread가 필요한 경우 생성
    let activeThreadId = currentThreadId;
    if (!activeThreadId) {
      const newThreadId = await createNewThread();
      if (!newThreadId) {
        console.error('Failed to create new thread');
        return;
      }
      activeThreadId = newThreadId;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Create placeholder AI message for streaming
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      content: '',
      isUser: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMessage]);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          thread_id: activeThreadId,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // 토큰 만료 - 로그아웃 처리는 useAuth에서 처리됨
          throw new Error('Authentication required. Please sign in again.');
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        let isFirstChunk = true;
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          if (isFirstChunk) {
            setIsLoading(false);
            isFirstChunk = false;
          }
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.id === aiMessageId 
                        ? { ...msg, content: data.content }
                        : msg
                    )
                  );
                }
              } catch {
                console.warn('Failed to parse streaming data:', line);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: 'Sorry, something went wrong. Please try again.' }
            : msg
        )
      );
    } finally {
      // Loading state is already handled in the streaming logic
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const MenuIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );

  const SendIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m22 2-7 20-4-9-9-4z"/>
      <path d="M22 2 11 13"/>
    </svg>
  );

  const LoadingDots = () => (
    <div className="loading-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );

  return (
    <div className="chat-area">
      <div className="chat-header">
        <button 
          className="sidebar-toggle-mobile"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <MenuIcon />
        </button>
        <h1>Pentabot</h1>
      </div>

      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="welcome-message">
              <div className="welcome-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              {user ? (
                <>
                  <h2>How can I help you today?</h2>
                  <p>Start a conversation with AI assistant</p>
                </>
              ) : (
                <>
                  <h2>Welcome to Pentabot</h2>
                  <p>Please sign in to start chatting with AI assistant</p>
                  <button 
                    className="sign-in-welcome-btn"
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                      <polyline points="10,17 15,12 10,7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Sign In to Chat
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.isUser ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-avatar">
                  {message.isUser ? (
                    <div className="user-avatar">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="ai-avatar">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 1v6m0 6v6"/>
                        <path d="M1 12h6m6 0h6"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="message-content">
                  {message.content ? (
                    message.content.split('\\n').map((line, index, array) => (
                      <React.Fragment key={index}>
                        {line}
                        {index < array.length - 1 && <br />}
                      </React.Fragment>
                    ))
                  ) : !message.isUser ? (
                    <LoadingDots />
                  ) : null}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="input-area">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={user ? "Message Pentabot..." : "Please sign in to chat"}
            className="message-input"
            disabled={isLoading || !user}
            rows={1}
            onClick={() => !user && setIsAuthModalOpen(true)}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading || !user}
            className="send-button"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
        <div className="input-footer">
          <p>Pentabot can make mistakes. Consider checking important information.</p>
        </div>
      </div>
      
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default ChatArea;