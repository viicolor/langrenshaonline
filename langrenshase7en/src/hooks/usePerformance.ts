import { useCallback, useRef, useEffect, useState } from 'react';

export interface VirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export interface VirtualScrollResult {
  visibleItems: Array<{ index: number; offsetTop: number }>;
  totalHeight: number;
  scrollTop: number;
  scrollRef: React.RefObject<HTMLDivElement>;
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}

export function useVirtualScroll(options: VirtualScrollOptions): VirtualScrollResult {
  const { itemCount, itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalHeight = itemCount * itemHeight;

  const visibleItems = useCallback(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const items: Array<{ index: number; offsetTop: number }> = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        offsetTop: i * itemHeight,
      });
    }

    return items;
  }, [scrollTop, itemHeight, containerHeight, overscan, itemCount]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  return {
    visibleItems: visibleItems(),
    totalHeight,
    scrollTop,
    scrollRef,
    handleScroll,
  };
}

export interface LazyLoadOptions<T> {
  items: T[];
  batchSize?: number;
  threshold?: number;
}

export function useLazyLoad<T>(options: LazyLoadOptions<T>) {
  const { items, batchSize = 20, threshold = 0.8 } = options;
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialBatch = items.slice(0, batchSize);
    setVisibleItems(initialBatch);
    setLoadedCount(batchSize);
  }, [items, batchSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const nextBatch = items.slice(loadedCount, loadedCount + batchSize);
            if (nextBatch.length > 0) {
              setVisibleItems((prev) => [...prev, ...nextBatch]);
              setLoadedCount((prev) => prev + nextBatch.length);
            }
          }
        });
      },
      {
        threshold,
      }
    );

    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    container.appendChild(sentinel);
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      if (container.contains(sentinel)) {
        container.removeChild(sentinel);
      }
    };
  }, [items, loadedCount, batchSize, threshold]);

  return {
    visibleItems,
    hasMore: loadedCount < items.length,
    containerRef,
  };
}

export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        callback(...args);
        lastCallRef.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastCallRef.current = Date.now();
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  );
}

export function useMemoizedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

export function useOptimizedEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList,
  options?: { maxWait?: number }
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastDepsRef = useRef<React.DependencyList>();

  useEffect(() => {
    const hasDepsChanged = deps.some(
      (dep, i) => dep !== lastDepsRef.current?.[i]
    );

    if (!hasDepsChanged) return;

    lastDepsRef.current = deps;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      effect();
    }, options?.maxWait || 0);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [effect, deps, options?.maxWait]);
}
