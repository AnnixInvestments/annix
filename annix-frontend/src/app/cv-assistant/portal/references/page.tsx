"use client";

import { useEffect, useState } from "react";
import { CandidateReference, cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";

export default function ReferencesPage() {
  const [references, setReferences] = useState<CandidateReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchReferences();
  }, [filter]);

  const fetchReferences = async () => {
    try {
      const data = await cvAssistantApiClient.references(filter !== "all" ? filter : undefined);
      setReferences(data);
    } catch (error) {
      console.error("Failed to fetch references:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-800",
      requested: "bg-yellow-100 text-yellow-800",
      responded: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const ratingStars = (rating: number | null) => {
    if (rating === null) return null;
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">References</h1>
        <p className="text-gray-600 mt-1">Track reference check requests and feedback</p>
      </div>

      <div className="flex items-center space-x-2">
        {["all", "requested", "responded", "expired"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? "bg-violet-100 text-violet-700"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feedback
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {references.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No references found.
                  </td>
                </tr>
              ) : (
                references.map((ref) => (
                  <tr key={ref.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{ref.name}</div>
                      <div className="text-sm text-gray-500">{ref.email}</div>
                      {ref.relationship && (
                        <div className="text-xs text-gray-400">{ref.relationship}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(ref as CandidateReference & { candidate?: { name: string } }).candidate
                          ?.name || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColor(ref.status)}`}
                      >
                        {ref.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ratingStars(ref.feedbackRating)}
                    </td>
                    <td className="px-6 py-4">
                      {ref.feedbackText ? (
                        <p
                          className="text-sm text-gray-600 max-w-xs truncate"
                          title={ref.feedbackText}
                        >
                          {ref.feedbackText}
                        </p>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
