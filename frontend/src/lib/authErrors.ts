/**
 * Utility for normalizing authentication error messages across the app.
 * Ensures consistent, user-friendly messaging for auth failures.
 */

export const normalizeAuthError = (error: unknown): string => {
    const msg =
        typeof error === 'string'
            ? error
            : (error as any)?.message || String(error || '');

    const lowerMsg = msg.toLowerCase();

    // Check for specific auth-related keywords
    if (
        lowerMsg.includes('auth') ||
        lowerMsg.includes('authentication') ||
        lowerMsg.includes('token') ||
        lowerMsg.includes('login') ||
        lowerMsg.includes('session') ||
        lowerMsg.includes('expired') ||
        lowerMsg.includes('invalid') ||
        lowerMsg.includes('unauthorized') ||
        lowerMsg.includes('forbidden')
    ) {
        return 'Authentication failed. Please try again later.';
    }

    // Default fallback
    return msg || 'An error occurred. Please try again.';
};

/**
 * Helper to check if an error is auth-related
 */
export const isAuthError = (error: unknown): boolean => {
    const msg =
        typeof error === 'string'
            ? error
            : (error as any)?.message || String(error || '');

    const lowerMsg = msg.toLowerCase();

    return (
        lowerMsg.includes('auth') ||
        lowerMsg.includes('authentication') ||
        lowerMsg.includes('token') ||
        lowerMsg.includes('login') ||
        lowerMsg.includes('session') ||
        lowerMsg.includes('expired') ||
        lowerMsg.includes('invalid') ||
        lowerMsg.includes('unauthorized') ||
        lowerMsg.includes('forbidden')
    );
};