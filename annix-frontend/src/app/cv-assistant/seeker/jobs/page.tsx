"use client";

export default function SeekerJobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Browse Jobs</h1>
        <p className="text-gray-600 mt-2">Opportunities tailored to your CV.</p>
      </div>

      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <h2 className="text-lg font-semibold text-gray-900">Coming soon</h2>
        <p className="text-gray-600 mt-2 max-w-md mx-auto">
          Once your CV is uploaded, we will show jobs from companies on the platform and external
          sources, ranked by how well they match your skills and experience.
        </p>
      </div>
    </div>
  );
}
