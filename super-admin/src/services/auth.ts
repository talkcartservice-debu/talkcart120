import { config } from '../config';

export type JwtUser = { userId: string; role?: string };

const TOKEN_KEY = 'token';
const TOKEN_EVENT = 'token-changed';
const NOTIFY_EVENT = 'app-notify';

type TokenChangedDetail = { token: string | null };
export type NotifyDetail = { message: string; severity?: 'success' | 'info' | 'warning' | 'error' };

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  // Notify listeners
  window.dispatchEvent(new CustomEvent<TokenChangedDetail>(TOKEN_EVENT, { detail: { token } } as any));
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  // Notify listeners
  window.dispatchEvent(new CustomEvent<TokenChangedDetail>(TOKEN_EVENT, { detail: { token: null } } as any));
}

export function onTokenChanged(handler: (token: string | null) => void) {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => {
    const ce = e as CustomEvent<TokenChangedDetail>;
    handler(ce.detail?.token ?? null);
  };
  window.addEventListener(TOKEN_EVENT, listener as EventListener);
  // return unsubscribe
  return () => window.removeEventListener(TOKEN_EVENT, listener as EventListener);
}

export function notify(detail: NotifyDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<NotifyDetail>(NOTIFY_EVENT, { detail } as any));
}

export function onNotify(handler: (detail: NotifyDetail) => void) {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => {
    const ce = e as CustomEvent<NotifyDetail>;
    handler(ce.detail);
  };
  window.addEventListener(NOTIFY_EVENT, listener as EventListener);
  return () => window.removeEventListener(NOTIFY_EVENT, listener as EventListener);
}

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  
  try {
    // Use the configured timeout from the application config
    const REQUEST_TIMEOUT = config.api.timeout;
    
    // Only apply timeout if it's greater than 0
    if (REQUEST_TIMEOUT > 0) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(input, { 
        ...init, 
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Do not consume body; just surface a generic error based on status
        if (response.status === 401) {
          notify({ message: 'Unauthorized. Please sign in again.', severity: 'warning' });
        } else if (response.status === 403) {
          notify({ message: 'Forbidden. You do not have permission to perform this action.', severity: 'warning' });
        } else if (response.status >= 500) {
          notify({ message: 'Server error. Please try again later.', severity: 'error' });
        } else {
          notify({ message: `Request failed (${response.status}).`, severity: 'error' });
        }
      }
      return response;
    } else {
      // No timeout - direct fetch
      const response = await fetch(input, { 
        ...init, 
        headers
      });
      
      if (!response.ok) {
        // Do not consume body; just surface a generic error based on status
        if (response.status === 401) {
          notify({ message: 'Unauthorized. Please sign in again.', severity: 'warning' });
        } else if (response.status === 403) {
          notify({ message: 'Forbidden. You do not have permission to perform this action.', severity: 'warning' });
        } else if (response.status >= 500) {
          notify({ message: 'Server error. Please try again later.', severity: 'error' });
        } else {
          notify({ message: `Request failed (${response.status}).`, severity: 'error' });
        }
      }
      return response;
    }
  } catch (err: any) {
    // Provide clearer toasts for CORS/preflight and timeout scenarios
    try {
      const reqUrl = typeof input === 'string' ? input : (input as any)?.url ?? String(input);
      const baseHref = typeof window !== 'undefined' ? window.location.href : 'http://localhost';
      const absoluteUrl = new URL(reqUrl, baseHref);
      const isCrossOrigin = typeof window !== 'undefined' && absoluteUrl.origin !== window.location.origin;
      const method = (init.method || 'GET').toString().toUpperCase();
      const hdrs = new Headers(init.headers || {});
      const hasAuth = hdrs.has('Authorization');
      const isAbort = err && (err.name === 'AbortError');

      // Enhanced error handling with more specific messages
      if (isAbort) {
        // Check if it's a timeout error
        const isTimeout = err.message && err.message.includes('timeout');
        if (isTimeout) {
          notify({ message: 'Request timed out. Please try again.', severity: 'warning' });
        } else {
          notify({ message: 'Request was cancelled. Please try again.', severity: 'warning' });
        }
      } else if (isCrossOrigin && err instanceof TypeError) {
        // Browsers surface CORS/preflight failures as a TypeError("Failed to fetch")
        const headerNote = hasAuth ? 'Authorization and Content-Type' : 'required headers';
        notify({
          message: `Request blocked by CORS/preflight. Verify backend allows ${method} and ${headerNote} for ${absoluteUrl.origin}.`,
          severity: 'error',
        });
      } else if (err && err.message && err.message.includes('Failed to fetch')) {
        // Network connectivity issue
        notify({ 
          message: `Failed to connect to the server. Please ensure the backend is running at ${absoluteUrl.origin}`, 
          severity: 'error' 
        });
      } else {
        notify({ message: 'Network error. Please check your connection.', severity: 'error' });
      }
    } catch {
      notify({ message: 'Network error. Please check your connection.', severity: 'error' });
    }
    throw err;
  }
}