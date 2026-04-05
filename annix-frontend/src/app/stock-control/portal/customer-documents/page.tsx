"use client";

const DOC_TYPES = [
  "NDA",
  "Master Service Agreement",
  "Vendor Registration Form",
  "BEE Requirements Letter",
  "Insurance Requirements",
  "Customer-Supplied Spec",
  "Safety File",
  "Purchase Terms",
  "Other",
] as const;

const MOCK_DOCS = [
  {
    id: 1,
    customer: "Example Mining Co",
    docType: "Master Service Agreement",
    docNumber: "MSA-2024-EMC-007",
    issuedAt: "2024-06-15",
    expiresAt: "2027-06-14",
    filename: "MSA_ExampleMining_v3.pdf",
    sizeKb: 1_420,
    expiryStatus: "valid",
    daysUntilExpiry: 435,
  },
  {
    id: 2,
    customer: "Example Mining Co",
    docType: "Vendor Registration Form",
    docNumber: null,
    issuedAt: "2024-08-01",
    expiresAt: "2026-07-31",
    filename: "EMC_vendor_reg_2024.pdf",
    sizeKb: 640,
    expiryStatus: "expiring_soon",
    daysUntilExpiry: 117,
  },
  {
    id: 3,
    customer: "Sample Chemical Works",
    docType: "Safety File",
    docNumber: "SF-SCW-2025",
    issuedAt: "2025-01-10",
    expiresAt: "2026-01-09",
    filename: "SCW_safety_file_2025.pdf",
    sizeKb: 8_120,
    expiryStatus: "expired",
    daysUntilExpiry: -86,
  },
  {
    id: 4,
    customer: "Sample Chemical Works",
    docType: "NDA",
    docNumber: "NDA-SCW-2023",
    issuedAt: "2023-03-22",
    expiresAt: null,
    filename: "SCW_nda_mutual.pdf",
    sizeKb: 310,
    expiryStatus: "no_expiry",
    daysUntilExpiry: null,
  },
  {
    id: 5,
    customer: "Test Power Station",
    docType: "Customer-Supplied Spec",
    docNumber: "TPS-SPEC-RUBBERLN-2025",
    issuedAt: "2025-11-04",
    expiresAt: null,
    filename: "TPS_rubber_lining_spec_rev4.pdf",
    sizeKb: 3_840,
    expiryStatus: "no_expiry",
    daysUntilExpiry: null,
  },
  {
    id: 6,
    customer: "Test Power Station",
    docType: "Insurance Requirements",
    docNumber: null,
    issuedAt: "2026-01-01",
    expiresAt: "2027-01-01",
    filename: "TPS_insurance_reqs.pdf",
    sizeKb: 280,
    expiryStatus: "valid",
    daysUntilExpiry: 271,
  },
  {
    id: 7,
    customer: "Example Refinery Ltd",
    docType: "BEE Requirements Letter",
    docNumber: "BEE-ERL-2026",
    issuedAt: "2026-02-12",
    expiresAt: "2027-02-11",
    filename: "ERL_bee_requirements.pdf",
    sizeKb: 520,
    expiryStatus: "valid",
    daysUntilExpiry: 312,
  },
];

function expiryBadgeClass(status: string): string {
  if (status === "expired") return "bg-red-100 text-red-800 border-red-200";
  if (status === "expiring_soon") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "valid") return "bg-green-100 text-green-800 border-green-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function statusLabel(status: string): string {
  if (status === "expired") return "Expired";
  if (status === "expiring_soon") return "Expiring Soon";
  if (status === "valid") return "Valid";
  return "No Expiry";
}

function formatFileSize(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

export default function CustomerDocumentsPage() {
  const groupedByCustomer = MOCK_DOCS.reduce(
    (acc, doc) => {
      const key = doc.customer;
      const prior = acc[key];
      const existing = prior || [];
      return { ...acc, [key]: [...existing, doc] };
    },
    {} as Record<string, typeof MOCK_DOCS>,
  );

  const customerNames = Object.keys(groupedByCustomer).sort();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Customer Documents
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            NDAs, vendor forms, customer-supplied specs and compliance documents per customer.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex items-center px-4 py-2 bg-[#323288] text-white rounded-md text-sm font-medium shadow-sm disabled:opacity-50"
        >
          Upload Document
        </button>
      </div>

      <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        Preview — this page shows scaffold content. Backend wiring pending.
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select className="rounded-md border-gray-300 text-sm">
          <option>All customers</option>
        </select>
        <select className="rounded-md border-gray-300 text-sm">
          <option>All document types</option>
          {DOC_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select className="rounded-md border-gray-300 text-sm">
          <option>All expiry statuses</option>
          <option>Expired</option>
          <option>Expiring Soon</option>
          <option>Valid</option>
          <option>No Expiry</option>
        </select>
      </div>

      <div className="space-y-6">
        {customerNames.map((customer) => {
          const rawDocs = groupedByCustomer[customer];
          const docs = rawDocs || [];
          return (
            <div
              key={customer}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {customer}
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    ({docs.length} document{docs.length === 1 ? "" : "s"})
                  </span>
                </h2>
              </div>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/20">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Document
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Number
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Issued
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Expires
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {docs.map((doc) => {
                    const badgeClass = expiryBadgeClass(doc.expiryStatus);
                    const label = statusLabel(doc.expiryStatus);
                    const daysText =
                      doc.expiryStatus === "expiring_soon" && doc.daysUntilExpiry !== null
                        ? ` (${doc.daysUntilExpiry}d)`
                        : "";
                    const numberDisplay = doc.docNumber || "—";
                    const issuedDisplay = doc.issuedAt || "—";
                    const expiresDisplay = doc.expiresAt || "—";
                    const sizeDisplay = formatFileSize(doc.sizeKb);
                    return (
                      <tr key={doc.id}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {doc.docType}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {doc.filename} · {sizeDisplay}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {numberDisplay}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {issuedDisplay}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {expiresDisplay}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${badgeClass}`}
                          >
                            {label}
                            {daysText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          What Customer Documents will do
        </h2>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
          <li>Central store for all customer-side compliance and admin docs</li>
          <li>NDAs and Master Service Agreements with expiry alerts</li>
          <li>Customer-supplied technical specifications linked to RFQs and POs</li>
          <li>Vendor registration forms and BEE requirement letters</li>
          <li>Insurance requirements checked automatically against supplier docs</li>
          <li>Expiry warnings 30 days before renewal required</li>
          <li>Access-controlled download via presigned S3 URLs</li>
        </ul>
      </div>
    </div>
  );
}
