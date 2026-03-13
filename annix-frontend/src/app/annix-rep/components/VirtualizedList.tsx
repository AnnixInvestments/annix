"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { FixedSizeList, type ListChildComponentProps } from "react-window";

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  overscanCount?: number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  className = "",
  overscanCount = 5,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 32;
        setHeight(Math.max(400, Math.min(availableHeight, 800)));
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const Row = ({ index, style }: ListChildComponentProps) => (
    <div style={style}>{renderItem(items[index], index)}</div>
  );

  return (
    <div ref={containerRef} className={className}>
      <FixedSizeList
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        width="100%"
        overscanCount={overscanCount}
      >
        {Row}
      </FixedSizeList>
    </div>
  );
}

interface UseVirtualizedListOptions {
  threshold?: number;
}

export function useVirtualizedList<T>(
  items: T[],
  options: UseVirtualizedListOptions = {},
): { shouldVirtualize: boolean; items: T[] } {
  const { threshold = 50 } = options;

  return {
    shouldVirtualize: items.length > threshold,
    items,
  };
}
