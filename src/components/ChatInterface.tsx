'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ChatSettings {
  topK: number;
  temperature: number;
}

export default function ChatInterface() {
  const t = useTranslations('chat');
  const tSettings = useTranslations('settings');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({
    topK: 5,
    temperature: 0.7
  });
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatInput: userMessage.content,
          topK: settings.topK,
          temperature: settings.temperature
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: ''
      };

      setMessages(prev => [...prev, assistantMessage]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'chunk') {
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.type === 'assistant') {
                      lastMessage.content += data.content;
                      if (data.sources) {
                        lastMessage.sources = data.sources;
                      }
                      if (data.usage) {
                        lastMessage.usage = data.usage;
                      }
                    }
                    return newMessages;
                  });
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('Chat error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      
      // Remove the empty assistant message if there was an error
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.type === 'assistant' && !lastMessage.content) {
          newMessages.pop();
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = messages.filter(m => m.type === 'user').pop();
      if (lastUserMessage) {
        setInput(lastUserMessage.content);
        inputRef.current?.focus();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold" data-testid="chat-title">{t('title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1 bg-blue-700 rounded hover:bg-blue-800"
            data-testid="settings-toggle"
          >
            ⚙️ {tSettings('title')}
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1 bg-red-600 rounded hover:bg-red-700"
            data-testid="clear-chat"
          >
            🗑️ {t('clear')}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-100 p-4 border-b" data-testid="settings-panel">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{tSettings('topK')}:</label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.topK}
                onChange={(e) => setSettings(prev => ({ ...prev, topK: parseInt(e.target.value) || 5 }))}
                className="w-20 px-2 py-1 border rounded"
                data-testid="topk-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{tSettings('temperature')}:</label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                className="w-20 px-2 py-1 border rounded"
                data-testid="temperature-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 mt-4 rounded" data-testid="error-message">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={handleRetry}
              className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              data-testid="retry-button"
            >
              {t('retry')}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
            data-testid={`message-${message.type}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {message.sources && message.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <p className="text-sm font-semibold mb-1">Fuentes:</p>
                  {message.sources.map((source, idx) => (
                    <div key={idx} className="text-xs mb-1">
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        data-testid={`source-link-${idx}`}
                      >
                        {source.title}
                      </a>
                      <p className="text-gray-600">{source.snippet}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {message.usage && (
                <div className="mt-2 pt-2 border-t border-gray-300 text-xs text-gray-600" data-testid="usage-info">
                  <p>Tokens: {message.usage.totalTokens} (prompt: {message.usage.promptTokens}, completion: {message.usage.completionTokens})</p>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start" data-testid="loading-indicator">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-800">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span>{t('sending')}</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4" data-testid="chat-form">
        <div className="flex space-x-4">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('placeholder')}
            disabled={isLoading}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            data-testid="send-button"
          >
            {isLoading ? t('sending') : t('send')}
          </button>
        </div>
      </form>
    </div>
  );
}