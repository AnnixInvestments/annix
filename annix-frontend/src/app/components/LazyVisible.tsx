"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

interface LazyVisibleProps {
  children: ReactNode;
  placeholderMinHeight?: number;
  rootMargin?: string;
  className?: string;
}

export function LazyVisible(props: LazyVisibleProps) {
  const { placeholderMinHeight: minHeightProp, rootMargin: rootMarginProp, className } = props;
  const placeholderMinHeight = minHeightProp ?? 400;
  const rootMargin = rootMarginProp ?? "800px";
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    if (hasMounted) return;
    const node = placeholderRef.current;
    if (!node) return;
    // eslint-disable-next-line no-restricted-syntax -- SSR/feature guard; isUndefined(IntersectionObserver) would throw if the global is absent
    if (typeof IntersectionObserver === "undefined") {
      setHasMounted(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const anyVisible = entries.some((entry) => entry.isIntersecting);
        if (anyVisible) {
          setHasMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMounted, rootMargin]);

  if (hasMounted) {
    return <div className={className}>{props.children}</div>;
  }

  const placeholderStyle = { minHeight: placeholderMinHeight };
  return (
    <div ref={placeholderRef} className={className} style={placeholderStyle} aria-hidden="true" />
  );
}
