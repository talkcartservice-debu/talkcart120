// Simple settings sync service for theme and privacy contexts
export const syncSettings = {
  async load() {
    // Load settings from backend
    try {
      const response = await fetch('/api/auth/settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data || {};
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
      const response = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          settingType: 'theme',
          settings
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync theme settings: ${response.statusText}`);
      }
      
      return await response.json();
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
      const response = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          settingType: 'privacy',
          settings
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync privacy settings: ${response.statusText}`);
      }
      
      return await response.json();
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
      const response = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          settingType: 'interaction',
          settings
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync interaction settings: ${response.statusText}`);
      }
      
      return await response.json();
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
      const response = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          settingType: 'theme',
          settings
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync language settings: ${response.statusText}`);
      }
      
      return await response.json();
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
      const response = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          settingType: 'wallet',
          settings
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync wallet settings: ${response.statusText}`);
      }
      
      return await response.json();
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
      const response = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          settingType: 'security',
          settings
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync security settings: ${response.statusText}`);
      }
      
      return await response.json();
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
      const response = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          settingType: 'theme',
          settings
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync appearance settings: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Failed to sync appearance settings:', error);
      if (options?.retryOnFailure) {
        // Retry logic could be implemented here
      }
      throw error;
    }
  },
};