import { ThemeMode, FontSize } from '@/contexts/ThemeContext';
import { Language } from '@/contexts/LanguageContext';
import { PrivacySettings } from '@/contexts/PrivacyContext';
import { InteractionSettings } from '@/contexts/InteractionContext';

// Settings data structure for export/import
export interface SettingsData {
  version: string;
  timestamp: string;
  settings: {
    theme: {
      mode: ThemeMode;
      fontSize: FontSize;
      reducedMotion: boolean;
      highContrast: boolean;
    };
    language: Language;
    accessibility: {
      reducedMotion: boolean;
      highContrast: boolean;
    };
    privacy: PrivacySettings;
    interaction: InteractionSettings;
  };
  metadata: {
    platform: string;
    userAgent: string;
    exportedBy: string;
  };
}

// Current settings version for migration purposes
export const SETTINGS_VERSION = '1.0.0';

// Storage keys used by the application
export const STORAGE_KEYS = {
  THEME_MODE: 'vetora-theme-mode',
  FONT_SIZE: 'vetora-font-size',
  LANGUAGE: 'vetora-language',
  REDUCED_MOTION: 'vetora-reduced-motion',
  HIGH_CONTRAST: 'vetora-high-contrast',
  PRIVACY_SETTINGS: 'vetora-privacy-settings',
  INTERACTION_SETTINGS: 'vetora-interaction-settings',
} as const;

// Validation schemas
const VALID_THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];
const VALID_FONT_SIZES: FontSize[] = ['small', 'medium', 'large'];
const VALID_LANGUAGES: Language[] = ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ru'];

/**
 * Export current settings to a JSON object
 */
export function exportSettings(): SettingsData {
  // Get privacy settings from localStorage
  let privacySettings: PrivacySettings;
  try {
    const savedPrivacy = localStorage.getItem(STORAGE_KEYS.PRIVACY_SETTINGS);
    privacySettings = savedPrivacy ? JSON.parse(savedPrivacy) : {};
  } catch {
    privacySettings = {} as PrivacySettings;
  }

  // Get interaction settings from localStorage
  let interactionSettings: InteractionSettings;
  try {
    const savedInteraction = localStorage.getItem(STORAGE_KEYS.INTERACTION_SETTINGS);
    interactionSettings = savedInteraction ? JSON.parse(savedInteraction) : {};
  } catch {
    interactionSettings = {} as InteractionSettings;
  }

  const currentSettings: SettingsData = {
    version: SETTINGS_VERSION,
    timestamp: new Date().toISOString(),
    settings: {
      theme: {
        mode: (localStorage.getItem(STORAGE_KEYS.THEME_MODE) as ThemeMode) || 'system',
        fontSize: (localStorage.getItem(STORAGE_KEYS.FONT_SIZE) as FontSize) || 'medium',
        reducedMotion: localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION) === 'true',
        highContrast: localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true',
      },
      language: (localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language) || 'en',
      accessibility: {
        reducedMotion: localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION) === 'true',
        highContrast: localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true',
      },
      privacy: privacySettings,
      interaction: interactionSettings,
    },
    metadata: {
      platform: 'Vetora Web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      exportedBy: 'Vetora Settings Export v' + SETTINGS_VERSION,
    },
  };

  return currentSettings;
}

/**
 * Download settings as a JSON file
 */
export function downloadSettingsFile(settings: SettingsData, filename?: string): void {
  const defaultFilename = `vetora-settings-${new Date().toISOString().split('T')[0]}.json`;
  const finalFilename = filename || defaultFilename;
  
  const dataStr = JSON.stringify(settings, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Validate imported settings data
 */
export function validateSettings(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if data exists and is an object
  if (!data || typeof data !== 'object') {
    errors.push('Invalid settings file format');
    return { isValid: false, errors };
  }

  // Check version
  if (!data.version || typeof data.version !== 'string') {
    errors.push('Missing or invalid version information');
  }

  // Check settings structure
  if (!data.settings || typeof data.settings !== 'object') {
    errors.push('Missing settings data');
    return { isValid: false, errors };
  }

  const { settings } = data;

  // Validate theme settings
  if (settings.theme) {
    if (settings.theme.mode && !VALID_THEME_MODES.includes(settings.theme.mode)) {
      errors.push(`Invalid theme mode: ${settings.theme.mode}`);
    }
    if (settings.theme.fontSize && !VALID_FONT_SIZES.includes(settings.theme.fontSize)) {
      errors.push(`Invalid font size: ${settings.theme.fontSize}`);
    }
    if (settings.theme.reducedMotion !== undefined && typeof settings.theme.reducedMotion !== 'boolean') {
      errors.push('Invalid reduced motion setting');
    }
    if (settings.theme.highContrast !== undefined && typeof settings.theme.highContrast !== 'boolean') {
      errors.push('Invalid high contrast setting');
    }
  }

  // Validate language
  if (settings.language && !VALID_LANGUAGES.includes(settings.language)) {
    errors.push(`Invalid language: ${settings.language}`);
  }

  // Validate accessibility settings
  if (settings.accessibility) {
    if (settings.accessibility.reducedMotion !== undefined && typeof settings.accessibility.reducedMotion !== 'boolean') {
      errors.push('Invalid accessibility reduced motion setting');
    }
    if (settings.accessibility.highContrast !== undefined && typeof settings.accessibility.highContrast !== 'boolean') {
      errors.push('Invalid accessibility high contrast setting');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Apply imported settings to localStorage
 */
export function applySettings(data: SettingsData): void {
  const { settings } = data;

  // Apply theme settings
  if (settings.theme) {
    if (settings.theme.mode) {
      localStorage.setItem(STORAGE_KEYS.THEME_MODE, settings.theme.mode);
    }
    if (settings.theme.fontSize) {
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, settings.theme.fontSize);
    }
    if (settings.theme.reducedMotion !== undefined) {
      localStorage.setItem(STORAGE_KEYS.REDUCED_MOTION, settings.theme.reducedMotion.toString());
    }
    if (settings.theme.highContrast !== undefined) {
      localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, settings.theme.highContrast.toString());
    }
  }

  // Apply language setting
  if (settings.language) {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, settings.language);
  }

  // Apply accessibility settings (fallback if theme settings don't exist)
  if (settings.accessibility) {
    if (settings.accessibility.reducedMotion !== undefined && !settings.theme?.reducedMotion) {
      localStorage.setItem(STORAGE_KEYS.REDUCED_MOTION, settings.accessibility.reducedMotion.toString());
    }
    if (settings.accessibility.highContrast !== undefined && !settings.theme?.highContrast) {
      localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, settings.accessibility.highContrast.toString());
    }
  }

  // Apply privacy settings
  if (settings.privacy) {
    localStorage.setItem(STORAGE_KEYS.PRIVACY_SETTINGS, JSON.stringify(settings.privacy));
  }

  // Apply interaction settings
  if (settings.interaction) {
    localStorage.setItem(STORAGE_KEYS.INTERACTION_SETTINGS, JSON.stringify(settings.interaction));
  }
}

/**
 * Read and parse settings file
 */
export function readSettingsFile(file: File): Promise<SettingsData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        resolve(data);
      } catch (error) {
        reject(new Error('Failed to parse settings file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read settings file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Migrate settings from older versions
 */
export function migrateSettings(data: SettingsData): SettingsData {
  // For now, we only have version 1.0.0, but this function
  // can be extended to handle migrations from older versions

  if (data.version === SETTINGS_VERSION) {
    return data;
  }

  // Create a migrated copy
  const migrated: SettingsData = {
    ...data,
    version: SETTINGS_VERSION,
    timestamp: new Date().toISOString(),
  };

  // Handle potential future migrations
  if (!data.version || data.version < '1.0.0') {
    // Migration logic for pre-1.0.0 versions would go here
    console.warn('Migrating from legacy settings format');

    // Ensure all required fields exist with defaults
    migrated.settings = {
      theme: {
        mode: data.settings?.theme?.mode || 'system',
        fontSize: data.settings?.theme?.fontSize || 'medium',
        reducedMotion: data.settings?.theme?.reducedMotion || false,
        highContrast: data.settings?.theme?.highContrast || false,
      },
      language: data.settings?.language || 'en',
      accessibility: {
        reducedMotion: data.settings?.accessibility?.reducedMotion || data.settings?.theme?.reducedMotion || false,
        highContrast: data.settings?.accessibility?.highContrast || data.settings?.theme?.highContrast || false,
      },
      privacy: data.settings?.privacy || {} as PrivacySettings,
      interaction: data.settings?.interaction || {} as InteractionSettings,
    };

    migrated.metadata = {
      platform: data.metadata?.platform || 'Vetora Web',
      userAgent: data.metadata?.userAgent || 'Unknown',
      exportedBy: `Migrated to v${SETTINGS_VERSION}`,
    };
  }

  console.info(`Settings migrated from version ${data.version} to ${SETTINGS_VERSION}`);
  return migrated;
}

/**
 * Sanitize settings data to ensure safe values
 */
export function sanitizeSettings(data: SettingsData): SettingsData {
  const sanitized = { ...data };

  // Sanitize theme settings
  if (sanitized.settings.theme) {
    if (!VALID_THEME_MODES.includes(sanitized.settings.theme.mode)) {
      sanitized.settings.theme.mode = 'system';
    }
    if (!VALID_FONT_SIZES.includes(sanitized.settings.theme.fontSize)) {
      sanitized.settings.theme.fontSize = 'medium';
    }
    if (typeof sanitized.settings.theme.reducedMotion !== 'boolean') {
      sanitized.settings.theme.reducedMotion = false;
    }
    if (typeof sanitized.settings.theme.highContrast !== 'boolean') {
      sanitized.settings.theme.highContrast = false;
    }
  }

  // Sanitize language
  if (!VALID_LANGUAGES.includes(sanitized.settings.language)) {
    sanitized.settings.language = 'en';
  }

  // Sanitize accessibility settings
  if (sanitized.settings.accessibility) {
    if (typeof sanitized.settings.accessibility.reducedMotion !== 'boolean') {
      sanitized.settings.accessibility.reducedMotion = false;
    }
    if (typeof sanitized.settings.accessibility.highContrast !== 'boolean') {
      sanitized.settings.accessibility.highContrast = false;
    }
  }

  return sanitized;
}
