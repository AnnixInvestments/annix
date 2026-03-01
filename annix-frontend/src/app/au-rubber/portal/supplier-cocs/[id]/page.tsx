"use client";

import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CocProcessingStatus,
  type RubberCompoundBatchDto,
  type RubberSupplierCocDto,
  type SupplierCocType,
} from "@/app/lib/api/auRubberApi";
import { Breadcrumb } from "../../../components/Breadcrumb";

export default function SupplierCocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [coc, setCoc] = useState<RubberSupplierCocDto | null>(null);
  const [batches, setBatches] = useState<RubberCompoundBatchDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const cocId = Number(params.id);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [cocData, batchesData] = await Promise.all([
        auRubberApiClient.supplierCocById(cocId),
        auRubberApiClient.compoundBatchesByCocId(cocId),
      ]);
      setCoc(cocData);
      setBatches(Array.isArray(batchesData) ? batchesData : []);

      if (cocData.documentPath) {
        const url = await auRubberApiClient.documentUrl(cocData.documentPath);
        setPdfUrl(url);
      }

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

  const handleExtract = async () => {
    try {
      setIsExtracting(true);
      await auRubberApiClient.extractSupplierCoc(cocId);
      showToast("Data extracted successfully", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to extract data", "error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await auRubberApiClient.approveSupplierCoc(cocId);
      showToast("CoC approved", "success");
      router.push("/au-rubber/portal/supplier-cocs");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to approve CoC", "error");
      setIsApproving(false);
    }
  };

  const statusBadge = (status: CocProcessingStatus) => {
    const colors: Record<CocProcessingStatus, string> = {
      PENDING: "bg-gray-100 text-gray-800",
      EXTRACTED: "bg-blue-100 text-blue-800",
      NEEDS_REVIEW: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
    };
    const labels: Record<CocProcessingStatus, string> = {
      PENDING: "Pending",
      EXTRACTED: "Extracted",
      NEEDS_REVIEW: "Needs Review",
      APPROVED: "Approved",
    };
    return (
      <span
        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const typeBadge = (type: SupplierCocType) => {
    const colors: Record<SupplierCocType, string> = {
      COMPOUNDER: "bg-purple-100 text-purple-800",
      CALENDARER: "bg-indigo-100 text-indigo-800",
    };
    return (
      <span
        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${colors[type]}`}
      >
        {type}
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
          <p className="text-gray-600">{error?.message || "CoC not found"}</p>
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
          { label: "Supplier CoCs", href: "/au-rubber/portal/supplier-cocs" },
          { label: coc.cocNumber || `COC-${coc.id}` },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{coc.cocNumber || `COC-${coc.id}`}</h1>
          <div className="mt-2 flex items-center space-x-3">
            {typeBadge(coc.cocType)}
            {statusBadge(coc.processingStatus)}
          </div>
        </div>
        <div className="flex space-x-3">
          {coc.processingStatus === "PENDING" && (
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isExtracting ? "Extracting..." : "Extract Data"}
            </button>
          )}
          {(coc.processingStatus === "EXTRACTED" || coc.processingStatus === "NEEDS_REVIEW") && (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isApproving ? "Approving..." : "Approve"}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Document</span>
          </div>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-yellow-600 hover:text-yellow-800"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </a>
          )}
        </div>
        <div className="h-[600px] bg-gray-100">
          {pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-full" title="CoC Document" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No document available
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">CoC Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Supplier</dt>
              <dd className="mt-1 text-sm text-gray-900">{coc.supplierCompanyName || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">CoC Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{coc.cocTypeLabel}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Compound Code</dt>
              <dd className="mt-1 text-sm text-gray-900">{coc.compoundCode || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Production Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {coc.productionDate ? new Date(coc.productionDate).toLocaleDateString() : "-"}
              </dd>
            </div>
            {coc.cocType === "CALENDARER" && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Order Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{coc.orderNumber || "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Ticket Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{coc.ticketNumber || "-"}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(coc.createdAt).toLocaleString()}
              </dd>
            </div>
            {coc.approvedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Approved</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(coc.approvedAt).toLocaleString()}
                  {coc.approvedBy && (
                    <span className="text-gray-500 ml-1">by {coc.approvedBy}</span>
                  )}
                </dd>
              </div>
            )}
            {coc.linkedDeliveryNoteId && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Linked Delivery Note</dt>
                <dd className="mt-1 text-sm">
                  <Link
                    href={`/au-rubber/portal/delivery-notes/${coc.linkedDeliveryNoteId}`}
                    className="text-yellow-600 hover:text-yellow-800"
                  >
                    View Delivery Note
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {coc.extractedData && Object.keys(coc.extractedData).length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Extracted Data</h2>
            <pre className="text-xs bg-gray-50 p-4 rounded-md overflow-auto max-h-64">
              {JSON.stringify(coc.extractedData, null, 2)}
            </pre>
            {coc.reviewNotes && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700">Review Notes</h3>
                <p className="mt-1 text-sm text-gray-600">{coc.reviewNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {batches.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Compound Batches</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Batch
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
                  Tear (kN/m)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                {coc.cocType === "CALENDARER" && (
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    S&N CoC
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {batch.batchNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.shoreAHardness ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.specificGravity ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.tensileStrengthMpa ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.elongationPercent ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.tearStrengthKnM ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        batch.passFailStatus === "PASS"
                          ? "bg-green-100 text-green-800"
                          : batch.passFailStatus === "FAIL"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {batch.passFailStatusLabel}
                    </span>
                  </td>
                  {coc.cocType === "CALENDARER" && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {batch.supplierCocId && batch.supplierCocId !== cocId ? (
                        <Link
                          href={`/au-rubber/portal/supplier-cocs/${batch.supplierCocId}`}
                          className="text-yellow-600 hover:text-yellow-800 font-medium"
                        >
                          {batch.supplierCocNumber || `CoC-${batch.supplierCocId}`}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
