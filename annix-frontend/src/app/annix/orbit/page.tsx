"use client";

import Link from "next/link";
import { useBrandingContext } from "@/app/lib/branding/BrandingProvider";
import { brandingFallback, resolveBrandAssetUrl } from "@/app/lib/branding/branding";

export default function AnnixOrbitHomePage() {
  const ctx = useBrandingContext();
  const branding = ctx || brandingFallback("annix-orbit");
  const logoIcon = resolveBrandAssetUrl("logoIcon", branding);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-10">
          <div
            className="inline-flex w-20 h-20 rounded-2xl mb-6 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${logoIcon}')` }}
          />
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0A1B3D] dark:text-white mb-2">
            Annix Orbit
          </h1>
          <p
            className="text-sm sm:text-base font-semibold tracking-widest uppercase mb-3"
            style={{ color: "var(--brand-accent, #FF8A00)" }}
          >
            {branding.tagline}
          </p>
          <p className="text-lg text-gray-600 dark:text-[#c0c0eb] max-w-2xl mx-auto">
            {branding.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CvHomeCard
            title="Company Postings"
            subtitle="Recruiter, HR, or hiring manager"
            description="Post jobs, screen candidates with AI, manage references, and track your hiring funnel."
            primaryHref="/annix/orbit/register/company"
            primaryLabel="Sign up as a company"
            secondaryHref="/annix/orbit/login?type=company"
            secondaryLabel="Sign in"
            icon={
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            }
          />

          <CvHomeCard
            title="Job Seeker"
            subtitle="Job seeker or candidate"
            description="Build your CV profile, browse opportunities, get matched to jobs, and manage your applications."
            primaryHref="/annix/orbit/register/individual"
            primaryLabel="Sign up as an individual"
            secondaryHref="/annix/orbit/login?type=individual"
            secondaryLabel="Sign in"
            icon={
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            }
          />

          <CvHomeCard
            title="Student"
            subtitle="Learner planning your future"
            description="Plan your subjects and marks, see what you need for the qualification you want, and explore your options with FuturePath."
            primaryHref="/annix/orbit/register/student"
            primaryLabel="Sign up as a student"
            secondaryHref="/annix/orbit/login?type=student"
            secondaryLabel="Sign in"
            icon={
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14v5" />
              </svg>
            }
          />
        </div>

        <div className="text-center mt-8 space-y-3">
          <Link
            href="/annix/orbit/jobs"
            className="block text-[#3a3a8a] hover:text-[#1a1a4e] dark:text-[#e0e0f5] dark:hover:text-white text-sm font-medium"
          >
            Just want to look around? Browse jobs without signing up →
          </Link>
          <Link
            href="/"
            className="block text-[#3a3a8a] hover:text-[#1a1a4e] dark:text-[#c0c0eb] dark:hover:text-white text-sm"
          >
            Back to Annix Platform
          </Link>
        </div>
      </div>
    </div>
  );
}

function CvHomeCard(props: {
  title: string;
  subtitle: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-[#e0e0f5] rounded-xl mb-5">
        {props.icon}
      </div>
      <h2 className="text-2xl font-bold text-gray-900">{props.title}</h2>
      <p className="text-sm text-[#323288] dark:text-[#9ea0e8] font-medium mt-1">
        {props.subtitle}
      </p>
      <p className="text-gray-600 mt-4 flex-1">{props.description}</p>
      <div className="mt-6 space-y-3">
        <Link
          href={props.primaryHref}
          className="block text-center bg-[#323288] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#252560] transition-colors"
        >
          {props.primaryLabel}
        </Link>
        <Link
          href={props.secondaryHref}
          className="block text-center bg-white text-[#252560] py-3 px-4 rounded-lg font-medium border border-[#c0c0eb] hover:bg-[#f0f0fc] dark:text-white dark:border-[#4a4da3] dark:hover:bg-white/10 transition-colors"
        >
          {props.secondaryLabel}
        </Link>
      </div>
    </div>
  );
}
