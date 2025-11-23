// Auth utility functions

// Access token helpers
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
};

export const removeAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
};

// Refresh token helpers
export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
};

export const setRefreshToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('refreshToken', token);
};

export const removeRefreshToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('refreshToken');
};

// Logout function to clear auth tokens
export const logout = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  // Dispatch logout event for components to react
  window.dispatchEvent(new CustomEvent('auth:logout'));
};

// Set both tokens at once (used by biometric login, etc.)
export const setAuthTokens = (accessToken: string, refreshToken?: string): void => {
  setAuthToken(accessToken);
  if (refreshToken) setRefreshToken(refreshToken);
};

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

// Build standard auth headers for API calls
export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};