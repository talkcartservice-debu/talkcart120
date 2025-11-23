import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON, PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { getAuthHeaders } from './auth';
import { biometricPlatformService, getPlatformErrorMessage } from './biometric-platform';

export interface BiometricRegistrationResult {
  success: boolean;
  error?: string;
  requiresExistingCredentials?: boolean;
}

export interface BiometricAuthenticationResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: any;
  error?: string;
}

/**
 * Check if biometric authentication is available in this browser/device
 */
export const isBiometricAvailable = (): boolean => {
  return !!(
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
    typeof window.PublicKeyCredential.isConditionalMediationAvailable === 'function'
  );
};

/**
 * Check if biometric authentication is supported and available
 */
export const checkBiometricSupport = async (): Promise<{
  isSupported: boolean;
  isPlatformAuthenticatorAvailable: boolean;
  isConditionalMediationAvailable: boolean;
}> => {
  const isSupported = isBiometricAvailable();

  if (!isSupported) {
    return {
      isSupported: false,
      isPlatformAuthenticatorAvailable: false,
      isConditionalMediationAvailable: false,
    };
  }

  try {
    const [isPlatformAuthenticatorAvailable, isConditionalMediationAvailable] = await Promise.all([
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
      PublicKeyCredential.isConditionalMediationAvailable ?
        PublicKeyCredential.isConditionalMediationAvailable() :
        Promise.resolve(false)
    ]);

    return {
      isSupported: true,
      isPlatformAuthenticatorAvailable,
      isConditionalMediationAvailable,
    };
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return {
      isSupported: false,
      isPlatformAuthenticatorAvailable: false,
      isConditionalMediationAvailable: false,
    };
  }
};

/**
 * Generate biometric registration options from the backend
 */
export const generateRegistrationOptions = async (): Promise<{
  success: boolean;
  options?: PublicKeyCredentialCreationOptionsJSON;
  challengeId?: string;
  error?: string;
}> => {
  try {
    const response = await fetch('/api/auth/biometric/generate-registration-options', {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to generate registration options',
      };
    }

    const { challengeId, success, options } = data;

    return {
      success: true,
      options,
      challengeId,
    };
  } catch (error) {
    console.error('Error generating registration options:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

/**
 * Register biometric credentials for the current user with retry mechanism
 */
export const registerBiometric = async (): Promise<BiometricRegistrationResult> => {
  // Initialize platform service
  if (!biometricPlatformService.isInitialized) {
    await biometricPlatformService.initialize();
  }

  const retryStrategy = biometricPlatformService.getRetryStrategy();
  let lastError: any = null;

  for (let attempt = 0; attempt <= retryStrategy.maxRetries; attempt++) {
    try {
      // Check if biometric authentication is supported
      const support = await checkBiometricSupport();
      if (!support.isSupported || !support.isPlatformAuthenticatorAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      // Perform platform-specific pre-checks
      const preCheckResult = await biometricPlatformService.performPreChecks();
      if (!preCheckResult.success) {
        return {
          success: false,
          error: preCheckResult.errors.join(' '),
        };
      }

      // Generate registration options from backend
      const optionsResult = await generateRegistrationOptions();
      if (!optionsResult.success) {
        return {
          success: false,
          error: optionsResult.error || 'Failed to start registration',
        };
      }

      // Handle both formats: options nested in 'options' property or directly in response
      const rawOptions = optionsResult.options || optionsResult;

      // Optimize options for platform
      const optimizedOptions = biometricPlatformService.getOptimizedRegistrationOptions(rawOptions);

      // Start the WebAuthn registration process with timeout handling
      const registrationResponse = await Promise.race([
        startRegistration(optimizedOptions),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Registration timed out')), optimizedOptions.timeout || 300000)
        )
      ]) as any;

      // Send the registration response to the backend
      const response = await fetch('/api/auth/biometric/register', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          registrationResponse,
          challengeId: optionsResult.challengeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Registration failed',
          requiresExistingCredentials: data.message?.includes('already registered'),
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      lastError = error;
      console.error(`Biometric registration attempt ${attempt + 1} failed:`, error);

      // Handle specific WebAuthn errors that shouldn't be retried
      if (error.name === 'InvalidStateError') {
        return {
          success: false,
          error: 'Biometric credentials already registered on this device',
          requiresExistingCredentials: true,
        };
      }

      // If this is the last attempt, return the error
      if (attempt === retryStrategy.maxRetries) {
        break;
      }

      // Wait before retrying
      const delay = retryStrategy.exponentialBackoff
        ? retryStrategy.baseDelay * Math.pow(2, attempt)
        : retryStrategy.baseDelay;

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Return platform-specific error message
  const platformError = getPlatformErrorMessage(lastError);
  return {
    success: false,
    error: platformError,
  };
};

/**
 * Generate authentication options from the backend
 */
export const generateAuthenticationOptions = async (userEmail?: string): Promise<{
  success: boolean;
  options?: PublicKeyCredentialRequestOptionsJSON;
  challengeId?: string;
  error?: string;
}> => {
  try {
    const response = await fetch('/api/auth/biometric/generate-authentication-options', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail: userEmail || undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to generate authentication options',
      };
    }

    const { challengeId, success, options } = data;

    return {
      success: true,
      options,
      challengeId,
    };
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

/**
 * Authenticate user with biometric credentials with retry mechanism
 */
export const authenticateBiometric = async (userEmail?: string): Promise<BiometricAuthenticationResult> => {
  // Initialize platform service
  if (!biometricPlatformService.isInitialized) {
    await biometricPlatformService.initialize();
  }

  const retryStrategy = biometricPlatformService.getRetryStrategy();
  let lastError: any = null;

  for (let attempt = 0; attempt <= retryStrategy.maxRetries; attempt++) {
    try {
      // Check if biometric authentication is supported
      const support = await checkBiometricSupport();
      if (!support.isSupported) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      // Perform platform-specific pre-checks
      const preCheckResult = await biometricPlatformService.performPreChecks();
      if (!preCheckResult.success) {
        return {
          success: false,
          error: preCheckResult.errors.join(' '),
        };
      }

      // Generate authentication options from backend
      const optionsResult = await generateAuthenticationOptions(userEmail);
      if (!optionsResult.success) {
        return {
          success: false,
          error: optionsResult.error || 'Failed to start authentication',
        };
      }

      // Handle both formats: options nested in 'options' property or directly in response
      const rawOptions = optionsResult.options || optionsResult;

      // Optimize options for platform
      const optimizedOptions = biometricPlatformService.getOptimizedAuthenticationOptions(rawOptions);

      // Start the WebAuthn authentication process with timeout handling
      const authenticationResponse = await Promise.race([
        startAuthentication(optimizedOptions),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Authentication timed out')), optimizedOptions.timeout || 300000)
        )
      ]) as any;

      // Send the authentication response to the backend
      const response = await fetch('/api/auth/biometric/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authenticationResponse,
          challengeId: optionsResult.challengeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Authentication failed. Please try again later.',
        };
      }

      return {
        success: true,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      };
    } catch (error: any) {
      lastError = error;
      console.error(`Biometric authentication attempt ${attempt + 1} failed:`, error);

      // Handle specific WebAuthn errors that shouldn't be retried
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Authentication was cancelled by the user',
        };
      }

      // If this is the last attempt, return the error
      if (attempt === retryStrategy.maxRetries) {
        break;
      }

      // Wait before retrying (shorter delay for authentication)
      const delay = Math.min(
        retryStrategy.exponentialBackoff
          ? retryStrategy.baseDelay * Math.pow(2, attempt)
          : retryStrategy.baseDelay,
        5000 // Max 5 seconds for authentication retries
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Return platform-specific error message
  const platformError = getPlatformErrorMessage(lastError);
  return {
    success: false,
    error: platformError,
  };
};

/**
 * Remove biometric credentials for the current user
 */
export const removeBiometric = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const response = await fetch('/api/auth/biometric/remove', {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to remove biometric credentials',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error removing biometric credentials:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

/**
 * Check if the current user has biometric credentials registered
 */
export const hasBiometricCredentials = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/auth/biometric/status', {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return !!(data.success && data.biometric?.registered);
  } catch (error) {
    console.error('Error checking biometric credentials:', error);
    return false;
  }
};

/**
 * Get detailed biometric status for the current user
 */
export const getBiometricStatus = async (): Promise<{
  success: boolean;
  registered: boolean;
  deviceType?: string;
  registeredAt?: string;
  lastUsedAt?: string;
  backedUp?: boolean;
  error?: string;
}> => {
  try {
    const response = await fetch('/api/auth/biometric/status', {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      return {
        success: false,
        registered: false,
        error: 'Failed to check biometric status',
      };
    }

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        registered: false,
        error: data.message || 'Failed to check biometric status',
      };
    }

    return {
      success: true,
      registered: data.biometric.registered,
      deviceType: data.biometric.deviceType,
      registeredAt: data.biometric.registeredAt,
      lastUsedAt: data.biometric.lastUsedAt,
      backedUp: data.biometric.backedUp,
    };
  } catch (error) {
    console.error('Error checking biometric status:', error);
    return {
      success: false,
      registered: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

/**
 * Check biometric capabilities for use by other modules
 */
export const checkCapabilities = async () => {
  const support = await checkBiometricSupport();
  const deviceInfo = biometricPlatformService.getDeviceInfo();

  return {
    isSupported: support.isSupported,
    isPlatformAuthenticatorAvailable: support.isPlatformAuthenticatorAvailable,
    isConditionalMediationAvailable: support.isConditionalMediationAvailable,
    deviceInfo
  };
};