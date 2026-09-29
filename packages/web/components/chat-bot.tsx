'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth/context';
import { MessageCircle, X, Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get auth context at the top level (only place hooks can be called)
  const { user } = useAuth();
  // localStorage only exists in the browser — reading it during render crashed
  // server-side rendering (this component is mounted in the root layout, so it
  // took down every page). Read it after mount instead.
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setToken(localStorage.getItem('fleetos_token'));
  }, []);
  const isAuthenticated = !!token && !!user;

  // Initialize chat with welcome message
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: Date.now().toString(),
      content: 'Hello! I\'m your Fleet OS assistant. I can help you with questions about your fleet management, machines, maintenance, fuel usage, billing, and more. What would you like to know about your fleet today?',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    setSuggestedActions(['Show fleet overview', 'Check machine status', 'View recent activity']);
  }, []);

  // Scroll to bottom of messages when they change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // `textOverride` lets a suggested action send its own label — reading state
  // straight after setInput() would still see the previous (empty) input.
  const handleSendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: text,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      if (!isAuthenticated) {
        // If no token, show a message asking user to log in
        const errorMessage: ChatMessage = {
          id: Date.now().toString() + 'e',
          content: 'Please log in to use the chatbot. You can log in from the login page.',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as {
        response: string;
        suggestedActions?: string[];
      };

      const botMessage: ChatMessage = {
        id: Date.now().toString() + 'b',
        content: data.response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
      setSuggestedActions(data.suggestedActions || []);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + 'e',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleSuggestedActionClick = (action: string) => {
    setInput(action);
    void handleSendMessage(action);
  };

  // Fix text visibility: ensure proper contrast in dark/light modes
  return (
    <div className="fixed right-4 bottom-4 z-[9999]">
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg hover:bg-brand-700 transition-all duration-200 transform hover:scale-105"
        aria-label="Open chatbot"
      >
        <MessageCircle className="h-6 w-6" />
        {/* Notification badge - uncomment if you want to show notifications */}
        {/* <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500"></div> */}
      </button>

      {/* Chat Popup */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Fleet OS chat assistant"
          aria-modal="false"
          className="chat-panel fixed right-4 bottom-16 z-[9999] flex max-h-[calc(100vh-7rem)] w-96 max-w-xs flex-col overflow-hidden rounded-lg shadow-xl border border-border"
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Fleet Assistant</h3>
                <p className="chat-muted text-sm">Ready to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} max-w-[80%]`}
              >
                <div
                  className={`chat-bot-bubble max-w-xs rounded-lg px-4 py-2 ${
                    message.isUser ? 'chat-user-bubble' : ''
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <span
                    className={`block text-xs ${
                      message.isUser ? 'chat-time--user' : 'chat-time--bot'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {/* Suggested Actions */}
            {suggestedActions.length > 0 && (
              <div className="mt-3">
                <p className="chat-muted text-xs mb-1">Quick suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedActionClick(action)}
                      className="chat-suggestion text-xs px-3 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="flex p-4 border-t border-border gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              autoFocus
              className="chat-field flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-brand-500"
              disabled={loading}
            />
            <button
              onClick={() => void handleSendMessage()}
              disabled={loading || !input.trim()}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Send className="h-4 w-4 animate-spin" />
                </>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}