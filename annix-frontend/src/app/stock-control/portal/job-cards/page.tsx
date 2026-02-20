"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import type { JobCard } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

const STATUS_TABS = ["all", "draft", "active", "completed", "cancelled"] as const;

function statusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return colors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
}

export default function JobCardsPage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    jobNumber: "",
    jobName: "",
    customerName: "",
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchJobCards = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = activeTab === "all" ? undefined : activeTab;
      const data = await stockControlApiClient.jobCards(status);
      setJobCards(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load job cards"));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchJobCards();
  }, [fetchJobCards]);

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      await stockControlApiClient.createJobCard({
        ...createForm,
        status: "draft",
      });
      setShowCreateForm(false);
      setCreateForm({ jobNumber: "", jobName: "", customerName: "", description: "" });
      fetchJobCards();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create job card"));
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading && jobCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job cards...</p>
        </div>
      </div>
    );
  }

  if (error && jobCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Cards</h1>
          <p className="mt-1 text-sm text-gray-600">Manage job cards and stock allocations</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Job Card
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {jobCards.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No job cards found</h3>
            <p className="mt-1 text-sm text-gray-500">Create a new job card to get started.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Number</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobCards.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/stock-control/portal/job-cards/${job.id}`}
                      className="text-sm font-medium text-teal-700 hover:text-teal-900"
                    >
                      {job.jobNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.jobName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{job.customerName || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeColor(job.status)}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateZA(job.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateForm(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">New Job Card</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Job Number</label>
                    <input
                      type="text"
                      value={createForm.jobNumber}
                      onChange={(e) => setCreateForm({ ...createForm, jobNumber: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Job Name</label>
                    <input
                      type="text"
                      value={createForm.jobName}
                      onChange={(e) => setCreateForm({ ...createForm, jobName: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <input
                    type="text"
                    value={createForm.customerName}
                    onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !createForm.jobNumber || !createForm.jobName}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isCreating ? "Creating..." : "Create Job Card"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
