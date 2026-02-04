'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AmixLogo from './AmixLogo';
import { ThemeToggle } from './ThemeToggle';
import { Tooltip } from './Tooltip';
import { corpId, portalConfig, PortalType } from '@/app/lib/corpId';
import { useLayout } from '@/app/context/LayoutContext';

export interface NavItem {
  href: string;
  label: string;
  sublabel?: string;
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

// Descriptive tooltips for navigation items
const NAV_TOOLTIPS: Record<string, string> = {
  'Dashboard': 'View your portal overview and key metrics',
  'Customer Portal': 'View your portal overview and key metrics',
  'Customers': 'Manage customer accounts and onboarding',
  'Suppliers': 'Manage supplier accounts and approvals',
  'RFQs': 'View and manage request for quotations',
  'Admin Users': 'Manage administrator accounts and permissions',
  'Secure Docs': 'Access encrypted customer documents',
  'My RFQs': 'View and manage your submitted quotations',
  'New RFQ': 'Create a new request for quotation',
  'Profile': 'View and update your profile settings',
  'Company': 'Manage your company information',
  'Documents': 'View and upload your documents',
  'Onboarding': 'Complete your account setup',
  'BOQs': 'View and respond to bill of quantities',
  'Submitted BOQs': 'View and amend your submitted quotes',
  'Products & Services': 'Select the products and services you can offer',
};

const getNavTooltip = (label: string): string => NAV_TOOLTIPS[label] || label;

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
  const { maxWidth } = useLayout();

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
      className="shadow-lg sticky top-0 z-50"
      style={{ backgroundColor: colors.background }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href={config.homeHref} className="flex items-center space-x-3">
                <AmixLogo size="sm" showText={true} />
                <Tooltip text="Return to Annix Landing Page" position="bottom">
                  <svg
                    className="w-5 h-5 opacity-60 hover:opacity-100 transition-opacity"
                    fill="none"
                    stroke={corpId.colors.accent.orange}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </Tooltip>
                {config.title && (
                  <span
                    className="text-lg font-semibold hidden md:block"
                    style={{ color: corpId.colors.accent.orange }}
                  >
                    {config.title}
                  </span>
                )}
              </Link>
            </div>
            <div className="hidden xl:ml-8 xl:flex xl:space-x-1">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Tooltip key={item.href} text={getNavTooltip(item.label)} position="bottom">
                    <Link
                      href={item.href}
                      className="inline-flex items-center px-4 py-2 text-base font-medium rounded-md transition-colors"
                      style={{
                        color: corpId.colors.accent.orange,
                        backgroundColor: isActive ? colors.active : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = colors.hover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <svg
                        className="w-6 h-6 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                      </svg>
                      {item.sublabel ? (
                        <span className="flex flex-col leading-tight">
                          <span className="text-base font-semibold">{item.label}</span>
                          <span className="text-sm">{item.sublabel}</span>
                        </span>
                      ) : (
                        item.label
                      )}
                    </Link>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {statusBadge}
            {additionalActions}

            <ThemeToggle />

            <div className="relative group/user" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-3 focus:outline-none"
              >
                <div className="flex items-center space-x-2">
                  <span
                    className="hidden md:block text-base font-medium"
                    style={{ color: corpId.colors.accent.orange }}
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
              {!isUserMenuOpen && (
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs text-white bg-slate-800 rounded opacity-0 group-hover/user:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                  Account menu and settings
                </span>
              )}

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

                    {(portalType === 'customer' || portalType === 'supplier') && (
                      <>
                        <Link
                          href={`/${portalType}/portal/onboarding`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            Onboarding Status
                          </div>
                        </Link>
                        <Link
                          href={`/${portalType}/portal/documents`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            My Documents
                          </div>
                        </Link>
                      </>
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

                    <Link
                      href="/"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Back to Main Site
                      </div>
                    </Link>

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

        {/* Mobile/tablet navigation - icons only with styled tooltips */}
        <div className="xl:hidden py-2 border-t" style={{ borderColor: corpId.colors.primary.navyLight }}>
          <div className="flex flex-wrap gap-1 justify-center">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Tooltip key={item.href} text={getNavTooltip(item.label)} position="top">
                  <Link
                    href={item.href}
                    className="inline-flex items-center justify-center p-3 rounded-md transition-colors"
                    style={{
                      color: corpId.colors.accent.orange,
                      backgroundColor: isActive ? colors.active : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = colors.hover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                    </svg>
                  </Link>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
