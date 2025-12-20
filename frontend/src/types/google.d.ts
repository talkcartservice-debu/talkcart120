// Type definitions for Google Identity Services
interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: { credential: string }) => void;
        }) => void;
        prompt: (callback?: (notification: {
          isDisplayMoment: () => boolean;
          isDisplayed: () => boolean;
          isNotDisplayed: () => boolean;
          getNotDisplayedReason: () => string;
          isSkipped: () => boolean;
          getSkippedReason: () => string;
          isDismissed: () => boolean;
          getDismissedReason: () => string;
        }) => void) => void;
        renderButton: (
          parent: HTMLElement,
          options: {
            type?: string;
            theme?: string;
            size?: string;
            text?: string;
            shape?: string;
            logo_alignment?: string;
            width?: number;
            locale?: string;
          }
        ) => void;
      };
    };
  };
}