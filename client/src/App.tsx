import React, { useState, useRef, useEffect } from 'react';
import './index.css';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<number>(Math.floor(Math.random() * 1000000));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${apiUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          thread_id: threadId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const aiResponse = await response.text();
      
      // 디버깅용 - API 응답 확인
      console.log('API Response:', JSON.stringify(aiResponse));
      
      // 다양한 줄바꿈 형태를 실제 줄바꿈으로 변환하고 시작/끝 따옴표 제거
      const formattedResponse = aiResponse
        .replace(/^"|"$/g, '')  // 시작과 끝의 따옴표 제거
        .replace(/\\n/g, '\n')  // \\n을 \n으로
        .replace(/\r\n/g, '\n') // \r\n을 \n으로
        .replace(/\r/g, '\n');  // \r을 \n으로
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: formattedResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, something went wrong. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setInputValue('');
    setThreadId(Math.floor(Math.random() * 1000000));
  };

  const SendIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m22 2-7 20-4-9-9-4z"/>
      <path d="M22 2 11 13"/>
    </svg>
  );

  const NewChatIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14"/>
      <path d="M5 12h14"/>
    </svg>
  );

  const LoadingDots = () => (
    <div className="loading-dots">
      <span></span>{/*  */}
      <span></span>
      <span></span>
    </div>
  );

  return (
    <div className="app">
      <div className="chat-container">
        <header className="header">
          <h1>Current Chat</h1>
          <button 
            onClick={startNewChat}
            className="new-chat-button"
            aria-label="Start new chat"
          >
            <NewChatIcon />
            <span>New Chat</span>
          </button>
        </header>
        
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p>Start a conversation with AI</p>
            </div>
          ) : (
            <div className="messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.isUser ? 'user-message' : 'ai-message'}`}
                >
                  <div className="message-content">
                    {message.content.split('\\n').map((line, index, array) => (
                      <React.Fragment key={index}>
                        {line}
                        {index < array.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message ai-message">
                  <div className="message-content">
                    <LoadingDots />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="message-input"
              disabled={isLoading}
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="send-button"
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;