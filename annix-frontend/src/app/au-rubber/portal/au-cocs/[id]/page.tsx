"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { useToast } from "@/app/components/Toast";
import {
  type AuCocStatus,
  auRubberApiClient,
  type RubberAuCocDto,
} from "@/app/lib/api/auRubberApi";

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
  const [isDownloading, setIsDownloading] = useState(false);

  const cocId = Number(params.id);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const cocData = await auRubberApiClient.auCocById(cocId);
      setCoc(cocData);
      setError(null);
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
  }, [cocId]);

  const handleGeneratePdf = async () => {
    try {
      setIsGenerating(true);
      await auRubberApiClient.generateAuCocPdf(cocId);
      showToast("PDF generated successfully", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to generate PDF", "error");
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
      showToast(err instanceof Error ? err.message : "Failed to send certificate", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = async () => {
    if (!coc) return;
    try {
      setIsDownloading(true);
      await auRubberApiClient.downloadAuCocPdf(coc.id, coc.cocNumber);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to download PDF", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const statusBadge = (status: AuCocStatus) => {
    const colors: Record<AuCocStatus, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      GENERATED: "bg-blue-100 text-blue-800",
      SENT: "bg-green-100 text-green-800",
    };
    const labels: Record<AuCocStatus, string> = {
      DRAFT: "Draft",
      GENERATED: "Generated",
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
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error?.message || "Certificate not found"}</p>
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
                onClick={() => setShowSendModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Send to Customer
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
              <dd className="mt-1 text-sm text-gray-900">{coc.customerCompanyName || "-"}</dd>
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
                {new Date(coc.createdAt).toLocaleString()}
                {coc.createdBy && <span className="text-gray-500 ml-1">by {coc.createdBy}</span>}
              </dd>
            </div>
            {coc.sentAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Sent</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(coc.sentAt).toLocaleString()}
                  {coc.sentTo && <span className="text-gray-500 ml-1">to {coc.sentTo}</span>}
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
                {coc.items?.length || 0}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Weight</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {coc.items
                  ?.reduce((sum, item) => {
                    const testData = item.testDataSummary as Record<string, unknown> | null;
                    const weight = testData?.rollWeightKg as number | undefined;
                    return sum + (weight || 0);
                  }, 0)
                  .toFixed(2) || "0.00"}{" "}
                kg
              </dd>
            </div>
          </dl>
        </div>
      </div>

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
                const testData = item.testDataSummary as Record<string, unknown> | null;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.rollNumber || "-"}
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
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
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
    </div>
  );
}
