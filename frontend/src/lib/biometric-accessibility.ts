/**
 * Biometric Accessibility Features
 * Provides accessibility support and alternative authentication methods for users with disabilities
 */

// Note: biometricService will be passed as parameter to avoid circular dependency

// Accessibility configuration interface
export interface AccessibilityConfig {
  screenReaderSupport: boolean;
  highContrastMode: boolean;
  largeTextMode: boolean;
  keyboardNavigationOnly: boolean;
  reducedMotion: boolean;
  alternativeAuthMethods: string[];
  assistiveTechnology: {
    hasScreenReader: boolean;
    hasVoiceControl: boolean;
    hasKeyboardOnly: boolean;
    hasMagnifier: boolean;
  };
}

// Alternative authentication methods
export interface AlternativeAuthMethod {
  id: string;
  name: string;
  description: string;
  isAvailable: boolean;
  accessibilityFeatures: string[];
  setupInstructions: string[];
}

// Screen reader announcements
export interface ScreenReaderAnnouncements {
  biometricPrompt: string;
  biometricSuccess: string;
  biometricError: string;
  biometricProgress: string;
  fallbackOptions: string;
}

/**
 * Biometric Accessibility Service
 */
export class BiometricAccessibilityService {
  private static instance: BiometricAccessibilityService;
  private config: AccessibilityConfig | null = null;
  private announcer: HTMLElement | null = null;

  private constructor() {
    this.initializeAnnouncer();
  }

  public static getInstance(): BiometricAccessibilityService {
    if (!BiometricAccessibilityService.instance) {
      BiometricAccessibilityService.instance = new BiometricAccessibilityService();
    }
    return BiometricAccessibilityService.instance;
  }

  /**
   * Initialize screen reader announcer
   */
  private initializeAnnouncer(): void {
    if (typeof window === 'undefined') return;

    // Create a live region for screen reader announcements
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only biometric-announcer';
    this.announcer.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(this.announcer);
  }

  /**
   * Detect accessibility preferences and assistive technology
   */
  public async detectAccessibilityNeeds(biometricCapabilities?: any): Promise<AccessibilityConfig> {
    const config: AccessibilityConfig = {
      screenReaderSupport: this.detectScreenReader(),
      highContrastMode: this.detectHighContrast(),
      largeTextMode: this.detectLargeText(),
      keyboardNavigationOnly: this.detectKeyboardOnly(),
      reducedMotion: this.detectReducedMotion(),
      alternativeAuthMethods: [],
      assistiveTechnology: {
        hasScreenReader: this.detectScreenReader(),
        hasVoiceControl: this.detectVoiceControl(),
        hasKeyboardOnly: this.detectKeyboardOnly(),
        hasMagnifier: this.detectMagnifier()
      }
    };

    // Determine available alternative authentication methods
    config.alternativeAuthMethods = await this.getAvailableAlternativeMethods(biometricCapabilities);

    this.config = config;
    return config;
  }

  /**
   * Detect screen reader presence
   */
  private detectScreenReader(): boolean {
    if (typeof window === 'undefined') return false;

    // Check for common screen reader indicators
    const indicators = [
      // Check for screen reader user agent strings
      /NVDA|JAWS|WindowEyes|ZoomText|MAGic|VoiceOver|TalkBack|Orca/i.test(navigator.userAgent),
      // Check for high contrast media query (often indicates screen reader use)
      window.matchMedia('(prefers-contrast: high)').matches,
      // Check for reduced motion (screen reader users often prefer this)
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      // Check for forced colors (Windows high contrast mode)
      window.matchMedia('(forced-colors: active)').matches
    ];

    return indicators.some(Boolean);
  }

  /**
   * Detect high contrast mode preference
   */
  private detectHighContrast(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches ||
           window.matchMedia('(forced-colors: active)').matches;
  }

  /**
   * Detect large text preference
   */
  private detectLargeText(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-contrast: high)').matches ||
           parseFloat(getComputedStyle(document.documentElement).fontSize) > 16;
  }

  /**
   * Detect keyboard-only navigation
   */
  private detectKeyboardOnly(): boolean {
    // This is hard to detect automatically, but we can make educated guesses
    return this.detectScreenReader(); // Screen reader users typically use keyboard
  }

  /**
   * Detect reduced motion preference
   */
  private detectReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Detect voice control software
   */
  private detectVoiceControl(): boolean {
    // This is difficult to detect programmatically
    // We rely on user agent hints or user self-identification
    return /Dragon|Voice|Speech/i.test(navigator.userAgent);
  }

  /**
   * Detect magnifier software
   */
  private detectMagnifier(): boolean {
    // Check for zoom level as a potential indicator
    return typeof window !== 'undefined' && window.devicePixelRatio > 1.5;
  }

  /**
   * Get available alternative authentication methods
   */
  private async getAvailableAlternativeMethods(biometricCapabilities?: any): Promise<string[]> {
    const methods: string[] = ['password']; // Always available

    try {
      // Add biometric if available (capabilities passed from outside to avoid circular dependency)
      if (biometricCapabilities?.isSupported && biometricCapabilities?.isPlatformAuthenticatorAvailable) {
        methods.push('biometric');
      }

      // Add voice authentication if speech recognition is available
      if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        methods.push('voice');
      }

      // Add pattern/gesture if touch is available
      if (typeof window !== 'undefined' && 'ontouchstart' in window) {
        methods.push('pattern');
      }

      // Add 2FA/TOTP
      methods.push('totp');

    } catch (error) {
      console.warn('Error detecting alternative authentication methods:', error);
    }

    return methods;
  }

  /**
   * Get alternative authentication methods with accessibility info
   */
  public getAlternativeAuthMethods(): AlternativeAuthMethod[] {
    const methods: AlternativeAuthMethod[] = [
      {
        id: 'password',
        name: 'Password',
        description: 'Traditional password authentication',
        isAvailable: true,
        accessibilityFeatures: [
          'Full keyboard support',
          'Screen reader compatible',
          'Works with password managers',
          'High contrast friendly'
        ],
        setupInstructions: [
          'Enter your password in the password field',
          'Use Tab to navigate between fields',
          'Password managers can auto-fill this field'
        ]
      },
      {
        id: 'biometric',
        name: 'Biometric Authentication',
        description: 'Fingerprint, face, or other biometric authentication',
        isAvailable: true, // Will be updated based on capabilities
        accessibilityFeatures: [
          'No typing required',
          'Quick authentication',
          'Works with assistive hardware',
          'Audio feedback available'
        ],
        setupInstructions: [
          'Ensure biometric authentication is set up on your device',
          'When prompted, use your registered biometric method',
          'Listen for audio cues or check screen reader announcements'
        ]
      },
      {
        id: 'voice',
        name: 'Voice Authentication',
        description: 'Voice pattern recognition authentication',
        isAvailable: false, // Will be updated based on capabilities
        accessibilityFeatures: [
          'Hands-free operation',
          'Works with speech disabilities (voice print)',
          'No visual requirements',
          'Compatible with voice control software'
        ],
        setupInstructions: [
          'Allow microphone access when prompted',
          'Speak your passphrase clearly',
          'Works in quiet environments for best results'
        ]
      },
      {
        id: 'pattern',
        name: 'Touch Pattern',
        description: 'Draw a pattern on touchscreen devices',
        isAvailable: false, // Will be updated based on capabilities
        accessibilityFeatures: [
          'Large touch targets',
          'Vibration feedback',
          'High contrast visual cues',
          'Voice guidance available'
        ],
        setupInstructions: [
          'Draw your pattern on the grid',
          'Use voice guidance if available',
          'Feel for vibration feedback'
        ]
      },
      {
        id: 'totp',
        name: 'Authenticator App',
        description: 'Time-based one-time password from authenticator app',
        isAvailable: true,
        accessibilityFeatures: [
          'Works with accessible authenticator apps',
          'Large text support',
          'Voice input compatible',
          'Screen reader friendly'
        ],
        setupInstructions: [
          'Open your authenticator app',
          'Find the Vetora entry',
          'Enter the 6-digit code',
          'Use voice input if needed'
        ]
      }
    ];

    // Update availability based on detected capabilities
    if (this.config) {
      const voiceMethod = methods.find(m => m.id === 'voice');
      if (voiceMethod) {
        voiceMethod.isAvailable = this.config.alternativeAuthMethods.includes('voice');
      }

      const patternMethod = methods.find(m => m.id === 'pattern');
      if (patternMethod) {
        patternMethod.isAvailable = this.config.alternativeAuthMethods.includes('pattern');
      }

      const biometricMethod = methods.find(m => m.id === 'biometric');
      if (biometricMethod) {
        biometricMethod.isAvailable = this.config.alternativeAuthMethods.includes('biometric');
      }
    }

    return methods.filter(method => method.isAvailable);
  }

  /**
   * Announce message to screen readers
   */
  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcer) return;

    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;

    // Clear after a delay to allow for re-announcements
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = '';
      }
    }, 1000);
  }

  /**
   * Get screen reader announcements for biometric authentication
   */
  public getScreenReaderAnnouncements(): ScreenReaderAnnouncements {
    const deviceInfo = this.config?.assistiveTechnology;
    
    return {
      biometricPrompt: `Biometric authentication available. ${
        deviceInfo?.hasKeyboardOnly 
          ? 'Press Enter to start biometric authentication, or Tab to skip to password field.' 
          : 'Activate to start biometric authentication.'
      }`,
      
      biometricSuccess: 'Biometric authentication successful. You are now signed in.',
      
      biometricError: `Biometric authentication failed. ${
        deviceInfo?.hasKeyboardOnly 
          ? 'Press Tab to access alternative authentication methods.' 
          : 'Please try an alternative authentication method.'
      }`,
      
      biometricProgress: 'Biometric authentication in progress. Please wait.',
      
      fallbackOptions: `Alternative authentication methods available: ${
        this.getAlternativeAuthMethods()
          .map(method => method.name)
          .join(', ')
      }`
    };
  }

  /**
   * Configure biometric UI for accessibility
   */
  public getAccessibleBiometricConfig() {
    if (!this.config) return {};

    return {
      // ARIA labels and descriptions
      ariaLabel: 'Biometric authentication',
      ariaDescription: 'Use your fingerprint, face recognition, or other biometric method to sign in',
      
      // Keyboard support
      tabIndex: 0,
      role: 'button',
      
      // Visual accessibility
      highContrast: this.config.highContrastMode,
      largeText: this.config.largeTextMode,
      reducedMotion: this.config.reducedMotion,
      
      // Screen reader support
      'aria-live': 'polite',
      'aria-atomic': 'true',
      
      // Focus management
      autoFocus: false, // Don't auto-focus for screen reader users
      
      // Error handling
      'aria-invalid': false,
      'aria-describedby': 'biometric-error biometric-help',
      
      // Progress indication
      'aria-busy': false,
      'aria-progress': 'polite'
    };
  }

  /**
   * Handle keyboard navigation for biometric authentication
   */
  public handleKeyboardNavigation(event: KeyboardEvent, onActivate: () => void, onSkip: () => void): void {
    switch (event.key) {
      case 'Enter':
      case ' ': // Space bar
        event.preventDefault();
        onActivate();
        this.announce('Starting biometric authentication');
        break;
        
      case 'Escape':
        event.preventDefault();
        onSkip();
        this.announce('Biometric authentication cancelled. Moving to alternative methods.');
        break;
        
      case 'Tab':
        // Allow natural tab navigation
        this.announce('Moving to next authentication option');
        break;
        
      case '?':
        // Help key
        event.preventDefault();
        this.announce(this.getScreenReaderAnnouncements().fallbackOptions);
        break;
    }
  }

  /**
   * Provide voice guidance for biometric authentication
   */
  public provideVoiceGuidance(step: string): void {
    const guidance: Record<string, string> = {
      'start': 'Please prepare your biometric authentication method. Touch your fingerprint sensor, look at the camera, or prepare your registered biometric.',
      'progress': 'Authentication in progress. Please keep your biometric sensor active.',
      'success': 'Biometric authentication successful. Welcome!',
      'error': 'Biometric authentication failed. You can try again or use an alternative method.',
      'cancelled': 'Authentication cancelled. Alternative authentication methods are available.'
    };

    const message = guidance[step] || step;
    this.announce(message, 'assertive');
  }

  /**
   * Get accessibility configuration
   */
  public getConfig(): AccessibilityConfig | null {
    return this.config;
  }
}

// Export singleton instance
export const biometricAccessibilityService = BiometricAccessibilityService.getInstance();

// Export utility functions
export const detectAccessibilityNeeds = () => biometricAccessibilityService.detectAccessibilityNeeds();
export const announceToScreenReader = (message: string, priority?: 'polite' | 'assertive') => 
  biometricAccessibilityService.announce(message, priority);
export const getAccessibleBiometricConfig = () => biometricAccessibilityService.getAccessibleBiometricConfig();
export const getAlternativeAuthMethods = () => biometricAccessibilityService.getAlternativeAuthMethods();
export const handleBiometricKeyboardNavigation = (event: KeyboardEvent, onActivate: () => void, onSkip: () => void) =>
  biometricAccessibilityService.handleKeyboardNavigation(event, onActivate, onSkip);
export const provideBiometricVoiceGuidance = (step: string) => biometricAccessibilityService.provideVoiceGuidance(step);
