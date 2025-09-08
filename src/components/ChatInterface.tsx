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
    <div className=\"flex flex-col h-screen max-w-4xl mx-auto bg-white\">\n      {/* Header */}\n      <div className=\"bg-blue-600 text-white p-4 flex justify-between items-center\">\n        <h1 className=\"text-xl font-bold\" data-testid=\"chat-title\">{t('title')}</h1>\n        <div className=\"flex gap-2\">\n          <button\n            onClick={() => setShowSettings(!showSettings)}\n            className=\"px-3 py-1 bg-blue-700 rounded hover:bg-blue-800\"\n            data-testid=\"settings-toggle\"\n          >\n            ⚙️ {tSettings('title')}\n          </button>\n          <button\n            onClick={handleClear}\n            className=\"px-3 py-1 bg-red-600 rounded hover:bg-red-700\"\n            data-testid=\"clear-chat\"\n          >\n            🗑️ {t('clear')}\n          </button>\n        </div>\n      </div>\n\n      {/* Settings Panel */}\n      {showSettings && (\n        <div className=\"bg-gray-100 p-4 border-b\" data-testid=\"settings-panel\">\n          <div className=\"flex gap-4\">\n            <div>\n              <label className=\"block text-sm font-medium mb-1\">{tSettings('topK')}:</label>\n              <input\n                type=\"number\"\n                min=\"1\"\n                max=\"20\"\n                value={settings.topK}\n                onChange={(e) => setSettings(prev => ({ ...prev, topK: parseInt(e.target.value) || 5 }))}\n                className=\"w-20 px-2 py-1 border rounded\"\n                data-testid=\"topk-input\"\n              />\n            </div>\n            <div>\n              <label className=\"block text-sm font-medium mb-1\">{tSettings('temperature')}:</label>\n              <input\n                type=\"number\"\n                min=\"0\"\n                max=\"2\"\n                step=\"0.1\"\n                value={settings.temperature}\n                onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}\n                className=\"w-20 px-2 py-1 border rounded\"\n                data-testid=\"temperature-input\"\n              />\n            </div>\n          </div>\n        </div>\n      )}\n\n      {/* Error Display */}\n      {error && (\n        <div className=\"bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 mt-4 rounded\" data-testid=\"error-message\">\n          <div className=\"flex justify-between items-center\">\n            <span>{error}</span>\n            <button\n              onClick={handleRetry}\n              className=\"ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700\"\n              data-testid=\"retry-button\"\n            >\n              {t('retry')}\n            </button>\n          </div>\n        </div>\n      )}\n\n      {/* Messages */}\n      <div className=\"flex-1 overflow-y-auto p-4 space-y-4\" data-testid=\"messages-container\">\n        {messages.map((message) => (\n          <div\n            key={message.id}\n            className={`flex ${\n              message.type === 'user' ? 'justify-end' : 'justify-start'\n            }`}\n            data-testid={`message-${message.type}`}\n          >\n            <div\n              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${\n                message.type === 'user'\n                  ? 'bg-blue-600 text-white'\n                  : 'bg-gray-200 text-gray-800'\n              }`}\n            >\n              <p className=\"whitespace-pre-wrap\">{message.content}</p>\n              \n              {message.sources && message.sources.length > 0 && (\n                <div className=\"mt-2 pt-2 border-t border-gray-300\">\n                  <p className=\"text-sm font-semibold mb-1\">Fuentes:</p>\n                  {message.sources.map((source, idx) => (\n                    <div key={idx} className=\"text-xs mb-1\">\n                      <a \n                        href={source.url} \n                        target=\"_blank\" \n                        rel=\"noopener noreferrer\"\n                        className=\"text-blue-600 hover:underline\"\n                        data-testid={`source-link-${idx}`}\n                      >\n                        {source.title}\n                      </a>\n                      <p className=\"text-gray-600\">{source.snippet}</p>\n                    </div>\n                  ))}\n                </div>\n              )}\n              \n              {message.usage && (\n                <div className=\"mt-2 pt-2 border-t border-gray-300 text-xs text-gray-600\" data-testid=\"usage-info\">\n                  <p>Tokens: {message.usage.totalTokens} (prompt: {message.usage.promptTokens}, completion: {message.usage.completionTokens})</p>\n                </div>\n              )}\n            </div>\n          </div>\n        ))}\n        \n        {isLoading && (\n          <div className=\"flex justify-start\" data-testid=\"loading-indicator\">\n            <div className=\"max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-200 text-gray-800\">\n              <div className=\"flex items-center space-x-2\">\n                <div className=\"animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600\"></div>\n                <span>{t('sending')}</span>\n              </div>\n            </div>\n          </div>\n        )}\n        \n        <div ref={messagesEndRef} />\n      </div>\n\n      {/* Input */}\n      <form onSubmit={handleSubmit} className=\"border-t p-4\" data-testid=\"chat-form\">\n        <div className=\"flex space-x-4\">\n          <input\n            ref={inputRef}\n            type=\"text\"\n            value={input}\n            onChange={(e) => setInput(e.target.value)}\n            placeholder={t('placeholder')}\n            disabled={isLoading}\n            className=\"flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100\"\n            data-testid=\"chat-input\"\n          />\n          <button\n            type=\"submit\"\n            disabled={isLoading || !input.trim()}\n            className=\"px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed\"\n            data-testid=\"send-button\"\n          >\n            {isLoading ? t('sending') : t('send')}\n          </button>\n        </div>\n      </form>\n    </div>\n  );\n}