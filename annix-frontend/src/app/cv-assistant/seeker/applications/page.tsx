"use client";

export default function SeekerApplicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
        <p className="text-gray-600 mt-2">Track jobs you have applied to and their status.</p>
      </div>

      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <h2 className="text-lg font-semibold text-gray-900">Coming soon</h2>
        <p className="text-gray-600 mt-2 max-w-md mx-auto">
          Once you start applying for jobs, this is where you will see each application, the status,
          and any feedback from the company.
        </p>
      </div>
    </div>
  );
}
