'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { browserBaseUrl } from '@/lib/api-config';

interface UpcomingRfq {
  id: number;
  rfqNumber: string;
  projectName: string;
  requiredDate: string;
  daysRemaining: number;
  status: string;
}

interface PublicStats {
  totalRfqs: number;
  totalSuppliers: number;
  totalCustomers: number;
  upcomingRfqs: UpcomingRfq[];
}

// Icon components for the dashboard cards
const CustomerIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const SupplierIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const PricingIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RfqIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const AdminIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export default function HomePage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Annix Dashboard';
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStats = async () => {
      try {
        const baseUrl = browserBaseUrl();
        const response = await fetch(`${baseUrl}/public/stats`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        // Ignore abort errors (component unmounted)
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Set default stats on error (backend may be unavailable)
        setStats({
          totalRfqs: 0,
          totalSuppliers: 0,
          totalCustomers: 0,
          upcomingRfqs: [],
        });
        // Only set error message if it's not a network connectivity issue
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          // Backend is likely not running - silently use defaults
          setError(null);
        } else {
          setError('Unable to load statistics');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    return () => {
      controller.abort();
    };
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysRemainingColor = (days: number) => {
    if (days <= 3) return 'text-red-600 bg-red-50';
    if (days <= 7) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Annix RFQ Platform
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Your trusted partner for pipeline quotation management.
              Connect with suppliers, manage RFQs, and streamline your procurement process.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Counter Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 -mt-16">
          {/* Total RFQs Counter */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  RFQs Posted
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? (
                    <span className="inline-block w-16 h-8 bg-gray-200 animate-pulse rounded"></span>
                  ) : (
                    stats?.totalRfqs.toLocaleString() || '0'
                  )}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                <RfqIcon />
              </div>
            </div>
          </div>

          {/* Total Suppliers Counter */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Registered Suppliers
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? (
                    <span className="inline-block w-16 h-8 bg-gray-200 animate-pulse rounded"></span>
                  ) : (
                    stats?.totalSuppliers.toLocaleString() || '0'
                  )}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                <UsersIcon />
              </div>
            </div>
          </div>

          {/* Total Customers Counter */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Registered Customers
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {loading ? (
                    <span className="inline-block w-16 h-8 bg-gray-200 animate-pulse rounded"></span>
                  ) : (
                    stats?.totalCustomers.toLocaleString() || '0'
                  )}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl text-green-600">
                <UsersIcon />
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Customer Login/Register Card */}
          <Link href="/customer/login" className="group">
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-blue-500 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-2xl text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <CustomerIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Customer Portal
                </h3>
                <p className="text-gray-600 mb-6">
                  Login or register to manage your RFQs, view quotations, and track your orders.
                </p>
                <span className="inline-flex items-center text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
                  Login / Register
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>

          {/* Supplier Login/Register Card */}
          <Link href="/supplier/login" className="group">
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-2xl text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <SupplierIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Supplier Portal
                </h3>
                <p className="text-gray-600 mb-6">
                  Join our supplier network to receive RFQs, submit quotations, and grow your business.
                </p>
                <span className="inline-flex items-center text-indigo-600 font-semibold group-hover:translate-x-1 transition-transform">
                  Login / Register
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>

          {/* Admin Portal Card */}
          <Link href="/admin/login" className="group">
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-purple-500 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-2xl text-purple-600 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <AdminIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Admin Portal
                </h3>
                <p className="text-gray-600 mb-6">
                  Administrative access to manage customers, suppliers, RFQs, and platform settings.
                </p>
                <span className="inline-flex items-center text-purple-600 font-semibold group-hover:translate-x-1 transition-transform">
                  Admin Login
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>

          {/* Tier Pricing Card */}
          <Link href="/pricing" className="group">
            <div className="bg-white rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-green-500 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-2xl text-green-600 mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <PricingIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Tier Pricing
                </h3>
                <p className="text-gray-600 mb-6">
                  View our subscription tiers and pricing plans for customers and suppliers.
                </p>
                <span className="inline-flex items-center text-green-600 font-semibold group-hover:translate-x-1 transition-transform">
                  View Pricing
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* RFQ Closing Date Reminders Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                  <CalendarIcon />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Upcoming RFQ Closing Dates
                </h2>
              </div>
              <Link href="/rfq/list" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All RFQs
              </Link>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-48"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : stats?.upcomingRfqs && stats.upcomingRfqs.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingRfqs.map((rfq) => (
                  <div
                    key={rfq.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-gray-500">
                          {rfq.rfqNumber}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          rfq.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                          rfq.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          rfq.status === 'quoted' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                        {rfq.projectName}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {formatDate(rfq.requiredDate)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getDaysRemainingColor(rfq.daysRemaining)}`}>
                        {rfq.daysRemaining === 0 ? 'Today' :
                         rfq.daysRemaining === 1 ? '1 day' :
                         `${rfq.daysRemaining} days`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <CalendarIcon />
                </div>
                <p className="text-gray-500">No upcoming RFQ closing dates</p>
                <Link href="/rfq" className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-700 font-medium">
                  Create your first RFQ
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Ready to get started?</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/rfq"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New RFQ
            </Link>
            <Link
              href="/rfq/list"
              className="inline-flex items-center px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors border border-gray-300 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              View All RFQs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
