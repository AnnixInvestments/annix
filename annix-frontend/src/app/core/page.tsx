import { ArrowLeft, Package, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandLoginCard } from "@/app/components/BrandLoginCard";

export const metadata: Metadata = {
  title: "Annix Core",
  description:
    "The operations platform for stock, production, documents, quality, and delivery. Source, produce, track, and deliver.",
};

const iconProps = { className: "w-12 h-12", strokeWidth: 1.5 };

export default function AnnixCorePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="text-white">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="mx-auto mb-6 max-w-md">
              <BrandLoginCard brand="annix-core" />
            </div>
            <p className="text-xl text-blue-200 max-w-2xl mx-auto">
              The operations platform for stock, production, documents, quality, and delivery.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-12 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
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
        </div>

        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center text-blue-200 hover:text-white font-semibold transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Annix Platform
          </Link>
        </div>
      </div>
    </div>
  );
}
