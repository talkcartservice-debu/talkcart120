// Simple i18n service for chatbot translations
class I18nService {
  private currentLanguage: string = 'en';
  private translations: Record<string, any> = {};

  async loadTranslations(language: string) {
    try {
      // Dynamically import the translation file
      const module = await import(`../locales/chatbot_${language}.json`);
      this.translations = module.default || module;
      this.currentLanguage = language;
      console.log(`Loaded translations for language: ${language}`);
    } catch (error) {
      console.error(`Failed to load translations for language: ${language}`, error);
      // Fallback to English
      if (language !== 'en') {
        await this.loadTranslations('en');
      }
    }
  }

  t(key: string, params?: Record<string, any>): string {
    // Navigate through the translation object using the key
    const keys = key.split('.');
    let value: any = this.translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return the key if translation not found
        return key;
      }
    }
    
    // Handle parameter replacement if provided
    if (params && typeof value === 'string') {
      let result = value;
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }
      return result;
    }
    
    return value as string;
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  async setLanguage(language: string) {
    await this.loadTranslations(language);
  }
}

// Create singleton instance
const i18nService = new I18nService();

// Load default language (English)
i18nService.loadTranslations('en');

export default i18nService;