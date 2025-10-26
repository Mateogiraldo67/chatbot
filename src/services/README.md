# Authentication Service

This service provides user registration and authentication functionality for the chat application.

## Features

- User registration with duplicate checking
- Secure password handling (hashing and verification)
- Session management
- In-memory storage (for demonstration purposes)

## Functions

### `registerUser(username: string, password: string)`
Registers a new user with the provided username and password.

Returns:
```typescript
{
  success: boolean;
  message: string;
  userId?: string;
}
```

### `authenticateUser(username: string, password: string)`
Authenticates a user with the provided credentials.

Returns:
```typescript
{
  success: boolean;
  message: string;
  sessionId?: string;
}
```

### `validateSession(sessionId: string)`
Validates an existing session.

Returns:
```typescript
{
  valid: boolean;
  userId?: string;
  username?: string;
}
```

### `logoutUser(sessionId: string)`
Logs out a user by invalidating their session.

Returns:
```typescript
{
  success: boolean;
  message: string;
}
```

## Note

This implementation uses in-memory storage for demonstration purposes. In a production environment, you would replace this with a proper database solution.