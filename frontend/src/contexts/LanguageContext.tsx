import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncSettings } from '@/services/settingsSync';
import { useSafeAuth } from '@/hooks/useSafeAuth';

// Expanded language support to match the platform's 10+ languages
export type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ja' | 'ko' | 'zh' | 'ar';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

// Expanded translation function with more comprehensive translations
const translations: Record<string, Record<string, string>> = {
  en: {
    'social.feed': 'Social Feed',
    'post.create': 'Create Post',
    'post.like': 'Like',
    'post.comment': 'Comment',
    'post.share': 'Share',
    'post.bookmark': 'Bookmark',
    'settings.theme': 'Theme',
    'settings.fontSize': 'Font Size',
    'settings.language': 'Language',
    'settings.reducedMotion': 'Reduced Motion',
    'settings.reducedMotion.description': 'Reduce motion and animation for better performance',
    'settings.highContrast': 'High Contrast',
    'settings.highContrast.description': 'Increase contrast for better visibility',
    // Chatbot specific translations
    'chatbot.adminSupport': 'Admin Support',
    'chatbot.typeMessage': 'Type your message...',
    'chatbot.send': 'Send',
    'chatbot.refresh': 'Refresh',
    'chatbot.close': 'Close',
    'chatbot.searchMessages': 'Search messages...',
    'chatbot.chatHistory': 'Chat History',
    'chatbot.noChatHistory': 'No chat history yet',
    'chatbot.welcomeMessage': 'Welcome to Admin Support Chat',
    'chatbot.sendMessageToGetHelp': 'Send a message to get help with your vendor account',
    'chatbot.startConversation': 'Start Conversation',
    'chatbot.exportChat': 'Export Chat',
    'chatbot.notificationsOn': 'Disable notifications',
    'chatbot.notificationsOff': 'Enable notifications',
    'chatbot.search': 'Search Messages',
    'chatbot.history': 'Chat History',
    'chatbot.admin': 'Admin',
    'chatbot.you': 'You',
    'chatbot.isTyping': 'is typing',
    'chatbot.exportJson': 'Export as JSON',
    'chatbot.exportCsv': 'Export as CSV',
    'chatbot.messages': 'Messages',
    'chatbot.messageInput': 'Message input',
    'chatbot.attachFile': 'Attach file',
    'chatbot.messageStatus.sent': 'Sent',
    'chatbot.messageStatus.delivered': 'Delivered',
    'chatbot.messageStatus.read': 'Read',
    'chatbot.offline': 'You are currently offline',
    'chatbot.online': 'You are back online',
    'chatbot.syncing': 'Syncing messages...',
  },
  es: {
    'social.feed': 'Feed Social',
    'post.create': 'Crear Publicación',
    'post.like': 'Me Gusta',
    'post.comment': 'Comentar',
    'post.share': 'Compartir',
    'post.bookmark': 'Guardar',
    'settings.theme': 'Tema',
    'settings.fontSize': 'Tamaño de Fuente',
    'settings.language': 'Idioma',
    'settings.reducedMotion': 'Movimiento Reducido',
    'settings.reducedMotion.description': 'Reducir movimiento y animación para mejor rendimiento',
    'settings.highContrast': 'Alto Contraste',
    'settings.highContrast.description': 'Aumentar contraste para mejor visibilidad',
    // Chatbot specific translations
    'chatbot.adminSupport': 'Soporte Administrativo',
    'chatbot.typeMessage': 'Escribe tu mensaje...',
    'chatbot.send': 'Enviar',
    'chatbot.refresh': 'Actualizar',
    'chatbot.close': 'Cerrar',
    'chatbot.searchMessages': 'Buscar mensajes...',
    'chatbot.chatHistory': 'Historial de Chat',
    'chatbot.noChatHistory': 'Aún no hay historial de chat',
    'chatbot.welcomeMessage': 'Bienvenido al Chat de Soporte Administrativo',
    'chatbot.sendMessageToGetHelp': 'Envía un mensaje para obtener ayuda con tu cuenta de vendedor',
    'chatbot.startConversation': 'Iniciar Conversación',
    'chatbot.exportChat': 'Exportar Chat',
    'chatbot.notificationsOn': 'Deshabilitar notificaciones',
    'chatbot.notificationsOff': 'Habilitar notificaciones',
    'chatbot.search': 'Buscar Mensajes',
    'chatbot.history': 'Historial de Chat',
    'chatbot.admin': 'Administrador',
    'chatbot.you': 'Tú',
    'chatbot.isTyping': 'está escribiendo',
    'chatbot.exportJson': 'Exportar como JSON',
    'chatbot.exportCsv': 'Exportar como CSV',
    'chatbot.messages': 'Mensajes',
    'chatbot.messageInput': 'Entrada de mensaje',
    'chatbot.attachFile': 'Adjuntar archivo',
    'chatbot.messageStatus.sent': 'Enviado',
    'chatbot.messageStatus.delivered': 'Entregado',
    'chatbot.messageStatus.read': 'Leído',
    'chatbot.offline': 'Actualmente estás desconectado',
    'chatbot.online': 'Has vuelto a estar en línea',
    'chatbot.syncing': 'Sincronizando mensajes...',
  },
  fr: {
    'social.feed': 'Fil Social',
    'post.create': 'Créer un Post',
    'post.like': 'J\'aime',
    'post.comment': 'Commenter',
    'post.share': 'Partager',
    'post.bookmark': 'Enregistrer',
    'settings.theme': 'Thème',
    'settings.fontSize': 'Taille de Police',
    'settings.language': 'Langue',
    'settings.reducedMotion': 'Mouvement Réduit',
    'settings.reducedMotion.description': 'Réduire les mouvements et animations pour de meilleures performances',
    'settings.highContrast': 'Contraste Élevé',
    'settings.highContrast.description': 'Augmenter le contraste pour une meilleure visibilité',
    // Chatbot specific translations
    'chatbot.adminSupport': 'Support Administratif',
    'chatbot.typeMessage': 'Tapez votre message...',
    'chatbot.send': 'Envoyer',
    'chatbot.refresh': 'Actualiser',
    'chatbot.close': 'Fermer',
    'chatbot.searchMessages': 'Rechercher des messages...',
    'chatbot.chatHistory': 'Historique du Chat',
    'chatbot.noChatHistory': 'Aucun historique de chat pour le moment',
    'chatbot.welcomeMessage': 'Bienvenue dans le Chat de Support Administratif',
    'chatbot.sendMessageToGetHelp': 'Envoyez un message pour obtenir de l\'aide avec votre compte vendeur',
    'chatbot.startConversation': 'Démarrer la Conversation',
    'chatbot.exportChat': 'Exporter le Chat',
    'chatbot.notificationsOn': 'Désactiver les notifications',
    'chatbot.notificationsOff': 'Activer les notifications',
    'chatbot.search': 'Rechercher des Messages',
    'chatbot.history': 'Historique du Chat',
    'chatbot.admin': 'Administrateur',
    'chatbot.you': 'Vous',
    'chatbot.isTyping': 'est en train d\'écrire',
    'chatbot.exportJson': 'Exporter en JSON',
    'chatbot.exportCsv': 'Exporter en CSV',
    'chatbot.messages': 'Messages',
    'chatbot.messageInput': 'Saisie du message',
    'chatbot.attachFile': 'Joindre un fichier',
    'chatbot.messageStatus.sent': 'Envoyé',
    'chatbot.messageStatus.delivered': 'Livré',
    'chatbot.messageStatus.read': 'Lu',
    'chatbot.offline': 'Vous êtes actuellement hors ligne',
    'chatbot.online': 'Vous êtes de nouveau en ligne',
    'chatbot.syncing': 'Synchronisation des messages...',
  },
  de: {
    'social.feed': 'Soziales Feed',
    'post.create': 'Beitrag erstellen',
    'post.like': 'Gefällt mir',
    'post.comment': 'Kommentieren',
    'post.share': 'Teilen',
    'post.bookmark': 'Speichern',
    'settings.theme': 'Design',
    'settings.fontSize': 'Schriftgröße',
    'settings.language': 'Sprache',
    'settings.reducedMotion': 'Reduzierte Bewegung',
    'settings.reducedMotion.description': 'Bewegung und Animation reduzieren für bessere Leistung',
    'settings.highContrast': 'Hoher Kontrast',
    'settings.highContrast.description': 'Kontrast erhöhen für bessere Sichtbarkeit',
    // Chatbot specific translations
    'chatbot.adminSupport': 'Administrator-Support',
    'chatbot.typeMessage': 'Nachricht eingeben...',
    'chatbot.send': 'Senden',
    'chatbot.refresh': 'Aktualisieren',
    'chatbot.close': 'Schließen',
    'chatbot.searchMessages': 'Nachrichten suchen...',
    'chatbot.chatHistory': 'Chat-Verlauf',
    'chatbot.noChatHistory': 'Noch kein Chat-Verlauf',
    'chatbot.welcomeMessage': 'Willkommen im Administrator-Support-Chat',
    'chatbot.sendMessageToGetHelp': 'Senden Sie eine Nachricht, um Hilfe zu Ihrem Verkäuferkonto zu erhalten',
    'chatbot.startConversation': 'Unterhaltung starten',
    'chatbot.exportChat': 'Chat exportieren',
    'chatbot.notificationsOn': 'Benachrichtigungen deaktivieren',
    'chatbot.notificationsOff': 'Benachrichtigungen aktivieren',
    'chatbot.search': 'Nachrichten suchen',
    'chatbot.history': 'Chat-Verlauf',
    'chatbot.admin': 'Administrator',
    'chatbot.you': 'Sie',
    'chatbot.isTyping': 'tippt gerade',
    'chatbot.exportJson': 'Als JSON exportieren',
    'chatbot.exportCsv': 'Als CSV exportieren',
    'chatbot.messages': 'Nachrichten',
    'chatbot.messageInput': 'Nachrichteneingabe',
    'chatbot.attachFile': 'Datei anhängen',
    'chatbot.messageStatus.sent': 'Gesendet',
    'chatbot.messageStatus.delivered': 'Zugestellt',
    'chatbot.messageStatus.read': 'Gelesen',
    'chatbot.offline': 'Sie sind derzeit offline',
    'chatbot.online': 'Sie sind wieder online',
    'chatbot.syncing': 'Nachrichten werden synchronisiert...',
  },
  // Additional languages would be added here
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState('en');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Safely get auth context - it might not be available during initial render
  const { isAuthenticated, user } = useSafeAuth();

  // Load saved language preference
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // First, try to load from localStorage for immediate UI update
        const savedLanguage = localStorage.getItem('vetora-language');
        if (savedLanguage && ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'].includes(savedLanguage)) {
          setLanguageState(savedLanguage);
        }

        // If authenticated, load from backend and sync
        if (isAuthenticated && user) {
          try {
            const backendSettings = await syncSettings.load();
            if (backendSettings?.theme?.language) {
              const backendLanguage = backendSettings.theme.language;
              if (['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'].includes(backendLanguage)) {
                setLanguageState(backendLanguage);
                // Update localStorage with backend data
                localStorage.setItem('vetora-language', backendLanguage);
              }
            }
          } catch (backendError: any) {
            // Silently handle backend connection errors during development
            if (backendError?.code !== 'ECONNREFUSED') {
              console.warn('Failed to sync language settings:', backendError?.message);
            }
          }
        }
      } catch (error: any) {
        // Only log non-connection errors
        if (error?.code !== 'ECONNREFUSED') {
          console.warn('Failed to load language preference:', error?.message);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, [isAuthenticated, user]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('vetora-language', lang);
      
      // Sync with backend if authenticated
      if (isAuthenticated && user && isLoaded) {
        syncSettings.language({ language: lang }, { retryOnFailure: true });
      }
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || key;
  };

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};