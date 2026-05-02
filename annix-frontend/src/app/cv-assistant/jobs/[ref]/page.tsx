"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cvAssistantApiClient, type PublicJobPosting } from "@/app/lib/api/cvAssistantApi";
import { formatDateLongZA } from "@/app/lib/datetime";

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
  learnership: "Learnership",
};

function formatSalaryBand(job: PublicJobPosting): string | null {
  const min = job.salaryMin;
  const max = job.salaryMax;
  const rawCurrency = job.salaryCurrency;
  const currency = rawCurrency || "ZAR";
  if (!min && !max) return null;
  if (min && max) return `${currency} ${min.toLocaleString()} – ${max.toLocaleString()} per month`;
  if (min) return `From ${currency} ${min.toLocaleString()} per month`;
  return `Up to ${currency} ${(max ?? 0).toLocaleString()} per month`;
}

export default function PublicJobPostingPage() {
  const params = useParams<{ ref: string }>();
  const rawRef = params?.ref;
  const refParam = rawRef ?? "";
  const [job, setJob] = useState<PublicJobPosting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!refParam) return;
    setIsLoading(true);
    cvAssistantApiClient
      .publicJobPosting(refParam)
      .then((result) => {
        setJob(result);
        setError(null);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Job not found";
        setError(message);
        setJob(null);
      })
      .finally(() => setIsLoading(false));
  }, [refParam]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-violet-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Job not available</h1>
          <p className="text-gray-600 mb-6">
            This job posting could not be found, or it has been closed.
          </p>
          <Link
            href="/cv-assistant/jobs"
            className="inline-block bg-violet-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-violet-700 transition-colors"
          >
            Browse other jobs
          </Link>
        </div>
      </div>
    );
  }

  const salaryBand = formatSalaryBand(job);
  const employmentType = job.employmentType;
  const employmentLabelLookup = employmentType ? EMPLOYMENT_TYPE_LABELS[employmentType] : null;
  const employmentLabel = employmentType ? employmentLabelLookup || employmentType : null;
  const description = job.description;
  const requiredSkills = job.requiredSkills;
  const requiredCertifications = job.requiredCertifications;
  const requiredEducation = job.requiredEducation;
  const minExperience = job.minExperienceYears;
  const applyEmail = job.applyByEmail;
  const companyName = job.companyName;
  const postedAtIso = job.postedAt;
  const postedAtLabel = formatDateLongZA(postedAtIso);
  const responseDays = job.responseTimelineDays;
  const subjectLine = `Application for ${job.title} (${job.referenceNumber})`;
  const mailtoSubject = encodeURIComponent(subjectLine);
  const mailtoLink = applyEmail ? `mailto:${applyEmail}?subject=${mailtoSubject}` : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-violet-900">
      <header className="bg-white/10 backdrop-blur border-b border-white/20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/cv-assistant" className="text-white font-semibold">
            CV Assistant
          </Link>
          <Link href="/cv-assistant/login" className="text-sm text-violet-200 hover:text-white">
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">
                Posted by {companyName || "a verified employer"}
              </p>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
            </div>
            <span className="inline-block bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full">
              {job.referenceNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm">
            {job.location ? (
              <div className="flex items-center gap-2 text-gray-700">
                <svg
                  className="w-4 h-4 text-violet-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {job.location}
                {job.province ? `, ${job.province}` : ""}
              </div>
            ) : null}
            {employmentLabel ? (
              <div className="flex items-center gap-2 text-gray-700">
                <svg
                  className="w-4 h-4 text-violet-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {employmentLabel}
              </div>
            ) : null}
            {salaryBand ? (
              <div className="flex items-center gap-2 text-gray-700">
                <svg
                  className="w-4 h-4 text-violet-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {salaryBand}
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-gray-700">
              <svg
                className="w-4 h-4 text-violet-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Posted {postedAtLabel}
            </div>
          </div>

          {description ? (
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line border-t border-gray-100 pt-6 mb-6">
              {description}
            </div>
          ) : null}

          {minExperience != null ||
          requiredEducation ||
          requiredSkills.length > 0 ||
          requiredCertifications.length > 0 ? (
            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Minimum requirements</h2>
              <ul className="text-sm text-gray-700 space-y-2">
                {minExperience != null ? (
                  <li>
                    <span className="font-medium">Experience:</span> at least {minExperience} years
                  </li>
                ) : null}
                {requiredEducation ? (
                  <li>
                    <span className="font-medium">Education:</span> {requiredEducation}
                  </li>
                ) : null}
                {requiredSkills.length > 0 ? (
                  <li>
                    <span className="font-medium">Skills:</span>{" "}
                    <span className="inline-flex flex-wrap gap-1.5 mt-1">
                      {requiredSkills.map((skill) => (
                        <span
                          key={skill}
                          className="bg-violet-50 text-violet-700 text-xs px-2 py-0.5 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </span>
                  </li>
                ) : null}
                {requiredCertifications.length > 0 ? (
                  <li>
                    <span className="font-medium">Certifications:</span>{" "}
                    <span className="inline-flex flex-wrap gap-1.5 mt-1">
                      {requiredCertifications.map((cert) => (
                        <span
                          key={cert}
                          className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded"
                        >
                          {cert}
                        </span>
                      ))}
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">How to apply</h2>
          <p className="text-sm text-gray-600 mb-4">
            Email your CV and qualifications to the address below.{" "}
            <strong>
              The reference number{" "}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                {job.referenceNumber}
              </code>{" "}
              must appear in your subject line
            </strong>{" "}
            so we can match your application to this role.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
            <div>
              <span className="text-gray-500 text-xs uppercase tracking-wide">Email to</span>
              <p className="font-mono text-gray-900 mt-0.5">
                {applyEmail || "Apply via the company"}
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-xs uppercase tracking-wide">Subject line</span>
              <p className="font-mono text-gray-900 mt-0.5">{subjectLine}</p>
            </div>
            <div>
              <span className="text-gray-500 text-xs uppercase tracking-wide">Attach</span>
              <p className="text-gray-900 mt-0.5">
                PDF or Word CV plus any relevant qualification certificates
              </p>
            </div>
          </div>

          {mailtoLink ? (
            <a
              href={mailtoLink}
              className="mt-5 inline-block bg-violet-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-violet-700 transition-colors"
            >
              Open email to apply
            </a>
          ) : null}

          <p className="text-xs text-gray-500 mt-4">
            We will get back to you within {responseDays} day{responseDays === 1 ? "" : "s"} of
            receiving your application. Applicants who do not meet the minimum requirements will
            receive an automated decline.
          </p>
        </div>
      </main>
    </div>
  );
}
