"use client";

import Link from "next/link";
import { useEffect } from "react";

const RfqIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const RubberIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
    />
  </svg>
);

const VoiceFilterIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
    />
  </svg>
);

const StockControlIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

const AnnixRepIcon = () => (
  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
    />
  </svg>
);

export default function HomePage() {
  useEffect(() => {
    document.title = "Annix Platform";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="text-white">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Annix Platform</h1>
            <p className="text-xl text-blue-200 max-w-2xl mx-auto">
              Your trusted partner for industrial solutions. Manage RFQs, field sales, inventory,
              and more from a single platform.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 -mt-8">
        {/* App Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* RFQ Platform Card */}
          <Link href="/rfq-portal" className="group">
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-blue-400 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-2xl text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <RfqIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">RFQ Platform</h3>
                <p className="text-gray-600 mb-6">
                  Pipeline quotation management for customers and suppliers. Create RFQs, submit
                  quotes, and manage procurement.
                </p>
                <span className="inline-flex items-center text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
                  Open Platform
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </Link>

          {/* AU Rubber App Card */}
          <Link href="/au-rubber/login" className="group">
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-yellow-400 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-2xl text-yellow-600 mb-6 group-hover:bg-yellow-600 group-hover:text-white transition-colors">
                  <RubberIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">AU Rubber App</h3>
                <p className="text-gray-600 mb-6">
                  Manage rubber lining products, orders, and companies with the AU Rubber portal.
                </p>
                <span className="inline-flex items-center text-yellow-600 font-semibold group-hover:translate-x-1 transition-transform">
                  Login
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </Link>

          {/* Voice Filter Card */}
          <a
            href="http://localhost:47823"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-cyan-400 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-100 rounded-2xl text-cyan-600 mb-6 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                  <VoiceFilterIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Voice Filter</h3>
                <p className="text-gray-600 mb-6">
                  Speaker verification filter that only passes through your authorized voice.
                </p>
                <span className="inline-flex items-center text-cyan-600 font-semibold group-hover:translate-x-1 transition-transform">
                  Open Dashboard
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </a>

          {/* Annix Rep Card */}
          <Link href="/annix-rep/setup" className="group">
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-emerald-400 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-2xl text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <AnnixRepIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Annix Rep</h3>
                <p className="text-gray-600 mb-6">
                  Mobile sales field assistant with smart prospecting, route planning, and meeting
                  AI.
                </p>
                <span className="inline-flex items-center text-emerald-600 font-semibold group-hover:translate-x-1 transition-transform">
                  Open App
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </Link>

          {/* Stock Control Card */}
          <Link href="/stock-control/login" className="group">
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-teal-400 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-100 rounded-2xl text-teal-600 mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <StockControlIcon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Stock Control</h3>
                <p className="text-gray-600 mb-6">
                  Manage stock items, job allocations, deliveries, and inventory tracking with ASCA.
                </p>
                <span className="inline-flex items-center text-teal-600 font-semibold group-hover:translate-x-1 transition-transform">
                  Login
                  <svg
                    className="w-5 h-5 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
