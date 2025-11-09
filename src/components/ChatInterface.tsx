// components/ChatInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { registerUser, authenticateUser } from '@/services/authService'; // Import auth service

// Define chat types
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  backend: 'python' | 'gemini' | 'chatgpt';
  createdAt: Date;
  chatbotId?: string; // For Python backend
}

// Simple authentication context (in a real app, this would be more robust)
interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const defaultAuthContext: AuthContextType = {
  isAuthenticated: false,
  username: null,
  login: () => false,
  logout: () => {},
};

export default function ChatInterface() {
  const t = useTranslations('chat');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // New state for sign up view
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current chat
  const currentChat = chats.find(chat => chat.id === currentChatId) || null;

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  // Load chats from localStorage on component mount
  useEffect(() => {
    const savedChats = localStorage.getItem('chatHistory');
    const authData = localStorage.getItem('chatAuth');
    
    if (authData) {
      try {
        const parsedAuth = JSON.parse(authData);
        if (parsedAuth.isAuthenticated) {
          setIsAuthenticated(true);
          setUsername(parsedAuth.username || '');
        }
      } catch (e) {
        console.error('Failed to parse auth data', e);
      }
    }
    
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt)
        }));
        setChats(parsedChats);
        
        // Set the first chat as current if none is selected
        if (parsedChats.length > 0 && !currentChatId) {
          setCurrentChatId(parsedChats[0].id);
        }
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
  }, []);

  // Save chats to localStorage whenever chats change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(chats));
    }
  }, [chats]);

  // Save auth state to localStorage
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('chatAuth', JSON.stringify({ 
        isAuthenticated, 
        username 
      }));
    } else {
      localStorage.removeItem('chatAuth');
    }
  }, [isAuthenticated, username]);

  // Create a new chat
  const handleNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: t('newChat'),
      messages: [],
      backend: 'python',
      createdAt: new Date()
    };
    
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setInput('');
  };

  // Switch to an existing chat
  const handleSwitchChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setInput('');
  };

  // Delete a chat
  const handleDeleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    
    // If we're deleting the current chat, switch to another one
    if (currentChatId === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      if (remainingChats.length > 0) {
        setCurrentChatId(remainingChats[0].id);
      } else {
        setCurrentChatId(null);
        handleNewChat(); // Create a new chat if none remain
      }
    }
    
    setShowDeleteConfirm(null);
  };

  // Update current chat backend
  const handleSetBackend = (backend: 'python' | 'gemini' | 'chatgpt') => {
    if (!currentChatId) return;
    
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId ? { ...chat, backend } : chat
    ));
  };

  // Clear current chat messages
  const handleClearChat = () => {
    if (!currentChatId) return;
    
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId ? { ...chat, messages: [] } : chat
    ));
  };

  // Login function (simple implementation for demo)
  const handleLogin = async () => {
    // In a real application, you would validate credentials against a backend
    // For this demo, we'll accept any non-empty username and password
    if (username.trim() && password.trim()) {
      setIsAuthenticated(true);
      // Reset password field for security
      setPassword('');
      return true;
    }
    return false;
  };

  // Registration function
  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      alert('Username and password are required');
      return;
    }

    try {
      const result = await registerUser(username, password);
      if (result.success) {
        alert('User registered successfully! You can now log in.');
        setIsSignUp(false); // Switch back to login view
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed');
    }
  };

  // Toggle between login and sign up views
  const toggleAuthView = () => {
    setIsSignUp(!isSignUp);
    // Clear any previous error messages
    setPassword('');
  };

  // Logout function
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    // Clear chats on logout
    setChats([]);
    setCurrentChatId(null);
    // Clear localStorage
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('chatAuth');
  };

  // File upload function
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const file = files[0];
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      let uploadUrl = '';
      let isUsingPythonBackend = false;
      
      // Determine the upload endpoint based on the selected backend
      if (currentChat?.backend === 'python') {
        // Use our Python backend API
        uploadUrl = '/api/python/upload';
        isUsingPythonBackend = true;
      } else {
        // Use N8N for other backends
        let baseUrl = process.env.N8N_BASE_URL || 'https://sswebhookss.mateogiraldo.online';
        const fileUploadPath = process.env.N8N_FILE_UPLOAD_PATH || '/form/82848bc4-5ea2-4e5a-8bb6-3c09b94a8c5d';
        const geminiFileUploadPath = process.env.N8N_GEMINI_FILE_UPLOAD_PATH || '/form/89c24c04-11c0-49b8-940b-df8b3a361a53';
        
        if (currentChat?.backend === 'gemini') {
          uploadUrl = baseUrl + geminiFileUploadPath;
        } else {
          uploadUrl = baseUrl + fileUploadPath;
        }
      }
      
      // Show a message to the user
      setChats(prev => {
        const newMessage: Message = { 
          role: 'assistant', 
          content: `Subiendo archivo: ${file.name}...` 
        };
        
        if (currentChatId) {
          return prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, messages: [...chat.messages, newMessage] } 
              : chat
          );
        } else {
          // Create a new chat if none exists
          const newChat: Chat = {
            id: Date.now().toString(),
            title: `Archivo: ${file.name.substring(0, 30)}${file.name.length > 30 ? '...' : ''}`,
            messages: [newMessage],
            backend: currentChat?.backend || 'python',
            createdAt: new Date()
          };
          setCurrentChatId(newChat.id);
          return [newChat, ...prev];
        }
      });
      
      // Send file to the specified endpoint
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        let successMessage = `Archivo ${file.name} subido exitosamente.`;
        let chatbotId: string | undefined;
        
        if (isUsingPythonBackend) {
          const result = await response.json();
          chatbotId = result.chatbot_id;
          if (chatbotId) {
            successMessage += ` Chatbot ID: ${chatbotId}. Ahora puedes hacer preguntas sobre el documento.`;
          }
        }
        
        setChats(prev => {
          const successMsg: Message = { 
            role: 'assistant', 
            content: successMessage
          };
          
          if (currentChatId) {
            return prev.map(chat => 
              chat.id === currentChatId 
                ? { 
                    ...chat, 
                    messages: [...chat.messages, successMsg],
                    ...(chatbotId && { chatbotId })
                  } 
                : chat
            );
          }
          return prev;
        });
      } else {
        const errorText = await response.text();
        throw new Error(`Error en la subida: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setChats(prev => {
        const errorMessage: Message = { 
          role: 'assistant', 
          content: `Error al subir el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}` 
        };
        
        if (currentChatId) {
          return prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, messages: [...chat.messages, errorMessage] } 
              : chat
          );
        }
        return prev;
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Send message to backend
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !currentChatId) return;

    // Validate Python backend requirements
    if (currentChat?.backend === 'python' && !currentChat?.chatbotId) {
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, 
                { role: 'user', content: input },
                { role: 'assistant', content: 'Para usar Python RAG necesitas subir primero un documento PDF. Usa el botón "Subir archivo" en la parte superior.' }
              ]
            } 
          : chat
      ));
      setInput('');
      return;
    }

    // Add user message to current chat
    const userMessage: Message = { role: 'user', content: input };
    
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, userMessage],
            title: chat.messages.length === 0 ? input.substring(0, 30) + (input.length > 30 ? '...' : '') : chat.title
          } 
        : chat
    ));
    
    setInput('');
    setIsLoading(true);

    try {
      // Send message to appropriate backend based on selected option
      const requestBody: any = {
        chatInput: input,
        topK: 5,
        temperature: 0.7,
        backend: currentChat?.backend || 'python',
      };

      // Add chatbotId for Python backend
      if (currentChat?.backend === 'python' && currentChat?.chatbotId) {
        requestBody.chatbotId = currentChat.chatbotId;
      }

      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Check if response is ok and body exists
      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Handle response stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let fullResponse = '';
      let lastChunk = false;
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        console.log('Received chunk:', chunk); // Debug log
        
        // Check for done signal
        if (chunk.includes('data: {"type": "done"}')) {
          lastChunk = true;
        }
        
        // Process chunk data
        if (chunk.includes('data:')) {
          // Split by newlines to handle multiple events in one chunk
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const jsonString = line.substring(5).trim(); // Remove 'data:' prefix
                if (jsonString) {
                  const eventData = JSON.parse(jsonString);
                  
                  if (eventData.type === 'chunk') {
                    fullResponse += eventData.content;
                    
                    // Update UI with partial response
                    setChats(prev => prev.map(chat => {
                      if (chat.id === currentChatId) {
                        const lastMessage = chat.messages[chat.messages.length - 1];
                        let newMessages = [...chat.messages];
                        
                        if (lastMessage && lastMessage.role === 'assistant') {
                          // Update the last assistant message
                          newMessages[newMessages.length - 1] = { ...lastMessage, content: fullResponse };
                        } else {
                          // Add new assistant message
                          newMessages = [...newMessages, { role: 'assistant', content: fullResponse }];
                        }
                        
                        return { ...chat, messages: newMessages };
                      }
                      return chat;
                    }));
                  } else if (eventData.type === 'error') {
                    console.error('Server error:', eventData.error);
                    throw new Error(eventData.error);
                  }
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError, 'Raw data:', line);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, { role: 'assistant', content: t('error') }] } 
          : chat
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const getModelInfo = () => {
    const backend = currentChat?.backend || 'python';
    switch (backend) {
      case 'python':
        return { name: 'Python RAG', description: 'Sistema de búsqueda vectorial con documentos PDF' };
      case 'gemini':
        return { name: 'N8N + Gemini', description: 'Integración con flujos automatizados' };
      case 'chatgpt':
        return { name: 'N8N + ChatGPT', description: 'Integración con flujos automatizados' };
      default:
        return { name: 'Python RAG', description: 'Sistema de búsqueda vectorial con documentos PDF' };
    }
  };

  const modelInfo = getModelInfo();

  // Initialize with a new chat if no chats exist and user is authenticated
  useEffect(() => {
    if (isAuthenticated && chats.length === 0) {
      handleNewChat();
    }
  }, [isAuthenticated, chats.length]);

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-md">
          <div className="text-center">
            <div className="mx-auto bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <span className="text-white font-bold text-2xl">C</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800">{isSignUp ? 'Crear Cuenta' : t('title')}</h2>
            <p className="mt-2 text-gray-600">{isSignUp ? 'Regístrate para continuar' : 'Inicia sesión para continuar'}</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                {t('username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa tu nombre de usuario"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ingresa tu contraseña"
              />
            </div>
            
            <div className="flex space-x-4">
              {isSignUp ? (
                <>
                  <button
                    onClick={handleRegister}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md font-medium"
                  >
                    Registrarse
                  </button>
                  <button
                    onClick={toggleAuthView}
                    className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                  >
                    Iniciar Sesión
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleLogin}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md font-medium"
                  >
                    {t('login')}
                  </button>
                  <button
                    onClick={toggleAuthView}
                    className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all font-medium"
                  >
                    Registrarse
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500 mt-4">
            <p>{isSignUp 
              ? 'Ingresa tus datos para crear una cuenta' 
              : 'Para demostración: Ingresa cualquier nombre de usuario y contraseña'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm py-3 px-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-8 h-8 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <h1 className="ml-3 text-xl font-semibold text-gray-800">
            {currentChat ? currentChat.title : t('title')}
          </h1>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={handleClearChat}
            disabled={!currentChat || currentChat.messages.length === 0}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors flex items-center ${
              currentChat && currentChat.messages.length > 0
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            {t('clear')}
          </button>
          <button 
            onClick={handleNewChat}
            className="text-sm px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('newChat')}
          </button>
          <button 
            onClick={triggerFileInput}
            disabled={isUploading}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors flex items-center ${
              isUploading 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {isUploading ? t('uploading') : t('uploadFile')}
          </button>
          <button 
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Salir
          </button>
          {/* Hidden file input */}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden" 
            accept="*/*"
          />
        </div>
      </header>


      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Chat History and Backend Selection */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Chat History */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {t('chatHistory')}
              </h2>
              <button 
                onClick={handleNewChat}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm flex items-center justify-between ${
                    currentChatId === chat.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div 
                    onClick={() => handleSwitchChat(chat.id)}
                    className="flex items-center flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="mr-2">
                      {chat.messages.length > 0 && chat.messages[0].role === 'user' ? (
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                      )}
                    </div>
                    <div className="truncate">{chat.title}</div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(chat.id);
                    }}
                    className="text-gray-400 hover:text-red-500 ml-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Backend Selection */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Modelos
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => handleSetBackend('python')}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm flex items-center ${
                  currentChat?.backend === 'python' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className={`w-3 h-3 rounded-full mr-2 ${currentChat?.backend === 'python' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                Python
              </button>
              <button
                onClick={() => handleSetBackend('gemini')}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm flex items-center ${
                  currentChat?.backend === 'gemini' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className={`w-3 h-3 rounded-full mr-2 ${currentChat?.backend === 'gemini' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                N8N + Gemini
              </button>
              <button
                onClick={() => handleSetBackend('chatgpt')}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm flex items-center ${
                  currentChat?.backend === 'chatgpt' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className={`w-3 h-3 rounded-full mr-2 ${currentChat?.backend === 'chatgpt' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                N8N + ChatGPT
              </button>
            </div>
          </div>
          
          <div className="p-4 mt-4 flex-1">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-4 h-full">
              <h3 className="font-semibold text-gray-800 mb-1">Modelo activo</h3>
              <div className="flex items-center mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                <span className="font-medium text-gray-700">{modelInfo.name}</span>
              </div>
              <p className="text-xs text-gray-600">{modelInfo.description}</p>
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
            Chat Inteligente v1.0
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            {currentChat && currentChat.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-2xl">C</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Chat Inteligente</h2>
                <p className="text-gray-600 max-w-md mb-8">
                  {currentChat?.backend === 'python' 
                    ? 'Para usar Python RAG, primero sube un documento PDF usando el botón "Subir archivo".' 
                    : 'Empieza una conversación seleccionando un modelo y escribiendo tu primer mensaje.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
                  <div 
                    onClick={() => handleSetBackend('python')}
                    className="bg-white border border-gray-200 rounded-xl p-4 text-left cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
                      <h3 className="font-semibold text-gray-800">Python RAG</h3>
                    </div>
                    <p className="text-xs text-gray-600">Sistema de búsqueda vectorial con documentos PDF</p>
                  </div>
                  <div 
                    onClick={() => handleSetBackend('gemini')}
                    className="bg-white border border-gray-200 rounded-xl p-4 text-left cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                      <h3 className="font-semibold text-gray-800">N8N + Gemini</h3>
                    </div>
                    <p className="text-xs text-gray-600">Integración con flujos automatizados de Google</p>
                  </div>
                  <div 
                    onClick={() => handleSetBackend('chatgpt')}
                    className="bg-white border border-gray-200 rounded-xl p-4 text-left cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center mb-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <h3 className="font-semibold text-gray-800">N8N + ChatGPT</h3>
                    </div>
                    <p className="text-xs text-gray-600">Integración con flujos automatizados de OpenAI</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {currentChat?.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-3 mt-1.5">
                        <span className="text-white text-sm font-bold">C</span>
                      </div>
                    )}
                    <div
                      className={`max-w-3xl px-5 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {message.content}
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center ml-3 mt-1.5">
                        <span className="text-white text-sm">Tú</span>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-3 mt-1.5">
                      <span className="text-white text-sm font-bold">C</span>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-5 py-3 shadow-sm">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-4 absolute bottom-0 w-full md:w-[calc(100%-16rem)]">
            <div className="max-w-3xl mx-auto">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t('placeholder')}
                  className="flex-1 px-5 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="px-5 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center text-xs text-gray-500">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    currentChat?.backend === 'python' 
                      ? 'bg-gray-400' 
                      : currentChat?.backend === 'gemini' 
                        ? 'bg-blue-500' 
                        : 'bg-green-500'
                  }`}></div>
                  <span>
                    {currentChat?.backend === 'python' 
                      ? 'Modelo Python RAG' 
                      : currentChat?.backend === 'gemini' 
                        ? 'Modelo N8N + Gemini' 
                        : 'Modelo N8N + ChatGPT'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Presiona Enter para enviar
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Eliminar chat</h3>
            <p className="text-gray-600 mb-6">¿Estás seguro de que quieres eliminar este chat? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteChat(showDeleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}