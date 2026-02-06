'use client'

import { ToastProvider } from './Toast'
import { ThemeProvider } from './ThemeProvider'
import { QueryProvider } from '@/app/lib/query/QueryProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
