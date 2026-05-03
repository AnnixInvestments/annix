"use client";

import Link from "next/link";

export default function CvAssistantHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur rounded-2xl mb-6">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">CV Assistant</h1>
          <p className="text-lg text-[#c0c0eb]">Choose how you want to use CV Assistant</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CvHomeCard
            title="I'm a Company"
            subtitle="Recruiter, HR, or hiring manager"
            description="Post jobs, screen candidates with AI, manage references, and track your hiring funnel."
            primaryHref="/cv-assistant/register/company"
            primaryLabel="Sign up as a company"
            secondaryHref="/cv-assistant/login?type=company"
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
            title="I'm an Individual"
            subtitle="Job seeker or candidate"
            description="Build your CV profile, browse opportunities, get matched to jobs, and manage your applications."
            primaryHref="/cv-assistant/register/individual"
            primaryLabel="Sign up as an individual"
            secondaryHref="/cv-assistant/login?type=individual"
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
        </div>

        <div className="text-center mt-8 space-y-3">
          <Link
            href="/cv-assistant/jobs"
            className="block text-[#e0e0f5] hover:text-white text-sm font-medium"
          >
            Just want to look around? Browse jobs without signing up →
          </Link>
          <Link href="/" className="block text-[#c0c0eb] hover:text-white text-sm">
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
      <p className="text-sm text-[#323288] font-medium mt-1">{props.subtitle}</p>
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
          className="block text-center bg-white text-[#252560] py-3 px-4 rounded-lg font-medium border border-[#c0c0eb] hover:bg-[#f0f0fc] transition-colors"
        >
          {props.secondaryLabel}
        </Link>
      </div>
    </div>
  );
}
