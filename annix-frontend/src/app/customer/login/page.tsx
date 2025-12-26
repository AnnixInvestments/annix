'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDeviceFingerprint } from '@/app/hooks/useDeviceFingerprint';
import { useCustomerAuth } from '@/app/context/CustomerAuthContext';
import { customerEmailApi } from '@/app/lib/api/customerApi';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const { fingerprint, browserInfo, isLoading: fingerprintLoading } = useDeviceFingerprint();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailNotVerified, setIsEmailNotVerified] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/customer/portal/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsResendingEmail(true);
    setResendSuccess(false);
    setError(null);

    try {
      const result = await customerEmailApi.resendVerification(email);
      setResendSuccess(true);
      setIsEmailNotVerified(false);
      setError(null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to resend verification email';
      setError(errorMessage);
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fingerprint) {
      setError('Device fingerprint not available. Please refresh the page.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setIsEmailNotVerified(false);
    setResendSuccess(false);

    try {
      await login(email, password, fingerprint, browserInfo || undefined);
      router.push('/customer/portal/dashboard');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Login failed. Please try again.';

      // Check if error is about email not verified or account pending activation
      if (errorMessage.includes('Email not verified') || errorMessage.includes('not verified') || errorMessage.includes('pending activation') || errorMessage.includes('Account is pending')) {
        setIsEmailNotVerified(true);
        setError(errorMessage); // Use the actual error message from backend
      } else if (errorMessage.includes('Device fingerprint mismatch')) {
        setError(
          'This device is not registered for this account. ' +
          'Please contact support if you need to register a new device.'
        );
      } else if (errorMessage.includes('suspended')) {
        setError(
          'Your account has been suspended. Please contact support for assistance.'
        );
      } else if (errorMessage.includes('Invalid credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Customer Portal</h1>
          <p className="mt-2 text-xl text-blue-200">Sign in to your account</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="your.email@company.co.za"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center">
                {fingerprintLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-gray-500">Verifying device...</span>
                  </>
                ) : fingerprint ? (
                  <>
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600">Device verified</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm text-red-600">Device verification failed</span>
                  </>
                )}
              </div>
            </div>

            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-green-700">
                    Verification email sent! Please check your inbox and verify your email address.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-red-700">{error}</p>
                    {isEmailNotVerified && (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={isResendingEmail}
                        className="mt-2 inline-flex items-center text-sm font-medium text-red-800 hover:text-red-900 disabled:opacity-50"
                      >
                        {isResendingEmail ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-800 mr-2"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Resend Verification Email
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || fingerprintLoading || !fingerprint}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Need help?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link href="/customer/register" className="text-blue-600 hover:underline font-medium">
                  Register here
                </Link>
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Need to change your registered device?{' '}
                <a href="mailto:support@annix.co.za" className="text-blue-600 hover:underline">
                  Contact support
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="bg-blue-800 bg-opacity-50 border border-blue-400 rounded-lg p-4 max-w-md mx-auto backdrop-blur-sm">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-200 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div className="text-left">
                <h4 className="text-sm font-medium text-white">Secure Login</h4>
                <p className="mt-1 text-xs text-blue-100">
                  Your account is secured with device binding. Only the device you registered with
                  can access your account. This protects your business information from unauthorized access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
