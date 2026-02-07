"use client";

import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";
import { formatDateZA } from "@/app/lib/datetime";
import type { Boq } from "@/app/lib/query/hooks";
import { useBoqs, useUploadBoq } from "@/app/lib/query/hooks";

export default function BoqListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [activeSearch, setActiveSearch] = useState("");

  const boqQuery = useBoqs({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: activeSearch || undefined,
    page,
    limit: 20,
  });

  const uploadMutation = useUploadBoq();

  const boqs = boqQuery.data?.data ?? [];
  const pagination = {
    page: boqQuery.data?.page ?? 1,
    totalPages: boqQuery.data?.totalPages ?? 1,
    total: boqQuery.data?.total ?? 0,
  };

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = () => {
    setActiveSearch(searchTerm);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "submitted":
        return "bg-yellow-100 text-yellow-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "changes_requested":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return "N/A";
    return new Intl.NumberFormat("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string) => formatDateZA(dateString);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setUploadTitle(nameWithoutExt);
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle.trim()) return;

    uploadMutation.mutate({ file: uploadFile, title: uploadTitle, description: uploadDescription });
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadTitle("");
    setUploadDescription("");
    uploadMutation.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (boqQuery.isLoading && boqs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading BOQs...</p>
        </div>
      </div>
    );
  }

  if (boqQuery.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">✕</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{boqQuery.error.message}</p>
          <button
            onClick={() => boqQuery.refetch()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Bills of Quantities
              </h1>
              <p className="text-gray-600 mt-2">Manage your BOQs and material lists</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Upload BOQ
              </button>
              <button
                onClick={() => router.push("/boq/create")}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                + Create BOQ
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Search by BOQ number, title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-auto px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="changes_requested">Changes Requested</option>
              </select>
            </div>
          </div>
        </div>

        {/* BOQ Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{boqs.length}</span> of{" "}
            <span className="font-semibold">{pagination.total}</span> BOQs
          </p>
        </div>

        {/* BOQ List */}
        {boqs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-4xl">📋</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No BOQs Found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first BOQ"}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <button
                onClick={() => router.push("/boq/create")}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all"
              >
                Create Your First BOQ
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {boqs.map((boq: Boq) => (
                <div
                  key={boq.id}
                  onClick={() => router.push(`/boq/${boq.id}`)}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-300 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">{boq.boqNumber}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(
                              boq.status,
                            )}`}
                          >
                            {boq.status.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium">{boq.title}</p>
                        {boq.description && (
                          <p className="text-sm text-gray-500 mt-1 truncate">{boq.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        {boq.drawing && (
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Linked Drawing</p>
                            <p className="font-medium text-blue-600">{boq.drawing.drawingNumber}</p>
                          </div>
                        )}
                        {boq.rfq && (
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Linked RFQ</p>
                            <p className="font-medium text-blue-600">{boq.rfq.rfqNumber}</p>
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Updated</p>
                          <p>{formatDate(boq.updatedAt)}</p>
                        </div>
                        <span className="text-xl text-gray-400">→</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Total Quantity</p>
                        <p className="text-xl font-bold text-blue-600">
                          {formatNumber(boq.totalQuantity)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Total Weight (kg)</p>
                        <p className="text-xl font-bold text-purple-600">
                          {formatNumber(boq.totalWeightKg)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Estimated Cost (ZAR)</p>
                        <p className="text-xl font-bold text-green-600">
                          {boq.totalEstimatedCost
                            ? `R ${formatNumber(boq.totalEstimatedCost)}`
                            : "TBD"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Upload BOQ</h2>
                <button
                  onClick={closeUploadModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-1">Import BOQ from Excel or PDF file</p>
            </div>

            {uploadMutation.data ? (
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
                  BOQ Imported Successfully!
                </h3>
                <p className="text-center text-gray-600 mb-4">
                  Created BOQ:{" "}
                  <span className="font-semibold">{uploadMutation.data.boq.boqNumber}</span>
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-gray-700 mb-2">Import Summary:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {uploadMutation.data.warnings.map((warning, index) => (
                      <li
                        key={index}
                        className={warning.startsWith("Error:") ? "text-orange-600" : ""}
                      >
                        {warning.startsWith("Error:") ? "! " : "- "}
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/boq/${uploadMutation.data!.boq.id}`)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all"
                  >
                    View BOQ
                  </button>
                  <button
                    onClick={closeUploadModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                {uploadMutation.error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{uploadMutation.error.message}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* File input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select File *
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                    >
                      {uploadFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <svg
                            className="w-8 h-8 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-gray-700 font-medium">{uploadFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <svg
                            className="w-12 h-12 mx-auto text-gray-400 mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                          <p className="text-gray-600">Click to select or drag and drop</p>
                          <p className="text-sm text-gray-400 mt-1">
                            Excel (.xlsx, .xls) or PDF files
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      BOQ Title *
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="Enter BOQ title"
                      className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      placeholder="Enter description"
                      rows={3}
                      className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Format help */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 text-sm mb-2">Excel Format Tips</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>- Required columns: Description, Quantity</li>
                      <li>- Optional: Item Code, Unit, Type, Weight, Price, Notes</li>
                      <li>- Item types are auto-detected from descriptions</li>
                      <li>- First row should contain column headers</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending || !uploadFile || !uploadTitle.trim()}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
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
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        Upload & Import
                      </>
                    )}
                  </button>
                  <button
                    onClick={closeUploadModal}
                    disabled={uploadMutation.isPending}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
