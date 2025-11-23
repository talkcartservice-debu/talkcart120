import { createTheme } from '@mui/material/styles';
import { lightTheme, darkTheme } from '../theme';
import { generateVoiceMessageThemeOverrides, defaultVoiceMessageTheme, darkVoiceMessageTheme } from '@/styles/voiceMessageTheme';

// Enhanced light theme with voice message support
export const enhancedLightTheme = createTheme({
    ...lightTheme,
    components: {
        ...lightTheme.components,
        ...generateVoiceMessageThemeOverrides({
            ...defaultVoiceMessageTheme,
            primaryColor: lightTheme.palette.primary.main,
            secondaryColor: lightTheme.palette.secondary.main,
            backgroundColor: lightTheme.palette.background.default,
            textColor: lightTheme.palette.text.primary,
        }, lightTheme),
    },
});

// Enhanced dark theme with voice message support
export const enhancedDarkTheme = createTheme({
    ...darkTheme,
    components: {
        ...darkTheme.components,
        ...generateVoiceMessageThemeOverrides({
            ...darkVoiceMessageTheme,
            primaryColor: darkTheme.palette.primary.main,
            secondaryColor: darkTheme.palette.secondary.main,
            backgroundColor: darkTheme.palette.background.default,
            textColor: darkTheme.palette.text.primary,
        }, darkTheme),
    },
});

export default {
    light: enhancedLightTheme,
    dark: enhancedDarkTheme,
};