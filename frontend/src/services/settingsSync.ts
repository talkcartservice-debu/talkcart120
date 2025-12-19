// Simple settings sync service for theme and privacy contexts
import api from '@/lib/api';

export const syncSettings = {
  async load() {
    // Load settings from backend
    try {
      const response: any = await api.auth.getSettings();
      if (response && response.success) {
        return response.data || {};
      }
      return {};
    } catch (error) {
      console.warn('Failed to load settings from backend:', error);
      return {};
    }
  },

  async theme(settings: any, options?: any) {
    // Sync theme settings to backend
    try {
      const response: any = await api.auth.updateSettings('theme', settings);
      if (response && !response.success) {
        throw new Error(`Failed to sync theme settings: ${response.message || 'Unknown error'}`);
      }
      return response;
    } catch (error) {
      console.warn('Failed to sync theme settings:', error);
      if (options?.retryOnFailure) {
        // Retry logic could be implemented here
      }
      throw error;
    }
  },
  async privacy(settings: any, options?: { retryOnFailure?: boolean }) {
    // Sync privacy settings to backend
    try {
      const response: any = await api.auth.updateSettings('privacy', settings);
      if (response && !response.success) {
        throw new Error(`Failed to sync privacy settings: ${response.message || 'Unknown error'}`);
      }
      return response;
    } catch (error) {
      console.warn('Failed to sync privacy settings:', error);
      if (options?.retryOnFailure) {
        // Retry logic could be implemented here
      }
      throw error;
    }
  },

  async interaction(settings: any, options?: { retryOnFailure?: boolean }) {
    // Sync interaction settings to backend
    try {
      const response: any = await api.auth.updateSettings('interaction', settings);
      if (response && !response.success) {
        throw new Error(`Failed to sync interaction settings: ${response.message || 'Unknown error'}`);
      }
      return response;
    } catch (error) {
      console.warn('Failed to sync interaction settings:', error);
      if (options?.retryOnFailure) {
        // Retry logic could be implemented here
      }
      throw error;
    }
  },
  
  async language(settings: any, options?: { retryOnFailure?: boolean }) {
    // Sync language settings to backend as part of theme settings
    try {
      const response: any = await api.auth.updateSettings('theme', settings);
      if (response && !response.success) {
        throw new Error(`Failed to sync language settings: ${response.message || 'Unknown error'}`);
      }
      return response;
    } catch (error) {
      console.warn('Failed to sync language settings:', error);
      if (options?.retryOnFailure) {
        // Retry logic could be implemented here
      }
      throw error;
    }
  },
  
  async wallet(settings: any, options?: { retryOnFailure?: boolean }) {
    // Sync wallet settings to backend
    try {
      const response: any = await api.auth.updateSettings('wallet', settings);
      if (response && !response.success) {
        throw new Error(`Failed to sync wallet settings: ${response.message || 'Unknown error'}`);
      }
      return response;
    } catch (error) {
      console.warn('Failed to sync wallet settings:', error);
      if (options?.retryOnFailure) {
        // Retry logic could be implemented here
      }
      throw error;
    }
  },
  
  async security(settings: any, options?: { retryOnFailure?: boolean }) {
    // Sync security settings to backend
    try {
      const response: any = await api.auth.updateSettings('security', settings);
      if (response && !response.success) {
        throw new Error(`Failed to sync security settings: ${response.message || 'Unknown error'}`);
      }
      return response;
    } catch (error) {
      console.warn('Failed to sync security settings:', error);
      if (options?.retryOnFailure) {
        // Retry logic could be implemented here
      }
      throw error;
    }
  },
  
  async appearance(settings: any, options?: { retryOnFailure?: boolean }) {
    // Sync appearance settings to backend as part of theme settings
    try {
      const response: any = await api.auth.updateSettings('theme', settings);
      if (response && !response.success) {
        throw new Error(`Failed to sync appearance settings: ${response.message || 'Unknown error'}`);
      }
      return response;
    } catch (error) {
      console.warn('Failed to sync appearance settings:', error);
      if (options?.retryOnFailure) {
        // Retry logic could be implemented here
      }
      throw error;
    }
  },};