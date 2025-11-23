/**
 * Browser Extension Detection Utilities
 * Helps detect common browser extensions that might interfere with form submissions
 */

export interface ExtensionDetectionResult {
  hasPasswordManager: boolean;
  hasFormFiller: boolean;
  detectedExtensions: string[];
  recommendations: string[];
}

/**
 * Detects common browser extensions that might interfere with forms
 */
export function detectBrowserExtensions(): ExtensionDetectionResult {
  const result: ExtensionDetectionResult = {
    hasPasswordManager: false,
    hasFormFiller: false,
    detectedExtensions: [],
    recommendations: []
  };

  if (typeof window === 'undefined') {
    return result;
  }

  try {
    // Check for common password manager indicators
    const passwordManagerIndicators = [
      'lastpass',
      'onepassword', 
      '1password',
      'dashlane',
      'bitwarden',
      'keeper',
      'roboform'
    ];

    // Check for form filler indicators
    const formFillerIndicators = [
      'autofill',
      'formfiller',
      'autocomplete'
    ];

    // Check document for extension-injected elements
    const allElements = document.querySelectorAll('*');
    const classNames = Array.from(allElements).map(el => el.className).join(' ').toLowerCase();
    const ids = Array.from(allElements).map(el => el.id).join(' ').toLowerCase();
    const combined = `${classNames} ${ids}`;

    // Detect password managers
    passwordManagerIndicators.forEach(indicator => {
      if (combined.includes(indicator)) {
        result.hasPasswordManager = true;
        result.detectedExtensions.push(indicator);
      }
    });

    // Detect form fillers
    formFillerIndicators.forEach(indicator => {
      if (combined.includes(indicator)) {
        result.hasFormFiller = true;
        result.detectedExtensions.push(indicator);
      }
    });

    // Check for common extension global variables
    const extensionGlobals = [
      'chrome.extension',
      'browser.extension',
      'safari.extension'
    ];

    extensionGlobals.forEach(global => {
      try {
        if (eval(`typeof ${global}`) !== 'undefined') {
          result.detectedExtensions.push('browser-extension');
        }
      } catch (e) {
        // Ignore eval errors
      }
    });

    // Generate recommendations
    if (result.hasPasswordManager) {
      result.recommendations.push('Temporarily disable your password manager');
    }
    if (result.hasFormFiller) {
      result.recommendations.push('Disable form-filling extensions');
    }
    if (result.detectedExtensions.length > 0) {
      result.recommendations.push('Try using an incognito/private window');
      result.recommendations.push('Try a different browser');
    }

  } catch (error) {
    console.warn('Extension detection failed:', error);
  }

  return result;
}

/**
 * Checks if the current environment might have extension interference
 */
export function hasLikelyExtensionInterference(): boolean {
  const detection = detectBrowserExtensions();
  return detection.hasPasswordManager || detection.hasFormFiller || detection.detectedExtensions.length > 0;
}

/**
 * Gets user-friendly recommendations for dealing with extension interference
 */
export function getExtensionRecommendations(): string[] {
  const detection = detectBrowserExtensions();
  
  if (detection.recommendations.length === 0) {
    return [
      'Use an incognito/private browser window',
      'Temporarily disable browser extensions',
      'Try a different browser'
    ];
  }
  
  return detection.recommendations;
}