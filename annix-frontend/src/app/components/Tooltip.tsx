'use client';

import React, { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'bottom';
}

export function Tooltip({ children, text, position = 'bottom' }: TooltipProps) {
  const positionClasses = position === 'top'
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  return (
    <div className="relative group">
      {children}
      <span
        className={`absolute left-1/2 -translate-x-1/2 ${positionClasses} px-2 py-1 text-xs text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg`}
      >
        {text}
      </span>
    </div>
  );
}
