import { AudioLines, GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandLoginCard } from "@/app/components/BrandLoginCard";

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
            <div className="h-full overflow-hidden rounded-xl border-2 border-transparent shadow-lg transition-all duration-300 hover:border-blue-400 hover:shadow-2xl">
              <BrandLoginCard brand="annix-forge" className="h-full w-full object-cover" />
            </div>
          </Link>

          <Link href="/core" className="group h-full">
            <div className="h-full overflow-hidden rounded-xl border-2 border-transparent shadow-lg transition-all duration-300 hover:border-indigo-400 hover:shadow-2xl">
              <BrandLoginCard brand="annix-core" className="h-full w-full object-cover" />
            </div>
          </Link>

          <Link href="/annix-rep/setup" target="_blank" rel="noopener noreferrer" className="group">
            <div className="h-full overflow-hidden rounded-xl border-2 border-transparent shadow-lg transition-all duration-300 hover:border-emerald-400 hover:shadow-2xl">
              <BrandLoginCard brand="annix-rep" className="h-full w-full object-cover" />
            </div>
          </Link>

          <Link href="/annix-sentinel" target="_blank" className="group h-full">
            <div className="h-full overflow-hidden rounded-xl border-2 border-transparent shadow-lg transition-all duration-300 hover:border-blue-400 hover:shadow-2xl">
              <BrandLoginCard brand="annix-sentinel" className="h-full w-full object-cover" />
            </div>
          </Link>

          <Link
            href="/annix/orbit"
            target="_blank"
            rel="noopener noreferrer"
            className="group h-full"
          >
            <div className="h-full overflow-hidden rounded-xl border-2 border-transparent shadow-lg transition-all duration-300 hover:border-indigo-400 hover:shadow-2xl">
              <BrandLoginCard brand="annix-orbit" className="h-full w-full object-cover" />
            </div>
          </Link>

          <Link
            href="/teacher-assistant"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-lg p-8 border-2 border-transparent hover:border-[#FF8A00] hover:shadow-xl transition-all duration-300 h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-[#f5f6ff] rounded-2xl text-[#323288] mb-6 group-hover:bg-[#323288] group-hover:text-white transition-colors">
                  <GraduationCap {...iconProps} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Teacher Assistant</h3>
                <p className="text-gray-600 mb-6">
                  AI assignment & workbook generator for high-school teachers. Process-based tasks
                  that grade thinking, evidence, and AI critique — not recall.
                </p>
                <span className="inline-flex items-center text-[#323288] font-semibold group-hover:translate-x-1 transition-transform">
                  Open
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
        </div>
      </div>
    </div>
  );
}
