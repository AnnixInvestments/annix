'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { customerEmailApi } from '@/app/lib/api/customerApi';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'no-token'>('verifying');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    const verifyEmail = async () => {
      try {
        const result = await customerEmailApi.verifyEmail(token);
        setStatus('success');
        setMessage(result.message || 'Your email has been verified successfully.');
      } catch (e) {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : 'Verification failed. The link may be invalid or expired.');
      }
    };

    verifyEmail();
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setIsResending(true);
    setResendMessage(null);

    try {
      await customerEmailApi.resendVerification(resendEmail);
      setResendMessage({ type: 'success', text: 'Verification email sent! Please check your inbox.' });
    } catch (e) {
      setResendMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Failed to resend verification email.',
      });
    } finally {
      setIsResending(false);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Verifying Your Email</h2>
        <p className="text-gray-600">Please wait while we verify your email address...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Email Verified!</h2>
        <p className="text-gray-600 mb-8">{message}</p>
        <p className="text-gray-600 mb-8">
          You can now log in to your account and complete the onboarding process.
        </p>
        <button
          onClick={() => router.push('/customer/login')}
          className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Verification Failed</h2>
        <p className="text-gray-600 mb-8">{message}</p>

        <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resend Verification Email</h3>
          <form onSubmit={handleResend} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-left">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="your.email@company.co.za"
                required
              />
            </div>

            {resendMessage && (
              <div
                className={`p-3 rounded-lg ${
                  resendMessage.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {resendMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isResending}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Need help?{' '}
          <a href="mailto:support@annix.co.za" className="text-blue-600 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    );
  }

  // no-token state
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Verification Token</h2>
      <p className="text-gray-600 mb-8">
        Please use the link from your verification email to verify your account.
      </p>

      <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Resend Verification Email</h3>
        <form onSubmit={handleResend} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-left">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="your.email@company.co.za"
              required
            />
          </div>

          {resendMessage && (
            <div
              className={`p-3 rounded-lg ${
                resendMessage.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {resendMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isResending}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </button>
        </form>
      </div>

      <div className="mt-6">
        <Link href="/customer/login" className="text-blue-600 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-gray-900">Customer Portal</h1>
        <h2 className="mt-2 text-center text-xl text-gray-600">Email Verification</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow rounded-lg sm:px-10">
          <Suspense
            fallback={
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            }
          >
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
