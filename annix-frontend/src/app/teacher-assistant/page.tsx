import { GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TEACHER_ASSISTANT_VERSION } from "./config/version";

export const metadata: Metadata = {
  title: "Teacher Assistant — Coming Soon | Annix Platform",
  description:
    "AI assignment and workbook generator for high-school teachers. Process-based assignments that grade thinking, evidence, and AI critique — not recall.",
};

export default function TeacherAssistantComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-amber-100 rounded-2xl text-amber-600 mb-8">
            <GraduationCap className="w-14 h-14" strokeWidth={1.5} />
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-amber-200 text-amber-900 mb-6">
            Coming Soon
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Teacher Assistant</h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            AI assignment & workbook generator for high-school teachers (ages 12–18).
          </p>
          <p className="text-xs text-gray-400 mt-3">v{TEACHER_ASSISTANT_VERSION}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-amber-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">The idea</h2>
          <p className="text-gray-700 mb-4">
            Modern AI tools have made traditional homework trivial to fake. This app helps teachers
            create <strong>process-based</strong> assignments where students must show their
            thinking, evidence from their own world, AI critique, and reflection — not just a final
            answer.
          </p>
          <p className="text-gray-700">
            Teachers enter a subject, topic, age, and output type. The generator returns a
            ready-to-use assignment with student brief, step-by-step tasks, evidence requirements,
            controlled AI-use rules, marking rubric, and teacher notes — exportable as PDF or Word.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 border border-amber-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Status</h2>
          <p className="text-gray-700 mb-4">
            This app is currently in planning. The full design and phased build plan are tracked in
            the project issue tracker.
          </p>
          <Link
            href="/"
            className="inline-flex items-center text-amber-700 font-semibold hover:text-amber-900 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2 rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Back to Annix Platform
          </Link>
        </div>
      </div>
    </div>
  );
}
