import React, { Suspense, lazy, ComponentType } from 'react';
import { Box, Skeleton, CircularProgress } from '@mui/material';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  height?: number | string;
  width?: number | string;
  skeletonVariant?: 'text' | 'rectangular' | 'rounded' | 'circular';
}

export function LazyComponent({
  children,
  fallback,
  threshold = 0.1,
  height = 200,
  width = '100%',
  skeletonVariant = 'rectangular',
}: LazyComponentProps) {
  const { useLazyLoading } = usePerformanceOptimization();
  const { ref, isVisible } = useLazyLoading(threshold);

  const defaultFallback = (
    <Box sx={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Skeleton
        variant={skeletonVariant}
        width={width}
        height={height}
        sx={{ borderRadius: skeletonVariant === 'rounded' ? 2 : 0 }}
      />
    </Box>
  );

  return (
    <Box ref={ref} sx={{ width, height: isVisible ? 'auto' : height }}>
      {isVisible ? children : (fallback || defaultFallback)}
    </Box>
  );
}

// HOC for lazy loading components
export function withLazyLoading<P>(
  Component: ComponentType<P>,
  loadingComponent?: React.ComponentType
) {
  const LazyWrappedComponent: React.FC<P> = (props) => {
    const { useLazyLoading } = usePerformanceOptimization();
    const { ref: lazyRef, isVisible } = useLazyLoading();

    const LoadingComponent = loadingComponent || (() => (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    ));

    return (
      <div ref={lazyRef}>
        {isVisible ? <Component {...(props as any)} /> : <LoadingComponent />}
      </div>
    );
  };

  LazyWrappedComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;

  return LazyWrappedComponent;
}

// Utility for creating lazy-loaded route components
export function createLazyRoute(importFn: () => Promise<{ default: ComponentType<any> }>) {
  const LazyComponent = lazy(importFn);

  return function LazyRoute(props: any) {
    return (
      <Suspense
        fallback={
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '50vh',
            }}
          >
            <CircularProgress size={48} />
          </Box>
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Optimized image component with lazy loading
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  style,
  onLoad,
  onError,
  priority = false,
}: OptimizedImageProps) {
  const { useLazyLoading, optimizeImage } = usePerformanceOptimization();
  const { ref, isVisible } = useLazyLoading();

  const optimizedSrc = optimizeImage(src, width, height);

  // For priority images, load immediately
  if (priority) {
    return (
      <img
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={style}
        onLoad={onLoad}
        onError={onError}
        loading="eager"
      />
    );
  }

  return (
    <div ref={ref} style={{ width, height, ...style }} className={className}>
      {isVisible ? (
        <img
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onLoad={onLoad}
          onError={onError}
          loading="lazy"
        />
      ) : (
        <Skeleton
          variant="rectangular"
          width={width || '100%'}
          height={height || 200}
          sx={{ borderRadius: 1 }}
        />
      )}
    </div>
  );
}

// Virtual list component for large datasets
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  return (
    <Box
      sx={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      {/* Total height spacer */}
      <Box sx={{ height: items.length * itemHeight, position: 'relative' }}>
        {/* Visible items */}
        <Box
          sx={{
            position: 'absolute',
            top: startIndex * itemHeight,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <Box
              key={startIndex + index}
              sx={{
                height: itemHeight,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {renderItem(item, startIndex + index)}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default LazyComponent;
