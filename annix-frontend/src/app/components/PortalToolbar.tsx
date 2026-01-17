'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AmixLogo from './AmixLogo';
import { ThemeToggle } from './ThemeToggle';
import { corpId, portalConfig, PortalType } from '@/app/lib/corpId';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: string[];
}

export interface UserInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  roles?: string[];
}

export interface PortalToolbarProps {
  portalType: PortalType;
  navItems: NavItem[];
  user: UserInfo | null;
  onLogout: () => void;
  additionalActions?: React.ReactNode;
  statusBadge?: React.ReactNode;
}

export default function PortalToolbar({
  portalType,
  navItems,
  user,
  onLogout,
  additionalActions,
  statusBadge,
}: PortalToolbarProps) {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const config = portalConfig[portalType];
  const colors = corpId.colors.portal[portalType];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitials = (() => {
    if (!user) return '??';
    const firstInitial = user.firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = user.lastName?.charAt(0)?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}` || 'U';
  })();

  const visibleNavItems = navItems.filter(item =>
    !item.roles || item.roles.some(role => user?.roles?.includes(role))
  );

  return (
    <nav
      className="shadow-lg"
      style={{ backgroundColor: colors.background }}
    >
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href={config.homeHref} className="flex items-center space-x-3">
                <AmixLogo size="sm" showText={true} />
                <span
                  className="text-lg font-semibold hidden md:block"
                  style={{ color: corpId.colors.accent.orange }}
                >
                  {config.title}
                </span>
              </Link>
            </div>
            <div className="hidden lg:ml-8 lg:flex lg:space-x-1">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                    style={{
                      color: isActive ? corpId.colors.accent.orange : colors.text,
                      backgroundColor: isActive ? colors.active : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = colors.hover;
                        e.currentTarget.style.color = corpId.colors.accent.orange;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = colors.text;
                      }
                    }}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {statusBadge}
            {additionalActions}

            <ThemeToggle />

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-3 focus:outline-none"
              >
                <div className="flex items-center space-x-2">
                  <span
                    className="hidden md:block text-sm font-medium"
                    style={{ color: colors.text }}
                  >
                    {user?.firstName} {user?.lastName}
                  </span>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors"
                    style={{
                      backgroundColor: corpId.colors.accent.orange,
                      color: corpId.colors.text.onOrange,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = corpId.colors.accent.orangeLight;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = corpId.colors.accent.orange;
                    }}
                  >
                    {userInitials}
                  </div>
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      {user?.companyName && (
                        <p className="text-xs text-gray-500 mt-1">{user.companyName}</p>
                      )}
                      {user?.roles && user.roles.length > 0 && (
                        <div className="mt-1">
                          {user.roles.map((role) => (
                            <span
                              key={role}
                              className="inline-block px-2 py-0.5 text-xs font-medium rounded mr-1"
                              style={{
                                backgroundColor: `${corpId.colors.primary.navy}20`,
                                color: corpId.colors.primary.navy,
                              }}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/${portalType}/portal/profile`}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        My Profile
                      </div>
                    </Link>

                    {portalType !== 'admin' && (
                      <Link
                        href={`/${portalType}/portal/company`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          Company Settings
                        </div>
                      </Link>
                    )}

                    {portalType === 'admin' && (
                      <Link
                        href="/admin/portal/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Settings
                        </div>
                      </Link>
                    )}

                    <div className="border-t border-gray-100"></div>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="lg:hidden py-2 border-t" style={{ borderColor: corpId.colors.primary.navyLight }}>
          <div className="flex flex-wrap gap-2">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md"
                  style={{
                    color: isActive ? corpId.colors.accent.orange : colors.text,
                    backgroundColor: isActive ? colors.active : 'transparent',
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
