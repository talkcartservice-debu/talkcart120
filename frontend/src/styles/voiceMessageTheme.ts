import React from 'react';
import { Theme, alpha } from '@mui/material/styles';

/**
 * Voice Message Theme Customization
 * Customize the appearance of voice message components to match your app's theme
 */

export interface VoiceMessageThemeConfig {
    // Colors
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    textColor?: string;

    // Voice message bubble
    bubbleBackground?: {
        own: string;
        other: string;
    };
    bubbleBorder?: {
        own: string;
        other: string;
    };

    // Waveform
    waveformActive?: string;
    waveformInactive?: string;
    waveformHover?: string;

    // Controls
    playButtonBackground?: string;
    playButtonColor?: string;
    controlsColor?: string;

    // Progress
    progressActive?: string;
    progressInactive?: string;

    // Effects
    glassmorphism?: boolean;
    borderRadius?: number;
    shadows?: boolean;
}

/**
 * Default Vetora theme configuration
 */
export const defaultVoiceMessageTheme: VoiceMessageThemeConfig = {
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    backgroundColor: '#ffffff',
    textColor: '#333333',

    bubbleBackground: {
        own: 'rgba(102, 126, 234, 0.1)',
        other: 'rgba(255, 255, 255, 0.8)'
    },
    bubbleBorder: {
        own: 'rgba(102, 126, 234, 0.2)',
        other: 'rgba(0, 0, 0, 0.1)'
    },

    waveformActive: '#667eea',
    waveformInactive: 'rgba(0, 0, 0, 0.3)',
    waveformHover: 'rgba(102, 126, 234, 0.8)',

    playButtonBackground: '#667eea',
    playButtonColor: '#ffffff',
    controlsColor: 'rgba(0, 0, 0, 0.7)',

    progressActive: '#667eea',
    progressInactive: 'rgba(0, 0, 0, 0.2)',

    glassmorphism: true,
    borderRadius: 12,
    shadows: true
};

/**
 * Dark theme configuration
 */
export const darkVoiceMessageTheme: VoiceMessageThemeConfig = {
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    backgroundColor: '#1a1a1a',
    textColor: '#ffffff',

    bubbleBackground: {
        own: 'rgba(102, 126, 234, 0.2)',
        other: 'rgba(255, 255, 255, 0.1)'
    },
    bubbleBorder: {
        own: 'rgba(102, 126, 234, 0.3)',
        other: 'rgba(255, 255, 255, 0.2)'
    },

    waveformActive: '#667eea',
    waveformInactive: 'rgba(255, 255, 255, 0.3)',
    waveformHover: 'rgba(102, 126, 234, 0.8)',

    playButtonBackground: '#667eea',
    playButtonColor: '#ffffff',
    controlsColor: 'rgba(255, 255, 255, 0.7)',

    progressActive: '#667eea',
    progressInactive: 'rgba(255, 255, 255, 0.2)',

    glassmorphism: true,
    borderRadius: 12,
    shadows: true
};

/**
 * Minimal theme configuration
 */
export const minimalVoiceMessageTheme: VoiceMessageThemeConfig = {
    primaryColor: '#000000',
    secondaryColor: '#666666',
    backgroundColor: '#ffffff',
    textColor: '#000000',

    bubbleBackground: {
        own: '#f5f5f5',
        other: '#ffffff'
    },
    bubbleBorder: {
        own: '#e0e0e0',
        other: '#e0e0e0'
    },

    waveformActive: '#000000',
    waveformInactive: '#cccccc',
    waveformHover: '#666666',

    playButtonBackground: '#000000',
    playButtonColor: '#ffffff',
    controlsColor: '#666666',

    progressActive: '#000000',
    progressInactive: '#cccccc',

    glassmorphism: false,
    borderRadius: 8,
    shadows: false
};

/**
 * Generate Material-UI theme overrides for voice message components
 */
export const generateVoiceMessageThemeOverrides = (
    config: VoiceMessageThemeConfig,
    baseTheme: Theme
) => {
    return {
        MuiPaper: {
            styleOverrides: {
                root: {
                    '&.voice-message-bubble': {
                        backgroundColor: config.bubbleBackground?.own || baseTheme.palette.primary.main,
                        border: `1px solid ${config.bubbleBorder?.own || baseTheme.palette.divider}`,
                        borderRadius: config.borderRadius || 12,
                        backdropFilter: config.glassmorphism ? 'blur(10px)' : 'none',
                        boxShadow: config.shadows ? baseTheme.shadows[2] : 'none',

                        '&.other-message': {
                            backgroundColor: config.bubbleBackground?.other || baseTheme.palette.background.paper,
                            border: `1px solid ${config.bubbleBorder?.other || baseTheme.palette.divider}`,
                        }
                    }
                }
            }
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    '&.voice-message-play-button': {
                        backgroundColor: config.playButtonBackground || baseTheme.palette.primary.main,
                        color: config.playButtonColor || baseTheme.palette.primary.contrastText,
                        '&:hover': {
                            backgroundColor: alpha(config.playButtonBackground || baseTheme.palette.primary.main, 0.8),
                        }
                    },
                    '&.voice-message-control': {
                        color: config.controlsColor || baseTheme.palette.text.secondary,
                        '&:hover': {
                            color: config.primaryColor || baseTheme.palette.primary.main,
                        }
                    }
                }
            }
        },
        MuiSlider: {
            styleOverrides: {
                root: {
                    '&.voice-message-progress': {
                        '& .MuiSlider-track': {
                            backgroundColor: config.progressActive || baseTheme.palette.primary.main,
                        },
                        '& .MuiSlider-rail': {
                            backgroundColor: config.progressInactive || alpha(baseTheme.palette.text.secondary, 0.2),
                        },
                        '& .MuiSlider-thumb': {
                            backgroundColor: config.progressActive || baseTheme.palette.primary.main,
                        }
                    }
                }
            }
        }
    };
};

/**
 * Custom CSS variables for voice message components
 */
export const generateVoiceMessageCSSVariables = (config: VoiceMessageThemeConfig) => {
    return {
        '--voice-message-primary': config.primaryColor || '#667eea',
        '--voice-message-secondary': config.secondaryColor || '#764ba2',
        '--voice-message-background': config.backgroundColor || '#ffffff',
        '--voice-message-text': config.textColor || '#333333',

        '--voice-message-bubble-own': config.bubbleBackground?.own || 'rgba(102, 126, 234, 0.1)',
        '--voice-message-bubble-other': config.bubbleBackground?.other || 'rgba(255, 255, 255, 0.8)',
        '--voice-message-border-own': config.bubbleBorder?.own || 'rgba(102, 126, 234, 0.2)',
        '--voice-message-border-other': config.bubbleBorder?.other || 'rgba(0, 0, 0, 0.1)',

        '--voice-message-waveform-active': config.waveformActive || '#667eea',
        '--voice-message-waveform-inactive': config.waveformInactive || 'rgba(0, 0, 0, 0.3)',
        '--voice-message-waveform-hover': config.waveformHover || 'rgba(102, 126, 234, 0.8)',

        '--voice-message-play-bg': config.playButtonBackground || '#667eea',
        '--voice-message-play-color': config.playButtonColor || '#ffffff',
        '--voice-message-controls': config.controlsColor || 'rgba(0, 0, 0, 0.7)',

        '--voice-message-progress-active': config.progressActive || '#667eea',
        '--voice-message-progress-inactive': config.progressInactive || 'rgba(0, 0, 0, 0.2)',

        '--voice-message-border-radius': `${config.borderRadius || 12}px`,
        '--voice-message-backdrop-filter': config.glassmorphism ? 'blur(10px)' : 'none',
    };
};

/**
 * Apply theme configuration to voice message components
 */
export const applyVoiceMessageTheme = (
    config: VoiceMessageThemeConfig = defaultVoiceMessageTheme
) => {
    const cssVariables = generateVoiceMessageCSSVariables(config);

    // Apply CSS variables to document root
    const root = document.documentElement;
    Object.entries(cssVariables).forEach(([property, value]) => {
        root.style.setProperty(property, value);
    });

    return cssVariables;
};

/**
 * Predefined theme presets
 */
export const voiceMessageThemePresets = {
    default: defaultVoiceMessageTheme,
    dark: darkVoiceMessageTheme,
    minimal: minimalVoiceMessageTheme,

    // Additional presets
    ocean: {
        ...defaultVoiceMessageTheme,
        primaryColor: '#0077be',
        secondaryColor: '#00a8cc',
        waveformActive: '#0077be',
        playButtonBackground: '#0077be',
        progressActive: '#0077be',
    } as VoiceMessageThemeConfig,

    forest: {
        ...defaultVoiceMessageTheme,
        primaryColor: '#2d5a27',
        secondaryColor: '#4a7c59',
        waveformActive: '#2d5a27',
        playButtonBackground: '#2d5a27',
        progressActive: '#2d5a27',
    } as VoiceMessageThemeConfig,

    sunset: {
        ...defaultVoiceMessageTheme,
        primaryColor: '#ff6b35',
        secondaryColor: '#f7931e',
        waveformActive: '#ff6b35',
        playButtonBackground: '#ff6b35',
        progressActive: '#ff6b35',
    } as VoiceMessageThemeConfig,

    purple: {
        ...defaultVoiceMessageTheme,
        primaryColor: '#8e44ad',
        secondaryColor: '#9b59b6',
        waveformActive: '#8e44ad',
        playButtonBackground: '#8e44ad',
        progressActive: '#8e44ad',
    } as VoiceMessageThemeConfig,
};

/**
 * Hook for using voice message theme
 */
export const useVoiceMessageTheme = (themeName: keyof typeof voiceMessageThemePresets = 'default') => {
    const config = voiceMessageThemePresets[themeName];

    React.useEffect(() => {
        applyVoiceMessageTheme(config);
    }, [config]);

    return {
        config,
        applyTheme: (customConfig: VoiceMessageThemeConfig) => applyVoiceMessageTheme(customConfig),
        presets: voiceMessageThemePresets
    };
};

const voiceMessageTheme = {
    defaultVoiceMessageTheme,
    darkVoiceMessageTheme,
    minimalVoiceMessageTheme,
    voiceMessageThemePresets,
    generateVoiceMessageThemeOverrides,
    generateVoiceMessageCSSVariables,
    applyVoiceMessageTheme,
    useVoiceMessageTheme
};

export default voiceMessageTheme;