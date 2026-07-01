import { portalForCode } from "@annix/product-data/portals";
// eslint-disable-next-line no-restricted-imports -- server component: the "use client" datetime wrapper cannot be imported here; this page is server-rendered so JSON-LD lands in the initial HTML for Google for Jobs.
import { DateTime } from "luxon";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PublicJobPosting } from "@/app/lib/api/annixOrbitApi";
import { serverApiBaseUrl } from "@/lib/server-api-base";
import { ShareButtons } from "./ShareButtons";

const EXPIRY_FALLBACK_DAYS = 60;

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  temporary: "Temporary",
  internship: "Internship",
  learnership: "Learnership",
};

const SCHEMA_EMPLOYMENT_TYPE: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  temporary: "TEMPORARY",
  internship: "INTERN",
  learnership: "OTHER",
};

interface JobPostingSchema {
  "@context": "https://schema.org/";
  "@type": "JobPosting";
  title: string;
  description: string;
  datePosted: string;
  validThrough?: string;
  employmentType?: string;
  hiringOrganization: { "@type": "Organization"; name: string };
  jobLocation: {
    "@type": "Place";
    address: {
      "@type": "PostalAddress";
      addressLocality?: string;
      addressRegion?: string;
      addressCountry: string;
    };
  };
  baseSalary?: {
    "@type": "MonetaryAmount";
    currency: string;
    value: {
      "@type": "QuantitativeValue";
      minValue?: number;
      maxValue?: number;
      unitText: "MONTH";
    };
  };
  identifier: { "@type": "PropertyValue"; name: string; value: string };
  directApply: boolean;
}

async function fetchPublicJob(ref: string): Promise<PublicJobPosting | null> {
  try {
    const base = await serverApiBaseUrl("annix-orbit");
    const res = await fetch(`${base}/annix-orbit/public/job-postings/${encodeURIComponent(ref)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicJobPosting;
  } catch {
    return null;
  }
}

async function canonicalJobUrl(ref: string): Promise<string> {
  const headersList = await headers();
  const host = (headersList.get("host") ?? portalForCode("annix-orbit").prodHost).split(":")[0];
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}/jobs/${encodeURIComponent(ref)}`;
}

function validThroughFor(job: PublicJobPosting): string | null {
  if (job.validThrough) return job.validThrough;
  return DateTime.fromISO(job.postedAt).plus({ days: EXPIRY_FALLBACK_DAYS }).toISO();
}

function buildJobPostingSchema(job: PublicJobPosting): JobPostingSchema {
  const employmentType = job.employmentType ? SCHEMA_EMPLOYMENT_TYPE[job.employmentType] : null;
  const rawCurrency = job.salaryCurrency;
  const currency = rawCurrency || "ZAR";
  const hasSalary = job.salaryMin !== null || job.salaryMax !== null;
  const validThrough = validThroughFor(job);

  const schema: JobPostingSchema = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.description ? job.description : job.title,
    datePosted: job.postedAt,
    hiringOrganization: {
      "@type": "Organization",
      name: job.companyName ? job.companyName : "Confidential employer",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location ? job.location : undefined,
        addressRegion: job.province ? job.province : undefined,
        addressCountry: "ZA",
      },
    },
    identifier: {
      "@type": "PropertyValue",
      name: job.companyName ? job.companyName : "Annix Orbit",
      value: job.referenceNumber,
    },
    directApply: false,
  };

  if (validThrough) schema.validThrough = validThrough;
  if (employmentType) schema.employmentType = employmentType;
  if (hasSalary) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency,
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salaryMin !== null ? job.salaryMin : undefined,
        maxValue: job.salaryMax !== null ? job.salaryMax : undefined,
        unitText: "MONTH",
      },
    };
  }

  return schema;
}

function formatSalaryBand(job: PublicJobPosting): string | null {
  const { salaryMin: min, salaryMax: max } = job;
  const rawCurrency = job.salaryCurrency;
  const currency = rawCurrency || "ZAR";
  if (!min && !max) return null;
  if (min && max) return `${currency} ${min.toLocaleString()} – ${max.toLocaleString()} per month`;
  if (min) return `From ${currency} ${min.toLocaleString()} per month`;
  return `Up to ${currency} ${(max ?? 0).toLocaleString()} per month`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string }>;
}): Promise<Metadata> {
  const { ref } = await params;
  const job = await fetchPublicJob(ref);
  if (!job) {
    return { title: "Job not available — Annix Orbit", robots: { index: false, follow: false } };
  }
  const canonical = await canonicalJobUrl(ref);
  const locationSuffix = job.location ? ` — ${job.location}` : "";
  const description = (job.description ? job.description : job.title)
    .replace(/\s+/g, " ")
    .slice(0, 160);
  return {
    title: `${job.title}${locationSuffix} | Annix Orbit`,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { title: job.title, description, url: canonical, type: "website" },
  };
}

export default async function PublicJobPostingPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const job = await fetchPublicJob(ref);
  if (!job) notFound();

  const canonical = await canonicalJobUrl(ref);
  const salaryBand = formatSalaryBand(job);
  const employmentTypeKey = job.employmentType;
  const employmentLabelLookup = employmentTypeKey
    ? EMPLOYMENT_TYPE_LABELS[employmentTypeKey]
    : null;
  const employmentLabel = employmentTypeKey ? (employmentLabelLookup ?? employmentTypeKey) : null;
  const companyName = job.companyName;
  const applyEmail = job.applyByEmail;
  const minExperience = job.minExperienceYears;
  const requiredEducation = job.requiredEducation;
  const requiredSkills = job.requiredSkills;
  const requiredCertifications = job.requiredCertifications;
  const hasRequirements =
    minExperience != null ||
    Boolean(requiredEducation) ||
    requiredSkills.length > 0 ||
    requiredCertifications.length > 0;
  const postedAtLabel = DateTime.fromISO(job.postedAt).toFormat("d LLLL yyyy");
  const subjectLine = `Application for ${job.title} (${job.referenceNumber})`;
  const mailtoLink = applyEmail
    ? `mailto:${applyEmail}?subject=${encodeURIComponent(subjectLine)}`
    : null;

  const jobPostingJsonLd = JSON.stringify(buildJobPostingSchema(job))
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data for Google for Jobs indexing
        dangerouslySetInnerHTML={{ __html: jobPostingJsonLd }}
      />
      <header className="bg-white/10 backdrop-blur border-b border-white/20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/annix/orbit" className="text-white font-semibold">
            Annix Orbit
          </Link>
          <Link href="/annix/orbit/login" className="text-sm text-[#c0c0eb] hover:text-white">
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
            <span className="inline-block bg-[#e0e0f5] text-[#252560] text-xs font-semibold px-3 py-1 rounded-full">
              {job.referenceNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm">
            {job.location ? (
              <div className="flex items-center gap-2 text-gray-700">
                {job.location}
                {job.province ? `, ${job.province}` : ""}
              </div>
            ) : null}
            {employmentLabel ? (
              <div className="flex items-center gap-2 text-gray-700">{employmentLabel}</div>
            ) : null}
            {salaryBand ? (
              <div className="flex items-center gap-2 text-gray-700">{salaryBand}</div>
            ) : null}
            <div className="flex items-center gap-2 text-gray-700">Posted {postedAtLabel}</div>
          </div>

          {job.description ? (
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line border-t border-gray-100 pt-6 mb-6">
              {job.description}
            </div>
          ) : null}

          {hasRequirements ? (
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
                          className="bg-[#f0f0fc] text-[#252560] text-xs px-2 py-0.5 rounded"
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

          <div className="border-t border-gray-100 pt-6 mt-6">
            <ShareButtons url={canonical} title={job.title} />
          </div>
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

          <div className="bg-gray-50 border border-[#e0e0f5] rounded-lg p-4 space-y-3 text-sm">
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
              className="mt-5 inline-block bg-[#323288] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#252560] transition-colors"
            >
              Open email to apply
            </a>
          ) : null}

          <p className="text-xs text-gray-500 mt-4">
            We will get back to you within {job.responseTimelineDays} day
            {job.responseTimelineDays === 1 ? "" : "s"} of receiving your application. Applicants
            who do not meet the minimum requirements will receive an automated decline.
          </p>
        </div>
      </main>
    </div>
  );
}
