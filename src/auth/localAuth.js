/**
 * Local Authentication System with Secure Password Handling
 * 
 * This module provides a complete authentication system that:
 * - Uses secure password hashing (bcrypt)
 * - Stores user data locally
 * - Implements registration and login flows
 * - Manages user sessions
 */

// Import required modules
const bcrypt = require('bcrypt');

// Simple in-memory database (would be replaced with actual local storage in production)
class LocalDatabase {
  constructor() {
    this.users = new Map(); // Store users by username/email
    this.sessions = new Map(); // Store active sessions
  }

  // Save a user to the database
  saveUser(user) {
    this.users.set(user.username, user);
    return user;
  }

  // Find a user by username
  findUser(username) {
    return this.users.get(username);
  }

  // Check if a user exists
  userExists(username) {
    return this.users.has(username);
  }

  // Create a new session
  createSession(userId) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      userId: userId,
      createdAt: new Date()
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  // Find a session by ID
  findSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  // Delete a session (logout)
  deleteSession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  // Generate a random session ID
  generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// Initialize the local database
const db = new LocalDatabase();

/**
 * Initialize the local authentication system
 * 
 * This function sets up the local database and any required configurations.
 * In a real implementation, this might involve:
 * - Creating database tables
 * - Setting up file storage
 * - Initializing encryption keys
 */
function initializeAuthSystem() {
  console.log('Initializing local authentication system...');
  // In a real implementation, this would set up the actual storage mechanism
  // For this example, we're using an in-memory database
  return true;
}

/**
 * Register a new user
 * 
 * @param {string} username - The user's chosen username or email
 * @param {string} password - The user's password (will be hashed)
 * @returns {Object} Result object with success status and user/session data or error message
 */
async function registerUser(username, password) {
  try {
    // Validate inputs
    if (!username || !password) {
      return {
        success: false,
        error: 'Username and password are required'
      };
    }

    // Check if user already exists
    if (db.userExists(username)) {
      return {
        success: false,
        error: 'User already exists'
      };
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user object
    const user = {
      id: Date.now().toString(), // Simple ID generation
      username: username,
      passwordHash: hashedPassword,
      createdAt: new Date()
    };

    // Save user to database
    db.saveUser(user);

    // Create session for the new user
    const session = db.createSession(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username
      },
      session: {
        id: session.id
      }
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'Registration failed'
    };
  }
}

/**
 * Authenticate a user
 * 
 * @param {string} username - The user's username or email
 * @param {string} password - The user's password (plain text)
 * @returns {Object} Result object with success status and session data or error message
 */
async function loginUser(username, password) {
  try {
    // Validate inputs
    if (!username || !password) {
      return {
        success: false,
        error: 'Username and password are required'
      };
    }

    // Find user in database
    const user = db.findUser(username);
    
    if (!user) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordMatch) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }

    // Create session
    const session = db.createSession(user.id);

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username
      },
      session: {
        id: session.id
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Logout a user
 * 
 * @param {string} sessionId - The session ID to invalidate
 * @returns {Object} Result object with success status
 */
function logoutUser(sessionId) {
  try {
    const deleted = db.deleteSession(sessionId);
    
    if (deleted) {
      return {
        success: true,
        message: 'Successfully logged out'
      };
    } else {
      return {
        success: false,
        error: 'Session not found'
      };
    }
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: 'Logout failed'
    };
  }
}

/**
 * Check if a session is valid
 * 
 * @param {string} sessionId - The session ID to validate
 * @returns {Object} Result object with session validity and user data if valid
 */
function validateSession(sessionId) {
  try {
    const session = db.findSession(sessionId);
    
    if (!session) {
      return {
        valid: false,
        error: 'Invalid session'
      };
    }

    // Check if session has expired (optional)
    // For this example, sessions don't expire
    
    // Find user associated with session
    // In a real implementation, we would have a more direct link
    // For this example, we'll iterate through users
    let user = null;
    for (const [username, userData] of db.users) {
      if (userData.id === session.userId) {
        user = userData;
        break;
      }
    }
    
    if (!user) {
      return {
        valid: false,
        error: 'User not found'
      };
    }

    return {
      valid: true,
      user: {
        id: user.id,
        username: user.username
      }
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return {
      valid: false,
      error: 'Session validation failed'
    };
  }
}

// Export functions
module.exports = {
  initializeAuthSystem,
  registerUser,
  loginUser,
  logoutUser,
  validateSession
};