'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type MaxWidth = 'max-w-7xl' | 'max-w-full';

interface LayoutContextValue {
  maxWidth: MaxWidth;
  setFullWidth: () => void;
  setConstrainedWidth: () => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [maxWidth, setMaxWidth] = useState<MaxWidth>('max-w-full');

  const setFullWidth = useCallback(() => setMaxWidth('max-w-full'), []);
  const setConstrainedWidth = useCallback(() => setMaxWidth('max-w-7xl'), []);

  return (
    <LayoutContext.Provider value={{ maxWidth, setFullWidth, setConstrainedWidth }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    return {
      maxWidth: 'max-w-full',
      setFullWidth: () => {},
      setConstrainedWidth: () => {},
    };
  }
  return context;
}

export function useFullWidthLayout() {
  const { setFullWidth, setConstrainedWidth } = useLayout();

  React.useEffect(() => {
    setFullWidth();
    return () => setConstrainedWidth();
  }, [setFullWidth, setConstrainedWidth]);
}
