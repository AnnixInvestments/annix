'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import AmixLogo from './AmixLogo';
import { adminApiClient } from '@/app/lib/api/adminApi';
import { customerApiClient } from '@/app/lib/api/customerApi';
import { supplierApiClient } from '@/app/lib/api/supplierApi';
import { getStoredFingerprint, generateFingerprint } from '@/app/hooks/useDeviceFingerprint';

type UserType = 'admin' | 'customer' | 'supplier' | null;

interface LoggedInUser {
  type: UserType;
  name: string;
}

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();

  // Quick login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const [showLoginForm, setShowLoginForm] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkLoggedIn = () => {
      // Check admin
      if (adminApiClient.isAuthenticated()) {
        const stored = localStorage.getItem('adminUser');
        if (stored) {
          const user = JSON.parse(stored);
          setLoggedInUser({ type: 'admin', name: user.firstName || user.email });
          setShowLoginForm(false);
          return;
        }
      }

      // Check customer
      if (customerApiClient.isAuthenticated()) {
        const stored = localStorage.getItem('customerName');
        if (stored) {
          setLoggedInUser({ type: 'customer', name: stored });
          setShowLoginForm(false);
          return;
        }
      }

      // Check supplier
      if (supplierApiClient.isAuthenticated()) {
        const stored = localStorage.getItem('supplierName');
        if (stored) {
          setLoggedInUser({ type: 'supplier', name: stored });
          setShowLoginForm(false);
          return;
        }
      }

      setShowLoginForm(true);
    };

    checkLoggedIn();
  }, []);

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError('Please enter email and password');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    // Get device fingerprint
    let fingerprint = getStoredFingerprint();
    if (!fingerprint) {
      const fpData = await generateFingerprint();
      fingerprint = fpData.fingerprint;
    }

    try {
      // Try admin login first
      try {
        const adminResult = await adminApiClient.login({ email, password });
        localStorage.setItem('adminUser', JSON.stringify(adminResult.user));
        setLoggedInUser({ type: 'admin', name: adminResult.user.firstName || adminResult.user.email });
        setShowLoginForm(false);
        setEmail('');
        setPassword('');
        router.push('/admin/dashboard');
        return;
      } catch {
        // Not an admin, try customer
      }

      // Try customer login
      try {
        const customerResult = await customerApiClient.login({
          email,
          password,
          deviceFingerprint: fingerprint,
        });
        localStorage.setItem('customerName', customerResult.name);
        setLoggedInUser({ type: 'customer', name: customerResult.name });
        setShowLoginForm(false);
        setEmail('');
        setPassword('');
        router.push('/customer/portal/dashboard');
        return;
      } catch {
        // Not a customer, try supplier
      }

      // Try supplier login
      try {
        const supplierResult = await supplierApiClient.login({
          email,
          password,
          deviceFingerprint: fingerprint,
        });
        const supplierName = supplierResult.supplier.firstName || supplierResult.supplier.companyName || 'Supplier';
        localStorage.setItem('supplierName', supplierName);
        setLoggedInUser({ type: 'supplier', name: supplierName });
        setShowLoginForm(false);
        setEmail('');
        setPassword('');
        router.push('/supplier/portal/dashboard');
        return;
      } catch {
        // Not a supplier either
      }

      // All login attempts failed
      setLoginError('Invalid credentials');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (loggedInUser?.type === 'admin') {
        await adminApiClient.logout();
        localStorage.removeItem('adminUser');
      } else if (loggedInUser?.type === 'customer') {
        await customerApiClient.logout();
        localStorage.removeItem('customerName');
      } else if (loggedInUser?.type === 'supplier') {
        await supplierApiClient.logout();
        localStorage.removeItem('supplierName');
      }
    } catch {
      // Ignore logout errors
    }

    setLoggedInUser(null);
    setShowLoginForm(true);
    router.push('/');
  };

  const goToDashboard = () => {
    if (loggedInUser?.type === 'admin') {
      router.push('/admin/dashboard');
    } else if (loggedInUser?.type === 'customer') {
      router.push('/customer/portal/dashboard');
    } else if (loggedInUser?.type === 'supplier') {
      router.push('/supplier/portal/dashboard');
    }
  };

  // Get dashboard path based on logged in user type
  const getDashboardPath = () => {
    if (loggedInUser?.type === 'admin') return '/admin/dashboard';
    if (loggedInUser?.type === 'customer') return '/customer/portal/dashboard';
    if (loggedInUser?.type === 'supplier') return '/supplier/portal/dashboard';
    return '/'; // Default to home if not logged in
  };

  const navItems = [
    { label: 'Dashboard', path: getDashboardPath(), exact: false, requiresAuth: true },
    { label: 'Create RFQ', path: '/rfq', exact: true },
    { label: 'View RFQs', path: '/rfq/list', exact: false },
    { label: 'Drawings', path: '/drawings', exact: false },
    { label: 'BOQ', path: '/boq', exact: false },
    { label: 'Workflow', path: '/workflow', exact: false },
    { label: 'Reviews', path: '/reviews', exact: false },
  ];

  const isActive = (item: { path: string; exact: boolean }) => {
    if (item.exact) {
      return pathname === item.path;
    }
    return pathname.startsWith(item.path);
  };

  return (
    <nav
      className="sticky top-0 z-50 shadow-lg amix-toolbar"
      style={{ backgroundColor: '#001F3F' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            {/* Amix Logo */}
            <Link
              href="/"
              className="flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <AmixLogo size="sm" showText useSignatureFont />
            </Link>

            {/* Navigation Items */}
            <div className="flex gap-1">
              {navItems
                .filter((item) => !('requiresAuth' in item && item.requiresAuth) || loggedInUser)
                .map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.path)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    isActive(item)
                      ? 'bg-[#FFA500]'
                      : 'hover:bg-[#003366]'
                  }`}
                  style={{
                    color: isActive(item) ? '#FFFFFF' : '#FFA500'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right side - Quick Login or User Info */}
          <div className="flex items-center gap-3">
            {showLoginForm ? (
              <form onSubmit={handleQuickLogin} className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3 py-1.5 rounded text-sm bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-[#FFA500] w-36"
                  disabled={isLoggingIn}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-3 py-1.5 rounded text-sm bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-[#FFA500] w-28"
                  disabled={isLoggingIn}
                />
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="px-3 py-1.5 rounded text-sm font-semibold bg-[#FFA500] text-white hover:bg-[#FF8C00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoggingIn ? '...' : 'Login'}
                </button>
                {loginError && (
                  <span className="text-red-400 text-xs max-w-24 truncate" title={loginError}>
                    {loginError}
                  </span>
                )}
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={goToDashboard}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors"
                  style={{ color: '#FFA500' }}
                >
                  <span className="capitalize">{loggedInUser?.type}</span>
                  <span className="text-white/80">|</span>
                  <span className="text-white">{loggedInUser?.name}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
