import type { Metadata } from "next";
import {
  FileText,
  ShieldCheck,
  Package,
  AudioLines,
  MapPinned,
  UserSearch,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Annix Platform",
  description:
    "Your trusted partner for industrial solutions. Manage RFQs, field sales, inventory, and more from a single platform.",
};

const iconProps = { className: "w-12 h-12", strokeWidth: 1.5 };

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Link href="/rfq-portal" target="_blank" rel="noopener noreferrer" className="group">
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-blue-400 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-2xl text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <FileText {...iconProps} />
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

          <Link href="/au-rubber/login" target="_blank" rel="noopener noreferrer" className="group">
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-yellow-400 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-2xl text-yellow-600 mb-6 group-hover:bg-yellow-600 group-hover:text-white transition-colors">
                  <ShieldCheck {...iconProps} />
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

          <Link
            href="/stock-control/login"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-teal-400 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-100 rounded-2xl text-teal-600 mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <Package {...iconProps} />
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

          <Link href="/annix-rep/setup" target="_blank" rel="noopener noreferrer" className="group">
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-emerald-400 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-2xl text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <MapPinned {...iconProps} />
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

          <Link href="/voice-filter/login" className="group">
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-cyan-400 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-100 rounded-2xl text-cyan-600 mb-6 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                  <AudioLines {...iconProps} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Voice Filter</h3>
                <p className="text-gray-600 mb-6">
                  Speaker verification filter that only passes through your authorized voice.
                </p>
                <span className="inline-flex items-center text-cyan-600 font-semibold group-hover:translate-x-1 transition-transform">
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

          <Link
            href="/cv-assistant/login"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-violet-400 hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-violet-100 rounded-2xl text-violet-600 mb-6 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <UserSearch {...iconProps} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">CV Assistant</h3>
                <p className="text-gray-600 mb-6">
                  AI-powered candidate screening and reference checking for recruitment teams.
                </p>
                <span className="inline-flex items-center text-violet-600 font-semibold group-hover:translate-x-1 transition-transform">
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
