"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  type AuCocStatus,
  auRubberApiClient,
  type RubberAuCocDto,
} from "@/app/lib/api/auRubberApi";
import { Breadcrumb } from "../../components/Breadcrumb";
import {
  ITEMS_PER_PAGE,
  Pagination,
  SortDirection,
  SortIcon,
  TableEmptyState,
  TableIcons,
  TableLoadingState,
} from "../../components/TableComponents";

type SortColumn = "cocNumber" | "customerCompanyName" | "status" | "createdAt";

export default function AuCocsPage() {
  const { showToast } = useToast();
  const [cocs, setCocs] = useState<RubberAuCocDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<AuCocStatus | "">("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sendEmail, setSendEmail] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const cocsData = await auRubberApiClient.auCocs({
        status: filterStatus || undefined,
      });
      setCocs(Array.isArray(cocsData) ? cocsData : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortCocs = (cocsToSort: RubberAuCocDto[]): RubberAuCocDto[] => {
    return [...cocsToSort].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "cocNumber") {
        return direction * a.cocNumber.localeCompare(b.cocNumber);
      }
      if (sortColumn === "customerCompanyName") {
        return direction * (a.customerCompanyName || "").localeCompare(b.customerCompanyName || "");
      }
      if (sortColumn === "status") {
        return direction * a.status.localeCompare(b.status);
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
        coc.cocNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coc.customerCompanyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coc.poNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }),
  );

  const paginatedCocs = filteredCocs.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, filterStatus]);

  const handleGeneratePdf = async (id: number) => {
    try {
      await auRubberApiClient.generateAuCocPdf(id);
      showToast("PDF generated successfully", "success");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to generate PDF", "error");
    }
  };

  const handleSend = async () => {
    if (!sendingId || !sendEmail) {
      showToast("Please enter an email address", "error");
      return;
    }
    try {
      setIsSending(true);
      await auRubberApiClient.sendAuCoc(sendingId, sendEmail);
      showToast("CoC sent successfully", "success");
      setShowSendModal(false);
      setSendingId(null);
      setSendEmail("");
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to send CoC", "error");
    } finally {
      setIsSending(false);
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
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const draftCount = cocs.filter((c) => c.status === "DRAFT").length;
  const generatedCount = cocs.filter((c) => c.status === "GENERATED").length;
  const sentCount = cocs.filter((c) => c.status === "SENT").length;

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
      <Breadcrumb items={[{ label: "AU Certificates" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AU Certificates of Conformance</h1>
          <p className="mt-1 text-sm text-gray-600">
            Generate and manage certificates for customers
          </p>
        </div>
        <Link
          href="/au-rubber/portal/au-cocs/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Certificate
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Draft</div>
          <div className="mt-1 text-2xl font-semibold text-gray-600">{draftCount}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Generated</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{generatedCount}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Sent</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">{sentCount}</div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="CoC number, customer, PO"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AuCocStatus | "")}
              className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="GENERATED">Generated</option>
              <option value="SENT">Sent</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <TableLoadingState message="Loading certificates..." />
        ) : filteredCocs.length === 0 ? (
          <TableEmptyState
            icon={TableIcons.document}
            title="No certificates found"
            subtitle={
              searchQuery || filterStatus
                ? "Try adjusting your filters"
                : "Get started by creating a certificate"
            }
            action={
              !searchQuery && !filterStatus
                ? {
                    label: "New Certificate",
                    onClick: () => (window.location.href = "/au-rubber/portal/au-cocs/new"),
                  }
                : undefined
            }
          />
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
                  onClick={() => handleSort("customerCompanyName")}
                >
                  Customer
                  <SortIcon
                    active={sortColumn === "customerCompanyName"}
                    direction={sortDirection}
                  />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  PO Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Rolls
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("status")}
                >
                  Status
                  <SortIcon active={sortColumn === "status"} direction={sortDirection} />
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
                      href={`/au-rubber/portal/au-cocs/${coc.id}`}
                      className="text-yellow-600 hover:text-yellow-800 font-medium"
                    >
                      {coc.cocNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coc.customerCompanyName || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {coc.poNumber || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {coc.items?.length || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{statusBadge(coc.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(coc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link
                      href={`/au-rubber/portal/au-cocs/${coc.id}`}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      View
                    </Link>
                    {coc.status === "DRAFT" && (
                      <button
                        onClick={() => handleGeneratePdf(coc.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Generate PDF
                      </button>
                    )}
                    {coc.status === "GENERATED" && (
                      <>
                        <a
                          href={auRubberApiClient.auCocPdfUrl(coc.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800"
                        >
                          Download
                        </a>
                        <button
                          onClick={() => {
                            setSendingId(coc.id);
                            setShowSendModal(true);
                          }}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          Send
                        </button>
                      </>
                    )}
                    {coc.status === "SENT" && coc.generatedPdfPath && (
                      <a
                        href={auRubberApiClient.auCocPdfUrl(coc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800"
                      >
                        Download
                      </a>
                    )}
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
          itemName="certificates"
          onPageChange={setCurrentPage}
        />
      </div>

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
