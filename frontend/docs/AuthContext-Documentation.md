# AuthContext Documentation

## Overview
AuthContext is a React context that provides authentication state and functionality throughout the TalkCart application. It manages user authentication, login/logout flows, and user profile data.

## Architecture

### Core Components
1. **AuthContext** - The React context object that holds authentication state
2. **AuthProvider** - Context provider component that wraps the application
3. **useAuth** - Custom hook for consuming authentication context
4. **AuthContextType** - TypeScript interface defining the context shape

### Key Features
- **Token Management** - Handles JWT tokens and refresh tokens
- **User State** - Manages current user profile data
- **Authentication Flow** - Handles login, logout, and registration
- **Session Persistence** - Persists authentication state across page reloads
- **Error Handling** - Graceful handling of authentication errors
- **Security** - Secure token storage and management

## API

### AuthProvider

#### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | Child components that need access to auth context |

#### Usage
```tsx
import { AuthProvider } from '@/contexts/AuthContext';

const App = () => (
  <AuthProvider>
    <YourApp />
  </AuthProvider>
);
```

### useAuth Hook

#### Return Value
The hook returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `isAuthenticated` | `boolean` | Whether user is currently authenticated |
| `user` | `User \| null` | Current user profile data or null |
| `loading` | `boolean` | Whether authentication state is being loaded |
| `isLoading` | `boolean` | Alias for loading state |
| `login` | `Function` | Function to login with credentials |
| `logout` | `Function` | Function to logout current user |
| `register` | `Function` | Function to register new user |
| `updateProfile` | `Function` | Function to update user profile |
| `updateUser` | `Function` | Function to update user data locally |
| `setAuthTokens` | `Function` | Function to manually set authentication tokens |

#### User Interface
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  isVerified: boolean;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  // ... other user properties
}
```

## Usage

### Basic Implementation
```tsx
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Wrap your app with AuthProvider
const App = () => (
  <AuthProvider>
    <MyComponent />
  </AuthProvider>
);

// Use the hook in your components
const MyComponent = () => {
  const { 
    isAuthenticated, 
    user, 
    login, 
    logout, 
    register,
    loading 
  } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <button onClick={() => login({ email: 'user@example.com', password: 'password' })}>
          Login
        </button>
        <button onClick={() => register({ username: 'newuser', email: 'user@example.com', password: 'password' })}>
          Register
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome, {user?.displayName || user?.username}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

### Login Function
```typescript
const handleLogin = async () => {
  const success = await login({
    email: 'user@example.com',
    password: 'password',
    rememberMe: true
  });
  
  if (success) {
    console.log('Login successful');
  } else {
    console.log('Login failed');
  }
};
```

### Registration Function
```typescript
const handleRegister = async () => {
  try {
    const success = await register({
      username: 'newuser',
      email: 'user@example.com',
      password: 'password'
    });
    
    if (success) {
      console.log('Registration successful');
    }
  } catch (error) {
    console.error('Registration failed:', error.message);
  }
};
```

### Profile Update
```typescript
const handleProfileUpdate = async () => {
  const success = await updateProfile({
    displayName: 'New Name',
    bio: 'Updated bio'
  });
  
  if (success) {
    console.log('Profile updated');
  }
};
```

## Authentication Flow

### 1. Initial Load
- Check for existing tokens in localStorage
- Validate tokens with backend
- Fetch user profile data
- Set authentication state

### 2. Login Process
- Send credentials to backend
- Receive tokens and user data
- Store tokens in localStorage
- Update context state
- Redirect to appropriate page

### 3. Logout Process
- Call backend logout endpoint
- Clear tokens from localStorage
- Reset context state
- Redirect to login page

### 4. Session Management
- Handle token expiration
- Automatic token refresh
- Session cleanup on 401 errors
- Graceful handling of expired sessions

## Security Features

### Token Storage
- Tokens stored in localStorage
- Secure handling of refresh tokens
- Automatic cleanup on logout

### Error Handling
- Normalized error messages to prevent user enumeration
- Secure error logging
- Graceful degradation on network errors

### Session Protection
- Automatic logout on token expiration
- Event-based session cleanup
- Unhandled rejection handling for session errors

## Performance Features

### State Management
- Efficient state updates
- Memoized context values
- Proper cleanup of event listeners

### Caching
- User profile caching
- Token persistence
- Session state preservation

## Testing

### Unit Tests
- Test authentication state changes
- Test login/logout flows
- Test error handling scenarios
- Test token management

### Integration Tests
- Test with real API endpoints
- Test session persistence
- Test concurrent authentication requests

## Best Practices

### 1. Always Check Authentication State
```tsx
const Component = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  
  return <ProtectedContent />;
};
```

### 2. Handle Loading States
```tsx
const { loading } = useAuth();
if (loading) {
  return <LoadingSpinner />;
}
```

### 3. Error Handling
```tsx
try {
  await login(credentials);
} catch (error) {
  // Handle login errors appropriately
  showErrorNotification('Login failed');
}
```

## Troubleshooting

### Common Issues

#### User State Not Updating
1. Check if updateUser or updateProfile is being called
2. Verify localStorage permissions
3. Check for race conditions in state updates

#### Authentication Not Persisting
1. Verify tokens are being stored in localStorage
2. Check token validation with backend
3. Ensure proper cleanup on logout

#### Login Failures
1. Check network connectivity
2. Verify credentials format
3. Check backend authentication service

## Future Enhancements

### Planned Features
- **OAuth Integration**: Google, Facebook, Twitter login
- **Biometric Authentication**: Fingerprint and face recognition
- **Two-Factor Authentication**: 2FA support
- **Session Management**: Active session tracking
- **Role-Based Access**: Enhanced permission system