"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import { useToast } from "@/app/components/Toast";
import { toastError } from "@/app/lib/api/apiError";
import {
  type AuCocStatus,
  auRubberApiClient,
  type RubberAuCocDto,
} from "@/app/lib/api/auRubberApi";
import { formatDateTimeZA } from "@/app/lib/datetime";

export default function AuCocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [coc, setCoc] = useState<RubberAuCocDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const pdfPreviewModal = usePdfPreview();

  const cocId = Number(params.id);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const cocData = await auRubberApiClient.auCocById(cocId);
      setCoc(cocData);
      setError(null);

      if (cocData.generatedPdfPath) {
        const blob = await auRubberApiClient.auCocPdfBlob(cocId);
        const blobUrl = URL.createObjectURL(blob);
        if (pdfBlobUrl) {
          URL.revokeObjectURL(pdfBlobUrl);
        }
        setPdfBlobUrl(blobUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (cocId) {
      fetchData();
    }
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [cocId]);

  const handleGeneratePdf = async () => {
    try {
      setIsGenerating(true);
      await auRubberApiClient.generateAuCocPdf(cocId);
      showToast("PDF generated successfully", "success");
      fetchData();
    } catch (err) {
      toastError(showToast, err, "Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!sendEmail) {
      showToast("Please enter an email address", "error");
      return;
    }
    try {
      setIsSending(true);
      await auRubberApiClient.sendAuCoc(cocId, sendEmail);
      showToast("Certificate sent successfully", "success");
      setShowSendModal(false);
      setSendEmail("");
      fetchData();
    } catch (err) {
      toastError(showToast, err, "Failed to send certificate");
    } finally {
      setIsSending(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await auRubberApiClient.approveAuCoc(cocId);
      showToast("Certificate approved", "success");
      fetchData();
    } catch (err) {
      toastError(showToast, err, "Failed to approve certificate");
    } finally {
      setIsApproving(false);
    }
  };

  const handleAutoSend = async () => {
    try {
      setIsAutoSending(true);
      await auRubberApiClient.autoSendAuCoc(cocId);
      showToast("Certificate sent to customer", "success");
      fetchData();
    } catch (err) {
      toastError(showToast, err, "Failed to send certificate");
    } finally {
      setIsAutoSending(false);
    }
  };

  const handleRecheckReadiness = async () => {
    try {
      setIsRechecking(true);
      await auRubberApiClient.recheckAuCocReadiness(cocId);
      showToast("Readiness re-checked", "success");
      fetchData();
    } catch (err) {
      toastError(showToast, err, "Failed to re-check readiness");
    } finally {
      setIsRechecking(false);
    }
  };

  const handleDownload = () => {
    if (!coc) return;
    pdfPreviewModal.openWithFetch(
      () => auRubberApiClient.downloadAuCocPdf(coc.id),
      `${coc.cocNumber}.pdf`,
    );
  };

  const statusBadge = (status: AuCocStatus) => {
    const colors: Record<AuCocStatus, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      GENERATED: "bg-blue-100 text-blue-800",
      APPROVED: "bg-amber-100 text-amber-800",
      SENT: "bg-green-100 text-green-800",
    };
    const labels: Record<AuCocStatus, string> = {
      DRAFT: "Draft",
      GENERATED: "Generated",
      APPROVED: "Approved",
      SENT: "Sent",
    };
    return (
      <span
        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
      </div>
    );
  }

  if (error || !coc) {
    const rawErrorMessage = error?.message;
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{rawErrorMessage || "Certificate not found"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const rawCocCustomerCompanyName = coc.customerCompanyName;
  const rawItemsLength = coc.items?.length;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "AU Certificates", href: "/au-rubber/portal/au-cocs" },
          { label: coc.cocNumber },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{coc.cocNumber}</h1>
          <div className="mt-2">{statusBadge(coc.status)}</div>
        </div>
        <div className="flex space-x-3">
          {coc.status === "DRAFT" && (
            <button
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate PDF"}
            </button>
          )}
          {coc.status === "GENERATED" && (
            <>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {isDownloading ? "Downloading..." : "Download PDF"}
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {isApproving ? "Approving..." : "Approve"}
              </button>
            </>
          )}
          {coc.status === "APPROVED" && (
            <>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {isDownloading ? "Downloading..." : "Download PDF"}
              </button>
              <button
                onClick={handleAutoSend}
                disabled={isAutoSending}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {isAutoSending ? "Sending..." : "Send to Customer"}
              </button>
              <button
                onClick={() => setShowSendModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Send to Different Email
              </button>
            </>
          )}
          {coc.status === "SENT" && coc.generatedPdfPath && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {isDownloading ? "Downloading..." : "Download PDF"}
            </button>
          )}
        </div>
      </div>

      {pdfBlobUrl && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="font-medium text-gray-900">Certificate Preview</span>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-yellow-600 hover:text-yellow-800"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {isDownloading ? "Downloading..." : "Download PDF"}
            </button>
          </div>
          <iframe
            src={pdfBlobUrl}
            className="w-full h-[700px]"
            title="Certificate of Conformance"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Certificate Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">CoC Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{coc.cocNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Customer</dt>
              <dd className="mt-1 text-sm text-gray-900">{rawCocCustomerCompanyName || "-"}</dd>
            </div>
            {coc.poNumber && (
              <div>
                <dt className="text-sm font-medium text-gray-500">PO Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{coc.poNumber}</dd>
              </div>
            )}
            {coc.deliveryNoteRef && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Delivery Note Ref</dt>
                <dd className="mt-1 text-sm text-gray-900">{coc.deliveryNoteRef}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">{coc.statusLabel}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDateTimeZA(coc.createdAt)}
                {coc.createdBy && <span className="text-gray-500 ml-1">by {coc.createdBy}</span>}
              </dd>
            </div>
            {coc.sentAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Sent</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTimeZA(coc.sentAt)}
                  {coc.sentToEmail && (
                    <span className="text-gray-500 ml-1">to {coc.sentToEmail}</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Number of Rolls</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {(() => {
                  const extractedLen = coc.extractedRollData?.length;
                  return rawItemsLength || extractedLen || 0;
                })()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Weight</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {(() => {
                  if (coc.items && coc.items.length > 0) {
                    return coc.items
                      .reduce((sum, item) => {
                        const testData = item.testDataSummary as Record<string, unknown> | null;
                        const weight = testData?.rollWeightKg as number | undefined;
                        return sum + (weight || 0);
                      }, 0)
                      .toFixed(2);
                  }
                  if (coc.extractedRollData && coc.extractedRollData.length > 0) {
                    return coc.extractedRollData
                      .reduce((sum, roll) => {
                        const rawRollWeightKg = roll.weightKg;
                        return sum + (rawRollWeightKg || 0);
                      }, 0)
                      .toFixed(2);
                  }
                  return "0.00";
                })()} kg
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {coc.readinessDetails && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Document Chain
              {coc.readinessStatus === "AUTO_GENERATED" && (
                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-700">
                  Auto-generated
                </span>
              )}
              {coc.readinessStatus &&
                coc.readinessStatus !== "AUTO_GENERATED" &&
                coc.readinessStatus !== "READY" && (
                  <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-700">
                    {coc.readinessStatus.replace(/_/g, " ")}
                  </span>
                )}
            </h2>
            {coc.status === "DRAFT" && (
              <button
                onClick={handleRecheckReadiness}
                disabled={isRechecking}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {isRechecking ? "Re-checking..." : "Re-check Readiness"}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 uppercase">Calenderer CoC</div>
              {coc.readinessDetails.calendererCocId ? (
                <Link
                  href={`/au-rubber/portal/supplier-cocs/${coc.readinessDetails.calendererCocId}`}
                  className="mt-1 text-sm text-yellow-600 hover:text-yellow-800 font-medium"
                >
                  CoC #{coc.readinessDetails.calendererCocId}
                </Link>
              ) : (
                <div className="mt-1 text-sm text-gray-400">Not linked</div>
              )}
              <div className="mt-1">
                {coc.readinessDetails.calendererApproved ? (
                  <span className="text-xs text-green-600">Approved</span>
                ) : (
                  <span className="text-xs text-orange-500">Pending</span>
                )}
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 uppercase">Compounder CoC</div>
              {coc.readinessDetails.compounderCocId ? (
                <Link
                  href={`/au-rubber/portal/supplier-cocs/${coc.readinessDetails.compounderCocId}`}
                  className="mt-1 text-sm text-yellow-600 hover:text-yellow-800 font-medium"
                >
                  CoC #{coc.readinessDetails.compounderCocId}
                </Link>
              ) : (
                <div className="mt-1 text-sm text-gray-400">Not linked</div>
              )}
              <div className="mt-1">
                {coc.readinessDetails.compounderApproved ? (
                  <span className="text-xs text-green-600">Approved</span>
                ) : (
                  <span className="text-xs text-orange-500">Pending</span>
                )}
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 uppercase">Rheometer Graph</div>
              {coc.readinessDetails.graphPdfPath ? (
                <div className="mt-1 text-sm text-green-600">Available</div>
              ) : (
                <div className="mt-1 text-sm text-orange-500">Missing</div>
              )}
            </div>
          </div>
          {coc.readinessDetails.missingDocuments.length > 0 && (
            <div className="mt-3 text-sm text-orange-600">
              Missing: {coc.readinessDetails.missingDocuments.join(", ")}
            </div>
          )}
          {coc.readinessDetails.lastCheckedAt && (
            <div className="mt-2 text-xs text-gray-400">
              Last checked: {formatDateTimeZA(coc.readinessDetails.lastCheckedAt)}
            </div>
          )}
        </div>
      )}

      {coc.extractedRollData &&
        coc.extractedRollData.length > 0 &&
        (!coc.items || coc.items.length === 0) && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Included Rolls (from Delivery Note)
              </h2>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Roll Number
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Thickness (mm)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Width (mm)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Length (m)
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Weight (kg)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coc.extractedRollData.map((roll, index) => {
                  const rawRollThicknessMm = roll.thicknessMm;
                  const rawRollWidthMm = roll.widthMm;
                  const rawRollLengthM = roll.lengthM;
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {roll.rollNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rawRollThicknessMm || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rawRollWidthMm || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rawRollLengthM || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {roll.weightKg != null ? roll.weightKg.toFixed(2) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {coc.items && coc.items.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Included Rolls</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Roll Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Shore A
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Specific Gravity
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Tensile (MPa)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Elongation (%)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Weight (kg)
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {coc.items.map((item) => {
                const rawItemRollNumber = item.rollNumber;
                const testData = item.testDataSummary as Record<string, unknown> | null;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rawItemRollNumber || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(testData?.avgShoreA as number)?.toFixed(1) || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(testData?.avgSpecificGravity as number)?.toFixed(2) || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(testData?.avgTensile as number)?.toFixed(1) || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(testData?.avgElongation as number)?.toFixed(0) || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(testData?.rollWeightKg as number)?.toFixed(2) || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/au-rubber/portal/roll-stock/${item.rollStockId}`}
                        className="text-yellow-600 hover:text-yellow-800"
                      >
                        View Roll
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showSendModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setShowSendModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Certificate</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recipient Email</label>
                  <input
                    type="email"
                    value={sendEmail}
                    onChange={(e) => setSendEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="customer@example.com"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending || !sendEmail}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <PdfPreviewModal state={pdfPreviewModal.state} onClose={pdfPreviewModal.close} />
    </div>
  );
}
