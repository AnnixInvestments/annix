"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { DocumentReviewModal } from "@/app/admin/components/DocumentReviewModal";
import {
  DocumentPreviewModal,
  initialPreviewState,
  PreviewModalState,
} from "@/app/components/DocumentPreviewModal";
import { useToast } from "@/app/components/Toast";
import { adminApiClient, DocumentReviewData } from "@/app/lib/api/adminApi";
import { formatDateTimeZA } from "@/app/lib/datetime";
import { useAdminSupplierDetail } from "@/app/lib/query/hooks";

type TabType = "overview" | "onboarding" | "documents";

export default function SupplierDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const supplierId = parseInt(params?.id as string, 10);

  const supplierQuery = useAdminSupplierDetail(supplierId);
  const supplier = supplierQuery.data;

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [remediationSteps, setRemediationSteps] = useState("");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewModalState>(initialPreviewState);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewData, setReviewData] = useState<DocumentReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      showToast("Please provide a reason for suspension", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      await adminApiClient.suspendSupplier(supplierId, suspendReason);
      setSuspendDialogOpen(false);
      setSuspendReason("");
      showToast("Supplier account suspended", "success");
      supplierQuery.refetch();
    } catch (err: any) {
      showToast(`Failed to suspend supplier: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    if (!confirm("Are you sure you want to reactivate this supplier account?")) {
      return;
    }

    try {
      setIsSubmitting(true);
      await adminApiClient.reactivateSupplier(supplierId);
      showToast("Supplier account reactivated", "success");
      supplierQuery.refetch();
    } catch (err: any) {
      showToast(`Failed to reactivate supplier: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      await adminApiClient.approveSupplierOnboarding(supplierId);
      setApproveDialogOpen(false);
      showToast("Supplier onboarding approved", "success");
      supplierQuery.refetch();
    } catch (err: any) {
      showToast(`Failed to approve onboarding: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !remediationSteps.trim()) {
      showToast("Please provide both rejection reason and remediation steps", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      await adminApiClient.rejectSupplierOnboarding(supplierId, rejectReason, remediationSteps);
      setRejectDialogOpen(false);
      setRejectReason("");
      setRemediationSteps("");
      showToast("Supplier onboarding rejected", "success");
      supplierQuery.refetch();
    } catch (err: any) {
      showToast(`Failed to reject onboarding: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDocument = async (doc: any) => {
    setPreviewState({
      ...initialPreviewState,
      isOpen: true,
      isLoading: true,
      filename: doc.fileName,
    });
    try {
      const result = await adminApiClient.getSupplierDocumentReviewData(supplierId, doc.id);
      setPreviewState({
        isOpen: true,
        url: result.presignedUrl,
        mimeType: result.mimeType || "application/pdf",
        filename: result.fileName || doc.fileName,
        isLoading: false,
      });
    } catch (err: any) {
      showToast(`Failed to load document: ${err.message}`, "error");
      setPreviewState(initialPreviewState);
    }
  };

  const handleReviewDocument = async (doc: any) => {
    setReviewModalOpen(true);
    setReviewLoading(true);
    setReviewData(null);
    try {
      const data = await adminApiClient.getSupplierDocumentReviewData(supplierId, doc.id);
      setReviewData(data);
    } catch (err: any) {
      showToast(`Failed to load document review data: ${err.message}`, "error");
      setReviewModalOpen(false);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleApproveDocument = async () => {
    if (!reviewData) return;
    try {
      setIsSubmitting(true);
      await adminApiClient.reviewSupplierDocument(
        supplierId,
        reviewData.documentId,
        "valid",
        "Approved by admin",
      );
      showToast("Document approved", "success");
      setReviewModalOpen(false);
      supplierQuery.refetch();
    } catch (err: any) {
      showToast(`Failed to approve document: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectDocument = async (reason: string) => {
    if (!reviewData) return;
    try {
      setIsSubmitting(true);
      await adminApiClient.reviewSupplierDocument(
        supplierId,
        reviewData.documentId,
        "invalid",
        reason,
      );
      showToast("Document rejected", "success");
      setReviewModalOpen(false);
      supplierQuery.refetch();
    } catch (err: any) {
      showToast(`Failed to reject document: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReVerifyDocument = async () => {
    if (!reviewData) return;
    try {
      setIsSubmitting(true);
      const result = await adminApiClient.reVerifySupplierDocument(
        supplierId,
        reviewData.documentId,
      );
      if (result.success) {
        showToast("Document re-verified successfully", "success");
        const updatedData = await adminApiClient.getSupplierDocumentReviewData(
          supplierId,
          reviewData.documentId,
        );
        setReviewData(updatedData);
        supplierQuery.refetch();
      } else {
        showToast(result.errorMessage || "Re-verification failed", "error");
      }
    } catch (err: any) {
      showToast(`Failed to re-verify document: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadgeClass = (status: string): string => {
    switch (status?.toLowerCase()) {
      case "active":
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
      case "under_review":
      case "submitted":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
      case "rejected":
        return "bg-red-100 text-red-800";
      case "deactivated":
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A";
    return formatDateTimeZA(dateString);
  };

  if (supplierQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading supplier details...</p>
        </div>
      </div>
    );
  }

  if (supplierQuery.error || !supplier) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Supplier</div>
          <p className="text-gray-600">{supplierQuery.error?.message || "Supplier not found"}</p>
          <button
            onClick={() => router.push("/admin/portal/suppliers")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Suppliers
          </button>
        </div>
      </div>
    );
  }

  const profile = {
    firstName: supplier.firstName,
    lastName: supplier.lastName,
    email: supplier.email,
    accountStatus: supplier.accountStatus,
    createdAt: supplier.createdAt,
    jobTitle: supplier.jobTitle,
    directPhone: supplier.directPhone,
    mobilePhone: supplier.mobilePhone,
    suspendedAt: supplier.suspendedAt,
    suspensionReason: supplier.suspensionReason,
  };
  const company = supplier.company || {};
  const onboarding = supplier.onboarding || {};
  const documents = supplier.documents || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push("/admin/portal/suppliers")}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-sm text-gray-600">{supplier.email || profile.email}</p>
          </div>
          <span
            className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${statusBadgeClass(profile.accountStatus)}`}
          >
            {profile.accountStatus || "Unknown"}
          </span>
          {onboarding.status && (
            <span
              className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${statusBadgeClass(onboarding.status)}`}
            >
              Onboarding: {onboarding.status}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          {onboarding.status === "submitted" || onboarding.status === "under_review" ? (
            <>
              <button
                onClick={() => setApproveDialogOpen(true)}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50 disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Approve Onboarding
              </button>
              <button
                onClick={() => setRejectDialogOpen(true)}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Reject Onboarding
              </button>
            </>
          ) : null}
          {profile.accountStatus === "active" && (
            <button
              onClick={() => setSuspendDialogOpen(true)}
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              Suspend Account
            </button>
          )}
          {profile.accountStatus === "suspended" && (
            <button
              onClick={handleReactivate}
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Reactivate Account
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("onboarding")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "onboarding"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Onboarding
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "documents"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Documents ({documents.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {profile.firstName} {profile.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{supplier.email || profile.email}</dd>
              </div>
              {profile.jobTitle && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Job Title</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile.jobTitle}</dd>
                </div>
              )}
              {profile.directPhone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Direct Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile.directPhone}</dd>
                </div>
              )}
              {profile.mobilePhone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Mobile Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile.mobilePhone}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Company Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Company Information</h2>
            <dl className="space-y-3">
              {company.name && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{company.name}</dd>
                </div>
              )}
              {company.vatNumber && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">VAT Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{company.vatNumber}</dd>
                </div>
              )}
              {company.registrationNumber && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Registration Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{company.registrationNumber}</dd>
                </div>
              )}
              {company.physicalAddress && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Physical Address</dt>
                  <dd className="mt-1 text-sm text-gray-900">{company.physicalAddress}</dd>
                </div>
              )}
              {company.contactNumber && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Contact Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{company.contactNumber}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Account Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Account Status</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeClass(profile.accountStatus)}`}
                  >
                    {profile.accountStatus || "Unknown"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Registration Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(profile.createdAt)}</dd>
              </div>
              {profile.suspendedAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Suspended At</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(profile.suspendedAt)}</dd>
                </div>
              )}
              {profile.suspensionReason && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Suspension Reason</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile.suspensionReason}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Capabilities (if available) */}
          {supplier.capabilities && supplier.capabilities.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Capabilities</h2>
              <div className="space-y-2">
                {supplier.capabilities.map((cap: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-sm text-gray-900">
                      {cap.productCategory || cap.category}
                    </span>
                    {cap.capabilityScore && (
                      <span className="text-sm font-medium text-gray-600">
                        Score: {cap.capabilityScore}/100
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "onboarding" && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Onboarding Information</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeClass(onboarding.status)}`}
                >
                  {onboarding.status || "Not Started"}
                </span>
              </dd>
            </div>
            {onboarding.submittedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Submitted At</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(onboarding.submittedAt)}</dd>
              </div>
            )}
            {onboarding.reviewedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Reviewed At</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(onboarding.reviewedAt)}</dd>
              </div>
            )}
            {onboarding.approvedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Approved At</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(onboarding.approvedAt)}</dd>
              </div>
            )}
            {onboarding.rejectionReason && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Rejection Reason</dt>
                <dd className="mt-1 text-sm text-gray-900">{onboarding.rejectionReason}</dd>
              </div>
            )}
            {onboarding.remediationSteps && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Remediation Steps</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {onboarding.remediationSteps}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {activeTab === "documents" && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {documents.length === 0 ? (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
              <p className="mt-1 text-sm text-gray-500">
                This supplier has not uploaded any documents yet.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc: any) => (
                  <tr
                    key={doc.id}
                    className={doc.validationStatus === "manual_review" ? "bg-yellow-50" : ""}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {doc.documentType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.fileName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(doc.uploadedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeClass(doc.validationStatus)}`}
                      >
                        {doc.validationStatus || "pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleReviewDocument(doc)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Suspend Dialog */}
      {suspendDialogOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Suspend Supplier Account</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for suspending this supplier account. The supplier will be
              notified.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter reason for suspension..."
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSuspendDialogOpen(false);
                  setSuspendReason("");
                }}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? "Suspending..." : "Suspend Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectDialogOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Supplier Onboarding</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for rejection and steps the supplier should take to remediate.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Why is the onboarding being rejected?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remediation Steps
                </label>
                <textarea
                  value={remediationSteps}
                  onChange={(e) => setRemediationSteps(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What should the supplier do to address this?"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectReason("");
                  setRemediationSteps("");
                }}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? "Rejecting..." : "Reject Onboarding"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Onboarding Dialog */}
      {approveDialogOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg
                    className="w-6 h-6 text-white"
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
                </div>
                <h3 className="text-lg font-semibold text-white">Approve Supplier Onboarding</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                You are about to approve{" "}
                <strong>
                  {profile.firstName} {profile.lastName}
                </strong>{" "}
                from <strong>{company.name}</strong>.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-green-800 mb-2">This action will:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Activate the supplier account
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Send a confirmation email
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Record your approval with timestamp
                  </li>
                </ul>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setApproveDialogOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Approving...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
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
                      Approve Supplier
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        state={previewState}
        onClose={() => setPreviewState(initialPreviewState)}
      />

      {/* Document Review Modal with Nix AI */}
      <DocumentReviewModal
        isOpen={reviewModalOpen}
        data={reviewData}
        isLoading={reviewLoading}
        onClose={() => setReviewModalOpen(false)}
        onApprove={handleApproveDocument}
        onReject={handleRejectDocument}
        onReVerify={handleReVerifyDocument}
        isSubmitting={isSubmitting}
        fetchPreviewImages={(documentId) =>
          adminApiClient.getSupplierDocumentPreviewImages(supplierId, documentId)
        }
        entityType="supplier"
      />
    </div>
  );
}
