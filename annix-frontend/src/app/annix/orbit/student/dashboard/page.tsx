"use client";

import Link from "next/link";
import { useAnnixOrbitAuth } from "@/app/context/AnnixOrbitAuthContext";

export default function StudentDashboardPage() {
  const { user } = useAnnixOrbitAuth();
  const name = user?.name;
  const firstName = (name || "").split(" ")[0];
  const greeting = firstName ? `Welcome back, ${firstName}` : "Welcome to FuturePath";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">{greeting}</h1>
        <p className="text-[#c0c0eb] mt-2">
          Plan the subjects and marks that open the doors you want — and see the qualifications they
          lead to.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/annix/orbit/student/futurepath"
          className="bg-white rounded-2xl shadow-xl p-7 flex flex-col hover:shadow-2xl transition-shadow"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#e0e0f5] rounded-xl mb-5">
            <svg
              className="w-7 h-7 text-[#323288]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 14l9-5-9-5-9 5 9 5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Open FuturePath</h2>
          <p className="text-gray-600 mt-2 flex-1">
            Set your target qualifications, plan your marks, estimate the cost, and explore
            alternative pathways.
          </p>
          <span className="mt-5 text-[#323288] font-medium">Get started →</span>
        </Link>
      </div>
    </div>
  );
}
