'use client'

import { useTheme } from './ThemeProvider'
import { Tooltip } from './Tooltip'

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme()
  const tooltipText = `Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`

  return (
    <Tooltip text={tooltipText} position="bottom">
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg transition-colors hover:bg-amix-navy-light"
        aria-label={tooltipText}
      >
        {resolvedTheme === 'light' ? (
          <svg
            className="w-5 h-5 text-amix-orange"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-amix-orange"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        )}
      </button>
    </Tooltip>
  )
}
