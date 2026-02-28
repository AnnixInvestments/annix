"use client";

import { CheckCircle, FileText, LineChart, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import AmixLogo from "@/app/components/AmixLogo";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type CocProcessingStatus,
  type RubberSupplierCocDto,
  type SupplierCocType,
} from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto } from "@/app/lib/api/rubberPortalApi";
import { Breadcrumb } from "../../components/Breadcrumb";
import { FileDropZone } from "../../components/FileDropZone";
import {
  ITEMS_PER_PAGE,
  Pagination,
  SortDirection,
  SortIcon,
  TableIcons,
  TableLoadingState,
} from "../../components/TableComponents";

interface AnalyzedFileResult {
  filename: string;
  isGraph: boolean;
  cocType: SupplierCocType | null;
  companyId: number | null;
  companyName: string | null;
  batchNumbers: string[];
  linkedToIndex: number | null;
  compoundCode: string | null;
  extractedData: Record<string, unknown> | null;
}

interface AnalysisResult {
  files: AnalyzedFileResult[];
  dataPdfs: number[];
  graphPdfs: number[];
}

type SortColumn =
  | "cocNumber"
  | "supplierCompanyName"
  | "cocType"
  | "processingStatus"
  | "createdAt";

export default function SupplierCocsPage() {
  const { showToast } = useToast();
  const [cocs, setCocs] = useState<RubberSupplierCocDto[]>([]);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<SupplierCocType | "">("");
  const [filterStatus, setFilterStatus] = useState<CocProcessingStatus | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<SupplierCocType>("COMPOUNDER");
  const [uploadSupplierId, setUploadSupplierId] = useState<number | null>(null);
  const [uploadCocNumber, setUploadCocNumber] = useState("");
  const [uploadCompoundCode, setUploadCompoundCode] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisDots, setAnalysisDots] = useState("");

  const supplierForType = (type: SupplierCocType): number | null => {
    const supplierNames: Record<SupplierCocType, string[]> = {
      COMPOUNDER: ["S&N Rubber", "S&N", "SN Rubber"],
      CALENDARER: ["Impilo", "Impilo Rubber"],
    };
    const matchNames = supplierNames[type];
    const match = companies.find((c) =>
      matchNames.some((name) => c.name.toLowerCase().includes(name.toLowerCase())),
    );
    return match?.id ?? null;
  };

  useEffect(() => {
    if (companies.length > 0) {
      const autoSupplier = supplierForType(uploadType);
      if (autoSupplier) {
        setUploadSupplierId(autoSupplier);
      }
    }
  }, [uploadType, companies]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [cocsData, companiesData] = await Promise.all([
        auRubberApiClient.supplierCocs({
          cocType: filterType || undefined,
          processingStatus: filterStatus || undefined,
        }),
        auRubberApiClient.companies(),
      ]);
      setCocs(Array.isArray(cocsData) ? cocsData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, filterStatus]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortCocs = (cocsToSort: RubberSupplierCocDto[]): RubberSupplierCocDto[] => {
    return [...cocsToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "cocNumber") {
        return direction * (a.cocNumber || "").localeCompare(b.cocNumber || "");
      }
      if (sortColumn === "supplierCompanyName") {
        return direction * (a.supplierCompanyName || "").localeCompare(b.supplierCompanyName || "");
      }
      if (sortColumn === "cocType") {
        return direction * a.cocType.localeCompare(b.cocType);
      }
      if (sortColumn === "processingStatus") {
        return direction * a.processingStatus.localeCompare(b.processingStatus);
      }
      if (sortColumn === "createdAt") {
        return direction * a.createdAt.localeCompare(b.createdAt);
      }
      return 0;
    });
  };

  const filteredCocs = sortCocs(
    cocs.filter((coc) => {
      const matchesSearch =
        searchQuery === "" ||
        coc.cocNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coc.supplierCompanyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coc.compoundCode?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }),
  );

  const paginatedCocs = filteredCocs.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterType, filterStatus]);

  useEffect(() => {
    if (!isAnalyzing) return;

    const interval = setInterval(() => {
      setAnalysisDots((prev) => (prev.length >= 3 ? "" : `${prev}.`));
    }, 500);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    setUploadFiles(files);
    setShowAnalysisModal(true);
    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setAnalysisStatus("Reading PDF documents...");
    setAnalysisResult(null);

    try {
      setAnalysisProgress(30);
      setAnalysisStatus("Extracting text and identifying document types...");

      const result = await auRubberApiClient.analyzeSupplierCocs(files);

      setAnalysisProgress(80);
      setAnalysisStatus("Matching graphs to batch certificates...");

      await new Promise((resolve) => setTimeout(resolve, 500));

      setAnalysisProgress(100);
      setAnalysisStatus("Analysis complete!");
      setAnalysisResult(result);
      setIsAnalyzing(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to analyze files", "error");
      setShowAnalysisModal(false);
      setIsAnalyzing(false);
      setUploadFiles([]);
    }
  };

  const handleCreateFromAnalysis = async () => {
    if (!analysisResult || uploadFiles.length === 0) return;

    try {
      setIsUploading(true);
      const result = await auRubberApiClient.createCocsFromAnalysis(uploadFiles, analysisResult);

      showToast(
        `Created ${result.cocIds.length} CoC${result.cocIds.length > 1 ? "s" : ""} successfully`,
        "success",
      );

      setShowAnalysisModal(false);
      setAnalysisResult(null);
      setUploadFiles([]);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create CoCs", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    try {
      setIsUploading(true);
      if (uploadFiles.length > 0) {
        await auRubberApiClient.uploadSupplierCocWithFiles(uploadFiles, {
          cocType: uploadType,
          supplierCompanyId: uploadSupplierId || undefined,
          cocNumber: uploadCocNumber || undefined,
          compoundCode: uploadCompoundCode || undefined,
        });
        showToast(
          `${uploadFiles.length} CoC${uploadFiles.length > 1 ? "s" : ""} uploaded`,
          "success",
        );
      } else {
        await auRubberApiClient.uploadSupplierCoc({
          cocType: uploadType,
          supplierCompanyId: uploadSupplierId || undefined,
          cocNumber: uploadCocNumber || undefined,
          compoundCode: uploadCompoundCode || undefined,
        });
        showToast("Supplier CoC created", "success");
      }
      setShowUploadModal(false);
      setUploadSupplierId(null);
      setUploadCocNumber("");
      setUploadCompoundCode("");
      setUploadFiles([]);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create CoC", "error");
    } finally {
      setIsUploading(false);
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
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}
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
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[type]}`}
      >
        {type}
      </span>
    );
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Supplier CoCs" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Certificates of Conformance</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and track supplier CoC documents from compounder and calendarer
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add CoC
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="CoC number, supplier, compound"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as SupplierCocType | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Types</option>
              <option value="COMPOUNDER">Compounder</option>
              <option value="CALENDARER">Calendarer</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as CocProcessingStatus | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="EXTRACTED">Extracted</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>
        </div>
      </div>

      <FileDropZone
        onFilesSelected={handleFilesSelected}
        className="bg-white shadow rounded-lg overflow-hidden border-2 border-dashed"
      >
        {isLoading ? (
          <TableLoadingState message="Loading supplier CoCs..." />
        ) : filteredCocs.length === 0 ? (
          <div className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <TableIcons.document className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No supplier CoCs found</h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery || filterType || filterStatus
                  ? "Try adjusting your filters"
                  : "Drag & drop PDF files here or click to upload"}
              </p>
              {!searchQuery && !filterType && !filterStatus && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add CoC
                </button>
              )}
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("cocNumber")}
                >
                  CoC Number
                  <SortIcon active={sortColumn === "cocNumber"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("supplierCompanyName")}
                >
                  Supplier
                  <SortIcon
                    active={sortColumn === "supplierCompanyName"}
                    direction={sortDirection}
                  />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("cocType")}
                >
                  Type
                  <SortIcon active={sortColumn === "cocType"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Compound
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("processingStatus")}
                >
                  Status
                  <SortIcon active={sortColumn === "processingStatus"} direction={sortDirection} />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("createdAt")}
                >
                  Created
                  <SortIcon active={sortColumn === "createdAt"} direction={sortDirection} />
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCocs.map((coc) => (
                <tr key={coc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/au-rubber/portal/supplier-cocs/${coc.id}`}
                      className="text-yellow-600 hover:text-yellow-800 font-medium"
                    >
                      {coc.cocNumber || `COC-${coc.id}`}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coc.supplierCompanyName || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{typeBadge(coc.cocType)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {coc.compoundCode || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {statusBadge(coc.processingStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(coc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    {coc.graphPdfPath && (
                      <button
                        onClick={async () => {
                          const url = await auRubberApiClient.documentUrl(coc.graphPdfPath!);
                          window.open(url, "_blank");
                        }}
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                        title="View Rheometer Graph"
                      >
                        <LineChart className="w-4 h-4" />
                      </button>
                    )}
                    <Link
                      href={`/au-rubber/portal/supplier-cocs/${coc.id}`}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCocs.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemName="CoCs"
          onPageChange={setCurrentPage}
        />
      </FileDropZone>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowUploadModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Supplier CoC</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF Documents
                  </label>
                  <FileDropZone
                    onFilesSelected={(files) => setUploadFiles((prev) => [...prev, ...files])}
                    className="border-2 border-dashed rounded-lg"
                    disabled={isUploading}
                  />
                  {uploadFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {uploadFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-gray-400 hover:text-red-500 flex-shrink-0"
                            disabled={isUploading}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as SupplierCocType)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                  >
                    <option value="COMPOUNDER">Compounder (S&N Rubber)</option>
                    <option value="CALENDARER">Calendarer (Impilo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CoC Number</label>
                  <input
                    type="text"
                    value={uploadCocNumber}
                    onChange={(e) => setUploadCocNumber(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Compound Code</label>
                  <input
                    type="text"
                    value={uploadCompoundCode}
                    onChange={(e) => setUploadCompoundCode(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFiles([]);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isUploading
                    ? "Uploading..."
                    : uploadFiles.length > 0
                      ? `Upload ${uploadFiles.length} File${uploadFiles.length > 1 ? "s" : ""}`
                      : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAnalysisModal && (
        <div className="fixed inset-x-0 top-16 bottom-16 z-[9999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="relative bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            <div
              className="px-4 py-3 flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#323288" }}
            >
              <AmixLogo size="md" showText useSignatureFont />
            </div>

            <div className="px-6 py-6">
              {isAnalyzing ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 flex-shrink-0 rounded-full overflow-hidden shadow-lg border-3 border-orange-400 relative">
                      <Image
                        src="/nix-avatar.png"
                        alt="Nix AI Assistant"
                        width={64}
                        height={64}
                        className="object-cover object-top scale-125"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-orange-400/20 to-transparent animate-pulse" />
                    </div>

                    <div className="flex-1 text-left">
                      <h2 className="text-lg font-bold text-gray-900">
                        Nix is Analyzing Your Documents{analysisDots}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">{analysisStatus}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${analysisProgress}%`,
                          background: "linear-gradient(90deg, #FFA500 0%, #FF8C00 50%, #FFA500 100%)",
                          backgroundSize: "200% 100%",
                          animation: "shimmer 2s infinite linear",
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">
                        {Math.round(analysisProgress)}% complete
                      </span>
                      <span className="text-gray-500">Analyzing {uploadFiles.length} files</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Extracting certificate data and batch numbers...</span>
                  </div>
                </>
              ) : analysisResult ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 flex-shrink-0 rounded-full overflow-hidden shadow-lg border-3 border-green-400 relative">
                      <Image
                        src="/nix-avatar.png"
                        alt="Nix AI Assistant"
                        width={64}
                        height={64}
                        className="object-cover object-top scale-125"
                        priority
                      />
                    </div>

                    <div className="flex-1 text-left">
                      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Analysis Complete
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Found {analysisResult.dataPdfs.length} certificate
                        {analysisResult.dataPdfs.length !== 1 ? "s" : ""} and{" "}
                        {analysisResult.graphPdfs.length} graph
                        {analysisResult.graphPdfs.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {analysisResult.files.map((file, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          file.isGraph
                            ? "bg-blue-50 border-blue-200"
                            : "bg-green-50 border-green-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {file.isGraph ? (
                              <LineChart className="w-4 h-4 text-blue-600" />
                            ) : (
                              <FileText className="w-4 h-4 text-green-600" />
                            )}
                            <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {file.filename}
                            </span>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              file.isGraph
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {file.isGraph ? "Graph" : "Certificate"}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                          {file.cocType && <span className="mr-3">Type: {file.cocType}</span>}
                          {file.companyName && <span className="mr-3">Supplier: {file.companyName}</span>}
                          {file.compoundCode && <span>Compound: {file.compoundCode}</span>}
                          {file.isGraph && file.linkedToIndex !== null && (
                            <span className="text-blue-600">
                              → Linked to: {analysisResult.files[file.linkedToIndex]?.filename}
                            </span>
                          )}
                          {file.batchNumbers.length > 0 && (
                            <div className="mt-1">
                              Batches: {file.batchNumbers.slice(0, 5).join(", ")}
                              {file.batchNumbers.length > 5 && ` +${file.batchNumbers.length - 5} more`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowAnalysisModal(false);
                        setAnalysisResult(null);
                        setUploadFiles([]);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateFromAnalysis}
                      disabled={isUploading}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      {isUploading
                        ? "Creating..."
                        : `Create ${analysisResult.dataPdfs.length} CoC${analysisResult.dataPdfs.length !== 1 ? "s" : ""}`}
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <div className="h-1 flex-shrink-0" style={{ backgroundColor: "#FFA500" }} />
          </div>

          <style jsx>{`
            @keyframes shimmer {
              0% {
                background-position: 200% 0;
              }
              100% {
                background-position: -200% 0;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
