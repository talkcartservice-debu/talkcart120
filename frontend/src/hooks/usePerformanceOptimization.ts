import { useState, useEffect, useCallback, useRef } from 'react';
import { useLazyLoading } from './useLazyLoading';

export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  fps: number;
  bundleSize: number;
  networkLatency: number;
  cacheHitRate: number;
}

export interface OptimizationSettings {
  enableLazyLoading: boolean;
  enableVirtualization: boolean;
  enableImageOptimization: boolean;
  enableCodeSplitting: boolean;
  enableServiceWorker: boolean;
  enablePreloading: boolean;
  maxConcurrentRequests: number;
  cacheStrategy: 'aggressive' | 'conservative' | 'disabled';
}

export function usePerformanceOptimization() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    fps: 60,
    bundleSize: 0,
    networkLatency: 0,
    cacheHitRate: 0,
  });

  const [settings, setSettings] = useState<OptimizationSettings>({
    enableLazyLoading: true,
    enableVirtualization: true,
    enableImageOptimization: true,
    enableCodeSplitting: true,
    enableServiceWorker: true,
    enablePreloading: true,
    maxConcurrentRequests: 6,
    cacheStrategy: 'aggressive',
  });

  const renderStartTime = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);

  // Monitor render performance
  useEffect(() => {
    const measureRenderTime = () => {
      renderStartTime.current = performance.now();
    };

    const measureRenderComplete = () => {
      if (renderStartTime.current > 0) {
        const renderTime = performance.now() - renderStartTime.current;
        setMetrics(prev => ({ ...prev, renderTime }));
      }
    };

    // Use React's profiler API if available
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name.includes('React')) {
            setMetrics(prev => ({ ...prev, renderTime: entry.duration }));
          }
        });
      });

      observer.observe({ entryTypes: ['measure'] });

      return () => observer.disconnect();
    }

    // Fallback to manual measurement
    measureRenderTime();
    requestAnimationFrame(measureRenderComplete);
    
    // Explicitly return undefined for the else path
    return undefined;
  }, []);

  // Monitor FPS
  useEffect(() => {
    let animationId: number;

    const measureFPS = (timestamp: number) => {
      if (lastFrameTime.current > 0) {
        const delta = timestamp - lastFrameTime.current;
        const fps = 1000 / delta;
        frameCount.current++;

        if (frameCount.current % 60 === 0) { // Update every 60 frames
          setMetrics(prev => ({ ...prev, fps: Math.round(fps) }));
        }
      }
      lastFrameTime.current = timestamp;
      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(animationId);
  }, []);

  // Monitor memory usage
  useEffect(() => {
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        setMetrics(prev => ({ ...prev, memoryUsage }));
      }
    };

    measureMemory();
    const interval = setInterval(measureMemory, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Lazy loading utility
  const lazyLoading = useLazyLoading(0.1, { enableLazyLoading: settings.enableLazyLoading });

  // Image optimization
  const optimizeImage = useCallback((src: string, width?: number, height?: number) => {
    if (!settings.enableImageOptimization) return src;

    // Add image optimization parameters
    const url = new URL(src, window.location.origin);
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', '80'); // Quality
    url.searchParams.set('f', 'webp'); // Format

    return url.toString();
  }, [settings.enableImageOptimization]);

  // Preload critical resources
  const preloadResource = useCallback((href: string, as: string, type?: string) => {
    if (!settings.enablePreloading) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;

    document.head.appendChild(link);

    // Clean up after 30 seconds
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    }, 30000);
  }, [settings.enablePreloading]);

  // Bundle size monitoring
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        let totalSize = 0;

        entries.forEach((entry) => {
          if (entry.entryType === 'resource' && entry.name.includes('.js')) {
            totalSize += (entry as any).transferSize || 0;
          }
        });

        if (totalSize > 0) {
          setMetrics(prev => ({ ...prev, bundleSize: totalSize }));
        }
      });

      observer.observe({ entryTypes: ['resource'] });

      return () => observer.disconnect();
    }
    
    // Explicitly return undefined for the else path
    return undefined;
  }, []);

  // Network latency monitoring
  const measureNetworkLatency = useCallback(async (url: string) => {
    const start = performance.now();
    try {
      await fetch(url, { method: 'HEAD' });
      const latency = performance.now() - start;
      setMetrics(prev => ({ ...prev, networkLatency: latency }));
      return latency;
    } catch (error) {
      console.warn('Failed to measure network latency:', error);
      return -1;
    }
  }, []);

  // Cache management
  const cacheManager = {
    set: (key: string, data: any, ttl = 300000) => { // 5 minutes default
      if (settings.cacheStrategy === 'disabled') return;

      const item = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(item));
      } catch (error) {
        console.warn('Failed to cache data:', error);
      }
    },

    get: (key: string) => {
      if (settings.cacheStrategy === 'disabled') return null;

      try {
        const item = localStorage.getItem(`cache_${key}`);
        if (!item) return null;

        const parsed = JSON.parse(item);
        const isExpired = Date.now() - parsed.timestamp > parsed.ttl;

        if (isExpired) {
          localStorage.removeItem(`cache_${key}`);
          return null;
        }

        // Update cache hit rate
        setMetrics(prev => ({
          ...prev,
          cacheHitRate: prev.cacheHitRate + 1,
        }));

        return parsed.data;
      } catch (error) {
        console.warn('Failed to retrieve cached data:', error);
        return null;
      }
    },

    clear: () => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
      keys.forEach(key => localStorage.removeItem(key));
    },
  };

  // Performance recommendations
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = [];

    if (metrics.renderTime > 16) { // 60fps = 16ms per frame
      recommendations.push('Consider optimizing render performance - renders are taking longer than 16ms');
    }

    if (metrics.memoryUsage > 80) {
      recommendations.push('High memory usage detected - consider implementing memory cleanup');
    }

    if (metrics.fps < 30) {
      recommendations.push('Low FPS detected - consider reducing animations or enabling performance mode');
    }

    if (metrics.bundleSize > 1000000) { // 1MB
      recommendations.push('Large bundle size detected - consider code splitting');
    }

    if (metrics.networkLatency > 1000) { // 1 second
      recommendations.push('High network latency detected - consider enabling aggressive caching');
    }

    return recommendations;
  }, [metrics]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<OptimizationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return {
    metrics,
    settings,
    useLazyLoading: () => lazyLoading,
    optimizeImage,
    preloadResource,
    measureNetworkLatency,
    cacheManager,
    getPerformanceRecommendations,
    updateSettings,
  };
}

// Intersection Observer hook
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsIntersecting(entry.isIntersecting);
        }
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return { isIntersecting };
}
