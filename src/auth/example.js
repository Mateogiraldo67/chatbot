/**
 * Example usage of the Local Authentication System
 */

// Import the authentication module
const auth = require('./localAuth');

// Initialize the authentication system
console.log('Initializing authentication system...');
auth.initializeAuthSystem();

// Example: Register a new user
async function exampleRegistration() {
  console.log('\n--- User Registration ---');
  
  // Register a new user
  const result = await auth.registerUser('john_doe', 'securePassword123');
  
  if (result.success) {
    console.log('Registration successful!');
    console.log('User ID:', result.user.id);
    console.log('Username:', result.user.username);
    console.log('Session ID:', result.session.id);
    return result.session.id;
  } else {
    console.log('Registration failed:', result.error);
    return null;
  }
}

// Example: Login an existing user
async function exampleLogin() {
  console.log('\n--- User Login ---');
  
  // Login with correct credentials
  const result = await auth.loginUser('john_doe', 'securePassword123');
  
  if (result.success) {
    console.log('Login successful!');
    console.log('User ID:', result.user.id);
    console.log('Username:', result.user.username);
    console.log('Session ID:', result.session.id);
    return result.session.id;
  } else {
    console.log('Login failed:', result.error);
    return null;
  }
}

// Example: Validate a session
function exampleSessionValidation(sessionId) {
  console.log('\n--- Session Validation ---');
  
  if (!sessionId) {
    console.log('No session ID provided');
    return;
  }
  
  const result = auth.validateSession(sessionId);
  
  if (result.valid) {
    console.log('Session is valid!');
    console.log('User ID:', result.user.id);
    console.log('Username:', result.user.username);
  } else {
    console.log('Session validation failed:', result.error);
  }
}

// Example: Logout a user
function exampleLogout(sessionId) {
  console.log('\n--- User Logout ---');
  
  if (!sessionId) {
    console.log('No session ID provided');
    return;
  }
  
  const result = auth.logoutUser(sessionId);
  
  if (result.success) {
    console.log('Logout successful!');
  } else {
    console.log('Logout failed:', result.error);
  }
}

// Run the examples
async function runExamples() {
  // Initialize the system
  auth.initializeAuthSystem();
  
  // Register a user
  const sessionId1 = await exampleRegistration();
  
  // Login the user
  const sessionId2 = await exampleLogin();
  
  // Validate sessions
  exampleSessionValidation(sessionId1);
  exampleSessionValidation(sessionId2);
  
  // Logout
  exampleLogout(sessionId2);
  
  // Try to validate after logout
  exampleSessionValidation(sessionId2);
}

// Run the examples
runExamples().catch(console.error);