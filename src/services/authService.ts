// src/services/authService.ts

// User interface
interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

// In-memory storage for users (in a real app, this would be a database)
const users: Map<string, User> = new Map();

// Session interface
interface Session {
  id: string;
  userId: string;
  createdAt: Date;
}

// In-memory storage for sessions
const sessions: Map<string, Session> = new Map();

/**
 * Hash a password
 */
async function hashPassword(password: string): Promise<string> {
  // Simple hashing for demo purposes (in a real app, use bcrypt)
  return `hashed_${password}`;
}

/**
 * Verify a password against a hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Simple verification for demo purposes (in a real app, use bcrypt)
  return hash === `hashed_${password}`;
}

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Register a new user
 */
export async function registerUser(username: string, password: string): Promise<{ success: boolean; message: string; userId?: string }> {
  // Check if user already exists
  for (const user of Array.from(users.values())) {
    if (user.username === username) {
      return { success: false, message: 'Username already exists' };
    }
  }

  // Hash the password
  const passwordHash = await hashPassword(password);
  
  // Create user
  const userId = Date.now().toString();
  const user: User = {
    id: userId,
    username,
    passwordHash,
    createdAt: new Date()
  };
  
  // Save user
  users.set(username, user);
  
  return { success: true, message: 'User registered successfully', userId };
}

/**
 * Authenticate a user
 */
export async function authenticateUser(username: string, password: string): Promise<{ success: boolean; message: string; sessionId?: string }> {
  const user = users.get(username);
  
  if (!user) {
    return { success: false, message: 'Invalid credentials' };
  }
  
  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    return { success: false, message: 'Invalid credentials' };
  }
  
  // Create session
  const sessionId = generateSessionId();
  const session: Session = {
    id: sessionId,
    userId: user.id,
    createdAt: new Date()
  };
  
  sessions.set(sessionId, session);
  
  return { success: true, message: 'Authentication successful', sessionId };
}

/**
 * Validate a session
 */
export function validateSession(sessionId: string): { valid: boolean; userId?: string; username?: string } {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return { valid: false };
  }
  
  // Find user for this session
  for (const user of Array.from(users.values())) {
    if (user.id === session.userId) {
      return { valid: true, userId: user.id, username: user.username };
    }
  }
  
  return { valid: false };
}

/**
 * Logout user
 */
export function logoutUser(sessionId: string): { success: boolean; message: string } {
  const deleted = sessions.delete(sessionId);
  
  if (deleted) {
    return { success: true, message: 'Logged out successfully' };
  } else {
    return { success: false, message: 'Session not found' };
  }
}

/**
 * Get all users (for debugging purposes)
 */
export function getAllUsers(): User[] {
  return Array.from(users.values());
}