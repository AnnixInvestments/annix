"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { JobCard } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { setPendingImportFile } from "./import/pending-file";

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
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [createForm, setCreateForm] = useState({
    jobNumber: "",
    jcNumber: "",
    pageNumber: "",
    jobName: "",
    customerName: "",
    description: "",
    poNumber: "",
    siteLocation: "",
    contactPerson: "",
    dueDate: "",
    notes: "",
    reference: "",
  });
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isModalDragging, setIsModalDragging] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const navigateWithFile = (file: File) => {
    setPendingImportFile(file);
    router.push("/stock-control/portal/job-cards/import");
  };

  const handleImportDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      navigateWithFile(files[0]);
    }
  };

  const handleImportDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleImportDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleImportDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleImportFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      navigateWithFile(selectedFile);
    }
  };

  const handleModalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setShowCreateForm(false);
      navigateWithFile(files[0]);
    }
  };

  const handleModalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setIsModalDragging(true);
  };

  const handleModalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsModalDragging(false);
    }
  };

  const handleModalFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setShowCreateForm(false);
      navigateWithFile(selectedFile);
    }
  };

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
      setCreateForm({
        jobNumber: "",
        jcNumber: "",
        pageNumber: "",
        jobName: "",
        customerName: "",
        description: "",
        poNumber: "",
        siteLocation: "",
        contactPerson: "",
        dueDate: "",
        notes: "",
        reference: "",
      });
      fetchJobCards();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create job card"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number, jobNumber: string) => {
    if (!window.confirm(`Delete job card ${jobNumber}? This cannot be undone.`)) return;
    try {
      setDeletingId(id);
      await stockControlApiClient.deleteJobCard(id);
      fetchJobCards();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete job card"));
    } finally {
      setDeletingId(null);
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
    <div
      className="space-y-6 relative"
      onDrop={handleImportDrop}
      onDragOver={handleImportDragOver}
      onDragEnter={handleImportDragEnter}
      onDragLeave={handleImportDragLeave}
    >
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-teal-50 bg-opacity-90 border-2 border-dashed border-teal-500 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-teal-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-lg font-medium text-teal-700">Drop file to import job cards</p>
            <p className="text-sm text-teal-600">Supports Excel, CSV, and PDF files</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Cards</h1>
          <p className="mt-1 text-sm text-gray-600">Manage job cards and stock allocations</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.pdf,.csv"
            onChange={handleImportFileInput}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Import
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Job Card
          </button>
        </div>
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
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No job cards found</h3>
            <p className="mt-1 text-sm text-gray-500">Create a new job card to get started.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Job Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  JC Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Page
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Job Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Customer
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Created
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobCards.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/stock-control/portal/job-cards/${job.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/stock-control/portal/job-cards/${job.id}`}
                      className="text-sm font-medium text-teal-700 hover:text-teal-900"
                    >
                      {job.jobNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.jcNumber || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.pageNumber || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {job.jobName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.customerName || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeColor(job.status)}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(job.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(job.id, job.jobNumber);
                      }}
                      disabled={deletingId === job.id}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                      title="Delete job card"
                    >
                      {deletingId === job.id ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowCreateForm(false)}
            ></div>
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
              onDrop={handleModalDrop}
              onDragOver={handleModalDragOver}
              onDragEnter={handleModalDragOver}
              onDragLeave={handleModalDragLeave}
            >
              <h3 className="text-lg font-medium text-gray-900 mb-4">New Job Card</h3>

              <input
                ref={modalFileInputRef}
                type="file"
                accept=".xlsx,.xls,.pdf,.csv"
                onChange={handleModalFileInput}
                className="hidden"
              />
              <div
                onClick={() => modalFileInputRef.current?.click()}
                className={`mb-6 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isModalDragging
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-300 hover:border-teal-400 hover:bg-gray-50"
                }`}
              >
                <svg
                  className={`mx-auto h-10 w-10 ${isModalDragging ? "text-teal-500" : "text-gray-400"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mt-2 text-sm font-medium text-gray-700">
                  {isModalDragging ? "Drop to import" : "Drag & drop or click to import"}
                </p>
                <p className="mt-1 text-xs text-gray-500">Excel, CSV, or PDF</p>
              </div>

              <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <span className="relative bg-white px-3 text-sm text-gray-500">
                  or create manually
                </span>
              </div>

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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">JC Number</label>
                    <input
                      type="text"
                      value={createForm.jcNumber}
                      onChange={(e) => setCreateForm({ ...createForm, jcNumber: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Page Number</label>
                    <input
                      type="text"
                      value={createForm.pageNumber}
                      onChange={(e) => setCreateForm({ ...createForm, pageNumber: e.target.value })}
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
                <div className="border-t border-gray-200 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${showAdditionalDetails ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    Additional Details
                  </button>
                  {showAdditionalDetails && (
                    <div className="mt-3 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            PO Number
                          </label>
                          <input
                            type="text"
                            value={createForm.poNumber}
                            onChange={(e) =>
                              setCreateForm({ ...createForm, poNumber: e.target.value })
                            }
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Reference
                          </label>
                          <input
                            type="text"
                            value={createForm.reference}
                            onChange={(e) =>
                              setCreateForm({ ...createForm, reference: e.target.value })
                            }
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Site / Location
                          </label>
                          <input
                            type="text"
                            value={createForm.siteLocation}
                            onChange={(e) =>
                              setCreateForm({ ...createForm, siteLocation: e.target.value })
                            }
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Contact Person
                          </label>
                          <input
                            type="text"
                            value={createForm.contactPerson}
                            onChange={(e) =>
                              setCreateForm({ ...createForm, contactPerson: e.target.value })
                            }
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Due Date</label>
                        <input
                          type="text"
                          value={createForm.dueDate}
                          onChange={(e) =>
                            setCreateForm({ ...createForm, dueDate: e.target.value })
                          }
                          placeholder="e.g. 2025-03-15"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                          value={createForm.notes}
                          onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  )}
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
