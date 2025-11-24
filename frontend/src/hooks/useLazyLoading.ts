import { useState, useEffect, useRef } from 'react';

interface LazyLoadingResult {
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
  hasLoaded: boolean;
}

interface UseLazyLoadingOptions {
  enableLazyLoading: boolean;
}

export function useLazyLoading(threshold = 0.1, settings: UseLazyLoadingOptions): LazyLoadingResult {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !settings.enableLazyLoading) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.unobserve(element);
        }
      },
      {
        threshold,
        rootMargin: '50px',
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, hasLoaded, settings.enableLazyLoading]);

  return {
    ref: elementRef,
    isVisible: settings.enableLazyLoading ? isVisible : true,
    hasLoaded,
  };
}