/**
 * Cross-Platform Biometric Compatibility Layer
 * Handles platform-specific biometric authentication quirks and fallbacks
 */

// Device detection utility
interface DeviceInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
  isMobile: boolean;
  browser: string;
  userAgent: string;
}

// Platform-specific configuration
export interface PlatformConfig {
  requiresUserActivation: boolean;
  supportsResidentKeys: boolean;
  preferredTransports: string[];
  timeoutRecommendation: number;
  userVerificationDefault: 'required' | 'preferred' | 'discouraged';
  attestationPreference: 'none' | 'indirect' | 'direct';
  fingerprintOptimized?: boolean;
  faceIdOptimized?: boolean;
  windowsHelloOptimized?: boolean;
  touchIdOptimized?: boolean;
}

// Browser-specific quirks and workarounds
export interface BrowserQuirks {
  needsRpIdWorkaround: boolean;
  requiresHttps: boolean;
  supportsConditionalMediation: boolean;
  hasUserActivationBug: boolean;
  maxCredentialIdLength?: number;
}

/**
 * Platform-specific configurations for optimal biometric experience
 */
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  ios: {
    requiresUserActivation: true,
    supportsResidentKeys: true,
    preferredTransports: ['internal'],
    timeoutRecommendation: 300000, // 5 minutes (iOS can be slow)
    userVerificationDefault: 'required',
    attestationPreference: 'none',
    fingerprintOptimized: true, // Supports Touch ID
    faceIdOptimized: true // Also supports Face ID
  },
  android: {
    requiresUserActivation: true,
    supportsResidentKeys: true,
    preferredTransports: ['internal', 'hybrid'],
    timeoutRecommendation: 180000, // 3 minutes for Android fingerprint (can be slower)
    userVerificationDefault: 'required', // Required for fingerprint authentication
    attestationPreference: 'none',
    fingerprintOptimized: true // Flag for fingerprint-specific optimizations
  },
  windows: {
    requiresUserActivation: false,
    supportsResidentKeys: true,
    preferredTransports: ['internal', 'usb'],
    timeoutRecommendation: 90000, // 1.5 minutes for Windows Hello fingerprint
    userVerificationDefault: 'required', // Required for Windows Hello fingerprint
    attestationPreference: 'none',
    fingerprintOptimized: true, // Windows Hello fingerprint support
    windowsHelloOptimized: true // Windows Hello optimization
  },
  macos: {
    requiresUserActivation: true,
    supportsResidentKeys: true,
    preferredTransports: ['internal'],
    timeoutRecommendation: 180000, // 3 minutes for macOS Touch ID
    userVerificationDefault: 'required', // Required for Touch ID
    attestationPreference: 'none',
    fingerprintOptimized: true, // Touch ID support
    touchIdOptimized: true // macOS Touch ID optimization
  },
  linux: {
    requiresUserActivation: false,
    supportsResidentKeys: false, // Often limited support
    preferredTransports: ['usb'],
    timeoutRecommendation: 60000,
    userVerificationDefault: 'discouraged', // Often not available
    attestationPreference: 'none'
  },
  other: {
    requiresUserActivation: true,
    supportsResidentKeys: false,
    preferredTransports: ['usb'],
    timeoutRecommendation: 60000,
    userVerificationDefault: 'discouraged',
    attestationPreference: 'none'
  }
};

/**
 * Browser-specific quirks and workarounds
 */
export const BROWSER_QUIRKS: Record<string, BrowserQuirks> = {
  chrome: {
    needsRpIdWorkaround: false,
    requiresHttps: true,
    supportsConditionalMediation: true,
    hasUserActivationBug: false
  },
  firefox: {
    needsRpIdWorkaround: true,
    requiresHttps: true,
    supportsConditionalMediation: false,
    hasUserActivationBug: false,
    maxCredentialIdLength: 64 // Firefox has some limitations
  },
  safari: {
    needsRpIdWorkaround: false,
    requiresHttps: true,
    supportsConditionalMediation: false,
    hasUserActivationBug: true, // Safari sometimes requires explicit user activation
    maxCredentialIdLength: 128
  },
  edge: {
    needsRpIdWorkaround: false,
    requiresHttps: true,
    supportsConditionalMediation: true,
    hasUserActivationBug: false
  },
  unknown: {
    needsRpIdWorkaround: true,
    requiresHttps: true,
    supportsConditionalMediation: false,
    hasUserActivationBug: true
  }
};

/**
 * Cross-platform biometric compatibility service
 */
export class BiometricPlatformService {
  private static instance: BiometricPlatformService;
  private platformConfig: PlatformConfig | null = null;
  private browserQuirks: BrowserQuirks | null = null;
  public isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): BiometricPlatformService {
    if (!BiometricPlatformService.instance) {
      BiometricPlatformService.instance = new BiometricPlatformService();
    }
    return BiometricPlatformService.instance;
  }

  /**
   * Initialize platform-specific configurations
   */
  public async initialize(deviceInfo?: any): Promise<void> {
    // Use passed deviceInfo or detect it independently
    const device = deviceInfo || this.getDeviceInfo();
    
    // Determine platform configuration
    if (device.isIOS) {
      this.platformConfig = PLATFORM_CONFIGS.ios ?? null;
    } else if (device.isAndroid) {
      this.platformConfig = PLATFORM_CONFIGS.android ?? null;
    } else if (device.isWindows) {
      this.platformConfig = PLATFORM_CONFIGS.windows ?? null;
    } else if (device.isMacOS) {
      this.platformConfig = PLATFORM_CONFIGS.macos ?? null;
    } else {
      this.platformConfig = PLATFORM_CONFIGS.other ?? null;
    }

    // Determine browser quirks
    this.browserQuirks = BROWSER_QUIRKS[device.browser] ?? BROWSER_QUIRKS.unknown ?? null;
    
    this.isInitialized = true;
  }

  /**
   * Get platform-optimized registration options
   */
  public getOptimizedRegistrationOptions(baseOptions: any): any {
    if (!this.platformConfig || !this.browserQuirks) {
      return baseOptions;
    }

    const optimized = { ...baseOptions };

    // Platform-specific timeout
    optimized.timeout = this.platformConfig.timeoutRecommendation;

    // Platform-specific user verification
    optimized.authenticatorSelection = {
      ...optimized.authenticatorSelection,
      userVerification: this.platformConfig.userVerificationDefault,
      residentKey: this.platformConfig.supportsResidentKeys ? 'preferred' : 'discouraged'
    };

    // Platform-specific attestation
    optimized.attestationType = this.platformConfig.attestationPreference;

    // Browser-specific workarounds
    if (this.browserQuirks.needsRpIdWorkaround && optimized.rp?.id === 'localhost') {
      // Some browsers need explicit RP ID handling
      optimized.rp.id = window.location.hostname;
    }

    return optimized;
  }

  /**
   * Get platform-optimized authentication options
   */
  public getOptimizedAuthenticationOptions(baseOptions: any): any {
    if (!this.platformConfig || !this.browserQuirks) {
      return baseOptions;
    }

    const optimized = { ...baseOptions };

    // Platform-specific timeout
    optimized.timeout = this.platformConfig.timeoutRecommendation;

    // Platform-specific user verification
    optimized.userVerification = this.platformConfig.userVerificationDefault;

    // Conditional mediation support
    if (this.browserQuirks.supportsConditionalMediation) {
      optimized.mediation = 'conditional';
    }

    return optimized;
  }

  /**
   * Check if user activation is required before biometric operation
   */
  public requiresUserActivation(): boolean {
    return this.platformConfig?.requiresUserActivation ?? true;
  }

  /**
   * Get platform-specific error messages
   */
  public getPlatformErrorMessage(error: any): string {
    const errorName = error.name || error.code || 'UnknownError';
    const deviceInfo = this.getDeviceInfo();
    
    // Platform-specific error messages
    switch (errorName) {
      case 'NotAllowedError':
        if (deviceInfo.isIOS) {
          return 'Touch ID or Face ID authentication was cancelled or timed out. Please try again and touch your finger to the sensor or look at the camera.';
        } else if (deviceInfo.isAndroid) {
          return 'Fingerprint or face authentication was cancelled or timed out. Please try again and use your registered biometric.';
        } else if (deviceInfo.isWindows) {
          return 'Windows Hello authentication was cancelled or timed out. Please try again.';
        } else if (deviceInfo.isMacOS) {
          return 'Touch ID authentication was cancelled or timed out. Please try again and touch your finger to the sensor.';
        }
        return 'Biometric authentication was cancelled or timed out. Please try again.';
        
      case 'NotSupportedError':
        if (deviceInfo.isMobile) {
          return 'Biometric authentication is not enabled on this device. Please enable it in your device settings.';
        } else {
          return 'Biometric authentication is not available on this computer. Please check your security settings.';
        }
        
      case 'SecurityError':
        if (this.browserQuirks?.requiresHttps) {
          return 'Biometric authentication requires a secure connection (HTTPS). Please access this site securely.';
        }
        return 'Security error during biometric authentication. Please try again.';
        
      case 'AbortError':
        return 'Biometric authentication was cancelled by the user.';
        
      case 'TimeoutError':
        return 'Biometric authentication timed out. Please try again.';
        
      case 'InvalidStateError':
        return 'Biometric credentials are already registered on this device.';
        
      default:
        return error.message || 'Biometric authentication failed. Please try again.';
    }
  }

  /**
   * Get platform-specific setup instructions
   */
  public getPlatformSetupInstructions(): string[] {
    if (!this.platformConfig) {
      return ['Set up biometric authentication on your device'];
    }

    const deviceInfo = this.getDeviceInfo();
    
    if (deviceInfo.isIOS) {
      return [
        'Open Settings app',
        'Go to Face ID & Passcode (or Touch ID & Passcode)',
        'Enable Face ID/Touch ID for apps and websites',
        'Make sure Vetora is allowed to use biometric authentication'
      ];
    } else if (deviceInfo.isAndroid) {
      return [
        'Open Settings app',
        'Go to Security & privacy',
        'Set up Fingerprint or Face unlock',
        'Enable biometric authentication for apps',
        'Allow browser access to biometric features'
      ];
    } else if (deviceInfo.isWindows) {
      return [
        'Open Windows Settings',
        'Go to Accounts > Sign-in options',
        'Set up Windows Hello (Face, Fingerprint, or PIN)',
        'Enable Windows Hello for apps and websites'
      ];
    } else if (deviceInfo.isMacOS) {
      return [
        'Open System Preferences',
        'Go to Touch ID',
        'Add your fingerprint',
        'Enable Touch ID for apps and websites',
        'Make sure Safari allows biometric authentication'
      ];
    } else {
      return [
        'Check if your device supports biometric authentication',
        'Enable biometric features in your device settings',
        'Make sure your browser supports WebAuthn',
        'Use a secure connection (HTTPS)'
      ];
    }
  }

  /**
   * Perform platform-specific pre-checks before biometric operations
   */
  public async performPreChecks(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check HTTPS requirement
    if (this.browserQuirks?.requiresHttps && location.protocol !== 'https:' && location.hostname !== 'localhost') {
      errors.push('Biometric authentication requires HTTPS. Please access this site securely.');
    }

    // Check user activation for Safari
    if (this.browserQuirks?.hasUserActivationBug) {
      // Note: This is a heuristic check, not foolproof
      const userActivated = (document as any).hasStoredUserActivation || 
                           (Date.now() - (window as any).lastUserInteraction < 5000);
      if (!userActivated) {
        errors.push('Please interact with the page (click or tap) before using biometric authentication.');
      }
    }

    // Check for platform-specific requirements
    if (this.platformConfig?.requiresUserActivation && !document.hasFocus()) {
      errors.push('Please make sure this tab is active and focused before using biometric authentication.');
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Get recommended retry strategy for platform
   */
  public getRetryStrategy(): { maxRetries: number; baseDelay: number; exponentialBackoff: boolean } {
    if (!this.platformConfig) {
      return { maxRetries: 3, baseDelay: 1000, exponentialBackoff: true };
    }

    const deviceInfo = this.getDeviceInfo();
    
    if (deviceInfo.isIOS) {
      // iOS can be slow and users might need multiple attempts
      return { maxRetries: 5, baseDelay: 2000, exponentialBackoff: false };
    } else if (deviceInfo.isAndroid) {
      // Android varies widely, moderate retry strategy
      return { maxRetries: 4, baseDelay: 1500, exponentialBackoff: true };
    } else if (deviceInfo.isWindows) {
      // Windows Hello is usually reliable
      return { maxRetries: 3, baseDelay: 1000, exponentialBackoff: true };
    } else {
      // Conservative for unknown platforms
      return { maxRetries: 2, baseDelay: 2000, exponentialBackoff: false };
    }
  }

  /**
   * Get device information
   */
  public getDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') {
      return {
        isIOS: false,
        isAndroid: false,
        isWindows: false,
        isMacOS: false,
        isLinux: false,
        isMobile: false,
        browser: 'unknown',
        userAgent: ''
      };
    }

    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    // Detect operating system
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(userAgent);
    const isWindows = /Win/.test(platform);
    const isMacOS = /Mac/.test(platform) && !isIOS;
    const isLinux = /Linux/.test(platform) && !isAndroid;
    const isMobile = isIOS || isAndroid || /Mobile|Tablet/.test(userAgent);

    // Detect browser
    let browser = 'unknown';
    if (/Chrome/.test(userAgent) && !/Edge/.test(userAgent)) {
      browser = 'chrome';
    } else if (/Firefox/.test(userAgent)) {
      browser = 'firefox';
    } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
      browser = 'safari';
    } else if (/Edge/.test(userAgent)) {
      browser = 'edge';
    }

    return {
      isIOS,
      isAndroid,
      isWindows,
      isMacOS,
      isLinux,
      isMobile,
      browser,
      userAgent
    };
  }

  /**
   * Get platform configuration
   */
  public getPlatformConfig(): PlatformConfig | null {
    return this.platformConfig;
  }

  /**
   * Check if current platform is optimized for fingerprint authentication
   */
  public isFingerprintOptimized(): boolean {
    if (!this.platformConfig) return false;
    return (this.platformConfig as any).fingerprintOptimized === true;
  }

  /**
   * Get fingerprint-specific error messages
   */
  public getFingerprintErrorMessage(error: any): string {
    const errorName = error.name || error.code || 'UnknownError';
    const deviceInfo = this.getDeviceInfo();
    
    // Fingerprint-specific error messages
    switch (errorName) {
      case 'NotAllowedError':
        if (deviceInfo.isIOS) {
          return 'Touch ID authentication was cancelled or timed out. Please place your finger on the Touch ID sensor and try again.';
        } else if (deviceInfo.isAndroid) {
          return 'Fingerprint authentication was cancelled or timed out. Please place your finger on the fingerprint sensor and try again.';
        } else if (deviceInfo.isWindows) {
          return 'Windows Hello fingerprint authentication was cancelled or timed out. Please use your fingerprint sensor and try again.';
        } else if (deviceInfo.isMacOS) {
          return 'Touch ID authentication was cancelled or timed out. Please place your finger on the Touch ID sensor and try again.';
        }
        return 'Fingerprint authentication was cancelled or timed out. Please try again.';
        
      case 'NotSupportedError':
        if (deviceInfo.isMobile) {
          return 'Fingerprint authentication is not enabled on this device. Please enable fingerprint unlock in your device settings.';
        } else {
          return 'Fingerprint authentication is not available on this computer. Please check if you have a fingerprint sensor and it\'s enabled.';
        }
        
      case 'SecurityError':
        return 'Fingerprint authentication requires a secure connection. Please ensure you\'re using HTTPS.';
        
      case 'AbortError':
        return 'Fingerprint authentication was cancelled by the user.';
        
      case 'TimeoutError':
        return 'Fingerprint authentication timed out. Please place your finger on the sensor and try again.';
        
      case 'InvalidStateError':
        return 'Fingerprint credentials are already registered on this device.';
        
      default:
        return error.message || 'Fingerprint authentication failed. Please ensure your finger is clean and dry, then try again.';
    }
  }

  /**
   * Get fingerprint setup instructions for current platform
   */
  public getFingerprintSetupInstructions(): string[] {
    const deviceInfo = this.getDeviceInfo();
    
    if (deviceInfo.isIOS) {
      return [
        'Open Settings app',
        'Go to Touch ID & Passcode',
        'Enter your passcode',
        'Tap "Add a Fingerprint"',
        'Follow the on-screen instructions to scan your fingerprint',
        'Enable Touch ID for apps and websites'
      ];
    } else if (deviceInfo.isAndroid) {
      return [
        'Open Settings app',
        'Go to Security & privacy (or Biometrics and security)',
        'Tap "Fingerprint"',
        'Enter your PIN, pattern, or password',
        'Tap "Add fingerprint"',
        'Follow the on-screen instructions',
        'Enable fingerprint for apps'
      ];
    } else if (deviceInfo.isWindows) {
      return [
        'Open Windows Settings',
        'Go to Accounts > Sign-in options',
        'Under Windows Hello Fingerprint, click "Set up"',
        'Follow the setup wizard',
        'Scan your finger multiple times',
        'Enable Windows Hello for apps and websites'
      ];
    } else if (deviceInfo.isMacOS) {
      return [
        'Open System Preferences',
        'Click on Touch ID',
        'Click "Add a fingerprint"',
        'Follow the on-screen instructions',
        'Place your finger on the Touch ID sensor repeatedly',
        'Enable Touch ID for apps and websites'
      ];
    } else {
      return [
        'Check if your device has a fingerprint sensor',
        'Enable fingerprint authentication in your device settings',
        'Register your fingerprints',
        'Enable fingerprint for web authentication'
      ];
    }
  }

  /**
   * Get browser quirks
   */
  public getBrowserQuirks(): BrowserQuirks | null {
    return this.browserQuirks;
  }
}

// Export singleton instance
export const biometricPlatformService = BiometricPlatformService.getInstance();

// Note: Auto-initialization removed to prevent circular dependency
// Platform service will be initialized manually when needed

// Export utility functions
export const getPlatformOptimizedOptions = (options: any, type: 'registration' | 'authentication') => {
  return type === 'registration' 
    ? biometricPlatformService.getOptimizedRegistrationOptions(options)
    : biometricPlatformService.getOptimizedAuthenticationOptions(options);
};

export const performPlatformPreChecks = () => biometricPlatformService.performPreChecks();
export const getPlatformErrorMessage = (error: any) => biometricPlatformService.getPlatformErrorMessage(error);
export const getPlatformSetupInstructions = () => biometricPlatformService.getPlatformSetupInstructions();
