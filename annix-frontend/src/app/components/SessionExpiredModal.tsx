'use client';

import React, { useEffect, useState } from 'react';
import AmixLogo from './AmixLogo';

// Simple event emitter for session expiry
type SessionExpiredListener = () => void;
const listeners: Set<SessionExpiredListener> = new Set();

export const sessionExpiredEvent = {
  emit: () => {
    listeners.forEach(listener => listener());
  },
  subscribe: (listener: SessionExpiredListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};

interface SessionExpiredModalProps {
  /** Custom redirect URL (defaults to /customer/login) */
  loginUrl?: string;
}

/**
 * Session Expired Modal
 *
 * Displays a branded modal when the user's session has expired.
 * Include this component in your root layout to enable global session expiry handling.
 *
 * Usage:
 * 1. Add <SessionExpiredModal /> to your layout
 * 2. Call sessionExpiredEvent.emit() when a 401 error occurs
 */
export default function SessionExpiredModal({ loginUrl = '/customer/login' }: SessionExpiredModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = sessionExpiredEvent.subscribe(() => {
      setIsVisible(true);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogin = () => {
    // Clear all auth tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('customerAccessToken');
      localStorage.removeItem('customerRefreshToken');
      localStorage.removeItem('supplierAccessToken');
      localStorage.removeItem('supplierRefreshToken');
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('authToken');
    }
    // Redirect to login
    window.location.href = loginUrl;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Navy header with logo */}
        <div
          className="px-8 py-6 flex flex-col items-center"
          style={{ backgroundColor: '#001F3F' }}
        >
          <AmixLogo size="lg" showText useSignatureFont />
        </div>

        {/* Content */}
        <div className="px-8 py-6 text-center">
          {/* Session expired icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Session Expired
          </h2>

          <p className="text-gray-600 mb-6">
            Your session has expired for security reasons. Please log in again to continue using the application.
          </p>

          {/* Login button */}
          <button
            onClick={handleLogin}
            className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-[0.98]"
            style={{ backgroundColor: '#FFA500' }}
          >
            Log In Again
          </button>

          <p className="mt-4 text-xs text-gray-400">
            Your unsaved changes may have been lost
          </p>
        </div>

        {/* Bottom accent bar */}
        <div
          className="h-1.5"
          style={{ backgroundColor: '#FFA500' }}
        />
      </div>
    </div>
  );
}
