'use client';

import React, { useState, useEffect } from 'react';
import { log } from '@/app/lib/logger';

interface SplitPaneLayoutProps {
  entryId: string;
  formContent: React.ReactNode;
  previewContent: React.ReactNode;
  calcResultsContent?: React.ReactNode;
  showSplitToggle: boolean;
  itemType: 'straight_pipe' | 'bend' | 'fitting' | 'pipe_steel_work' | 'expansion_joint';
}

export default function SplitPaneLayout({
  entryId,
  formContent,
  previewContent,
  calcResultsContent,
  showSplitToggle,
  itemType
}: SplitPaneLayoutProps) {
  const [splitPaneEnabledState, setSplitPaneEnabledState] = useState<Record<string, boolean>>({});
  const [splitPaneWidthState, setSplitPaneWidthState] = useState<Record<string, number>>({});
  const [splitPaneHeightState, setSplitPaneHeightState] = useState<Record<string, number>>({});
  const [defaultEnabled, setDefaultEnabled] = useState<boolean>(false);
  const [defaultWidth, setDefaultWidth] = useState<number>(50);
  const [defaultHeight, setDefaultHeight] = useState<number>(600);

  // Load split pane preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEnabled = localStorage.getItem('rfq-split-pane-enabled');
      const savedWidth = localStorage.getItem('rfq-split-pane-width');
      const savedHeight = localStorage.getItem('rfq-split-pane-height');
      const savedDefaultEnabled = localStorage.getItem('rfq-split-pane-default-enabled');
      const savedDefaultWidth = localStorage.getItem('rfq-split-pane-default-width');
      const savedDefaultHeight = localStorage.getItem('rfq-split-pane-default-height');

      if (savedEnabled) {
        try {
          setSplitPaneEnabledState(JSON.parse(savedEnabled));
        } catch (e) {
          log.error('Failed to parse split pane enabled state from localStorage', e);
        }
      }

      if (savedWidth) {
        try {
          setSplitPaneWidthState(JSON.parse(savedWidth));
        } catch (e) {
          log.error('Failed to parse split pane width from localStorage', e);
        }
      }

      if (savedHeight) {
        try {
          setSplitPaneHeightState(JSON.parse(savedHeight));
        } catch (e) {
          log.error('Failed to parse split pane height from localStorage', e);
        }
      }

      if (savedDefaultEnabled) {
        try {
          setDefaultEnabled(JSON.parse(savedDefaultEnabled));
        } catch (e) {
          log.error('Failed to parse split pane default enabled from localStorage', e);
        }
      }

      if (savedDefaultWidth) {
        try {
          setDefaultWidth(JSON.parse(savedDefaultWidth));
        } catch (e) {
          log.error('Failed to parse split pane default width from localStorage', e);
        }
      }

      if (savedDefaultHeight) {
        try {
          setDefaultHeight(JSON.parse(savedDefaultHeight));
        } catch (e) {
          log.error('Failed to parse split pane default height from localStorage', e);
        }
      }
    }
  }, []);

  // Wrapper functions to save to localStorage
  const setSplitPaneEnabled = (updater: React.SetStateAction<Record<string, boolean>>, newValue?: boolean) => {
    setSplitPaneEnabledState(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      if (typeof window !== 'undefined') {
        localStorage.setItem('rfq-split-pane-enabled', JSON.stringify(newState));
        if (newValue !== undefined) {
          localStorage.setItem('rfq-split-pane-default-enabled', JSON.stringify(newValue));
          setDefaultEnabled(newValue);
        }
      }
      return newState;
    });
  };

  const setSplitPaneWidth = (updater: React.SetStateAction<Record<string, number>>) => {
    setSplitPaneWidthState(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      if (typeof window !== 'undefined') {
        localStorage.setItem('rfq-split-pane-width', JSON.stringify(newState));
        const currentWidth = newState[entryId];
        if (currentWidth) {
          localStorage.setItem('rfq-split-pane-default-width', JSON.stringify(currentWidth));
          setDefaultWidth(currentWidth);
        }
      }
      return newState;
    });
  };

  const setSplitPaneHeight = (updater: React.SetStateAction<Record<string, number>>) => {
    setSplitPaneHeightState(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      if (typeof window !== 'undefined') {
        localStorage.setItem('rfq-split-pane-height', JSON.stringify(newState));
        const currentHeight = newState[entryId];
        if (currentHeight) {
          localStorage.setItem('rfq-split-pane-default-height', JSON.stringify(currentHeight));
          setDefaultHeight(currentHeight);
        }
      }
      return newState;
    });
  };

  const hasExplicitSetting = entryId in splitPaneEnabledState;
  const isEnabled = hasExplicitSetting ? splitPaneEnabledState[entryId] : defaultEnabled;
  const width = splitPaneWidthState[entryId] || defaultWidth;
  const height = splitPaneHeightState[entryId] || defaultHeight;

  // Color scheme based on item type
  const colorScheme = {
    straight_pipe: {
      from: 'from-blue-500',
      to: 'to-blue-600',
      hoverFrom: 'hover:from-blue-600',
      hoverTo: 'hover:to-blue-700',
      divider: 'hover:bg-blue-500'
    },
    bend: {
      from: 'from-purple-500',
      to: 'to-purple-600',
      hoverFrom: 'hover:from-purple-600',
      hoverTo: 'hover:to-purple-700',
      divider: 'hover:bg-purple-500'
    },
    fitting: {
      from: 'from-green-500',
      to: 'to-green-600',
      hoverFrom: 'hover:from-green-600',
      hoverTo: 'hover:to-green-700',
      divider: 'hover:bg-green-500'
    },
    pipe_steel_work: {
      from: 'from-orange-500',
      to: 'to-orange-600',
      hoverFrom: 'hover:from-orange-600',
      hoverTo: 'hover:to-orange-700',
      divider: 'hover:bg-orange-500'
    },
    expansion_joint: {
      from: 'from-purple-500',
      to: 'to-purple-600',
      hoverFrom: 'hover:from-purple-600',
      hoverTo: 'hover:to-purple-700',
      divider: 'hover:bg-purple-500'
    }
  }[itemType];

  return (
    <div className="space-y-5">
      {/* Main content container - flex in split mode, stacked in non-split */}
      <div className={isEnabled ? "flex gap-0" : "space-y-5"}>
        {/* Left Pane - Form Fields */}
        <div
          className={isEnabled ? "flex-shrink-0 space-y-5 pr-4" : "space-y-5"}
          style={isEnabled ? { width: `${width}%` } : undefined}
        >
          {formContent}

          {/* Toggle Button for Split-Pane 3D Preview */}
          {showSplitToggle && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const newValue = !isEnabled;
                  setSplitPaneEnabled(prev => ({ ...prev, [entryId]: newValue }), newValue);
                }}
                className={`px-4 py-2 text-sm font-medium bg-gradient-to-r ${colorScheme.from} ${colorScheme.to} ${colorScheme.hoverFrom} ${colorScheme.hoverTo} text-white rounded-lg shadow-md transition-all flex items-center gap-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {isEnabled ? 'Disable Split View' : 'Enable Split View'}
              </button>
            </div>
          )}

          {/* Calc Results - shown below toggle button, above preview (non-split mode) */}
          {!isEnabled && showSplitToggle && calcResultsContent && (
            <div className="mt-4">
              {calcResultsContent}
            </div>
          )}
        </div>

      {/* Draggable Divider */}
      {isEnabled && previewContent && (
        <div
          className={`w-1 bg-gray-300 ${colorScheme.divider} cursor-col-resize transition-colors flex-shrink-0 mx-2`}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = width;

            let rafId: number | null = null;
            const onMouseMove = (moveEvent: MouseEvent) => {
              const container = (e.target as HTMLElement).parentElement;
              if (container) {
                const containerWidth = container.offsetWidth;
                const deltaX = moveEvent.clientX - startX;
                const deltaPercent = (deltaX / containerWidth) * 100;
                const newWidth = Math.min(Math.max(startWidth + deltaPercent, 10), 90);
                setSplitPaneWidth(prev => ({ ...prev, [entryId]: newWidth }));
                if (!rafId) {
                  rafId = requestAnimationFrame(() => {
                    window.dispatchEvent(new Event('resize'));
                    rafId = null;
                  });
                }
              }
            };

            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
        />
      )}

      {/* Right Pane - 3D Preview (split mode) */}
      {isEnabled && showSplitToggle && previewContent && (
        <div
          className="flex-shrink-0 relative flex flex-col"
          style={{ width: `${100 - width}%`, minHeight: '400px', height: `${height}px` }}
        >
          <div className="flex-1 w-full min-h-0 flex flex-col">
            {previewContent}
          </div>
          <div
            className={`absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize bg-gradient-to-br ${colorScheme.from} ${colorScheme.to} opacity-60 hover:opacity-100 transition-opacity`}
            style={{
              clipPath: 'polygon(0 0, 0 100%, 100% 100%)'
            }}
            title="Drag to resize width and height"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const startWidth = width;
              const startHeight = height;

              let rafId: number | null = null;
              const onMouseMove = (moveEvent: MouseEvent) => {
                const container = (e.target as HTMLElement).closest('.flex') as HTMLElement;
                if (container) {
                  const containerWidth = container.offsetWidth;
                  const deltaX = moveEvent.clientX - startX;
                  const deltaY = moveEvent.clientY - startY;
                  const deltaPercent = (deltaX / containerWidth) * 100;
                  const newWidth = Math.min(Math.max(startWidth + deltaPercent, 10), 90);
                  const newHeight = Math.max(startHeight + deltaY, 350);

                  setSplitPaneWidth(prev => ({ ...prev, [entryId]: newWidth }));
                  setSplitPaneHeight(prev => ({ ...prev, [entryId]: newHeight }));

                  if (!rafId) {
                    rafId = requestAnimationFrame(() => {
                      window.dispatchEvent(new Event('resize'));
                      rafId = null;
                    });
                  }
                }
              };

              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };

              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          />
        </div>
      )}

      {/* 3D Preview - shown below calc results when split-pane is disabled */}
      {!isEnabled && showSplitToggle && previewContent && (
        <div className="w-full" style={{ minHeight: '500px', height: '500px' }}>
          {previewContent}
        </div>
      )}
      </div>

      {/* Calc Results - shown above preview when split-pane is enabled */}
      {isEnabled && showSplitToggle && calcResultsContent && (
        <div>
          {calcResultsContent}
        </div>
      )}
    </div>
  );
}
