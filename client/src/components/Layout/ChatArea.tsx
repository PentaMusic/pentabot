import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import AuthModal from '../Auth/AuthModal';
import { MenuIcon, SendIcon, WelcomeIcon, SignInIcon } from '../icons/Icons';
import './ChatArea.css';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ApiMessage {
  id: string;
  content: string;
  role: string;
  created_at: string;
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

  // Simple markdown parser
  const parseMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, lineIndex) => {
        // Handle code blocks
        if (line.startsWith('```')) {
          return { type: 'code-delimiter', content: line, lineIndex };
        }
        // Handle headers
        if (line.startsWith('### ')) {
          return { type: 'h3', content: line.slice(4), lineIndex };
        }
        if (line.startsWith('## ')) {
          return { type: 'h2', content: line.slice(3), lineIndex };
        }
        if (line.startsWith('# ')) {
          return { type: 'h1', content: line.slice(2), lineIndex };
        }
        // Handle bullet points
        if (line.match(/^[-*+] /)) {
          return { type: 'list-item', content: line.slice(2), lineIndex };
        }
        // Handle numbered lists
        if (line.match(/^\d+\. /)) {
          return { type: 'numbered-item', content: line.replace(/^\d+\. /, ''), lineIndex };
        }
        // Regular text
        return { type: 'text', content: line, lineIndex };
      });
  };

  const formatInlineMarkdown = (text: string) => {
    // Handle bold text **text**
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Handle italic text *text*
    text = text.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>');
    // Handle inline code `code`
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    return text;
  };

  const renderMarkdownContent = (content: string) => {
    const lines = parseMarkdown(content);
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    const elements: React.JSX.Element[] = [];
    let numberedItemCount = 0; // 번호 매겨진 항목의 실제 카운터

    lines.forEach((line, index) => {
      if (line.type === 'code-delimiter') {
        if (inCodeBlock) {
          // End code block
          elements.push(
            <pre key={`code-${index}`} className="code-block">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          // Start code block
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line.content);
        return;
      }

      switch (line.type) {
        case 'h1':
          elements.push(<h1 key={index} className="markdown-h1">{line.content}</h1>);
          break;
        case 'h2':
          elements.push(<h2 key={index} className="markdown-h2">{line.content}</h2>);
          break;
        case 'h3':
          elements.push(<h3 key={index} className="markdown-h3">{line.content}</h3>);
          break;
        case 'list-item':
          elements.push(
            <div key={index} className="markdown-list-item">
              • {<span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.content) }} />}
            </div>
          );
          break;
        case 'numbered-item':
          numberedItemCount++; // 번호 매겨진 항목일 때만 카운터 증가
          elements.push(
            <div key={index} className="markdown-numbered-item">
              {numberedItemCount}. {<span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.content) }} />}
            </div>
          );
          break;
        case 'text':
          if (line.content.trim()) {
            elements.push(
              <p key={index} className="markdown-text">
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.content) }} />
              </p>
            );
          } else {
            elements.push(<br key={index} />);
          }
          break;
      }
    });

    return elements;
  };

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
        const threadMessages = data.messages.map((msg: ApiMessage) => ({
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
                <WelcomeIcon />
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
                    <SignInIcon />
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
                    message.isUser ? (
                      message.content.split('\n').map((line, index, array) => (
                        <React.Fragment key={index}>
                          {line}
                          {index < array.length - 1 && <br />}
                        </React.Fragment>
                      ))
                    ) : (
                      <div className="markdown-content">
                        {renderMarkdownContent(message.content)}
                      </div>
                    )
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