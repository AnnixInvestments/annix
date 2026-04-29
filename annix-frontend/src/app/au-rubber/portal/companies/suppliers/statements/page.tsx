"use client";

import Link from "next/link";
import { useState } from "react";
import { TableLoadingState } from "@/app/components/shared/TableComponents";
import { useAuRubberTaxInvoiceStatements, useAuRubberTaxInvoices } from "@/app/lib/query/hooks";
import { Breadcrumb } from "../../../../components/Breadcrumb";

const formatCurrency = (amount: number) =>
  `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function CompanyInvoicesTable({
  companyId,
  vatTotal,
  total,
}: {
  companyId: number;
  vatTotal: number;
  total: number;
}) {
  const query = useAuRubberTaxInvoices({
    invoiceType: "SUPPLIER",
    companyId,
    sortColumn: "invoiceDate",
    sortDirection: "desc",
    pageSize: 1000,
  });
  const data = query.data;
  const invoices = data ? data.items : [];
  const isLoading = query.isLoading;

  if (isLoading) {
    return (
      <TableLoadingState
        message="Loading invoices..."
        spinnerClassName="border-b-2 border-yellow-600"
      />
    );
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Invoice #
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Date
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            VAT
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {invoices.map((invoice) => {
          const rawInvoiceDate = invoice.invoiceDate;
          const rawVatAmount = invoice.vatAmount;
          const rawTotalAmount = invoice.totalAmount;
          return (
            <tr key={invoice.id} className="hover:bg-gray-50">
              <td className="px-6 py-3 whitespace-nowrap">
                <Link
                  href={`/au-rubber/portal/tax-invoices/${invoice.id}`}
                  className="text-sm font-medium text-orange-600 hover:text-orange-900"
                >
                  {invoice.invoiceNumber}
                </Link>
              </td>
              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                {rawInvoiceDate || "-"}
              </td>
              <td className="px-6 py-3 whitespace-nowrap">
                <span
                  className={`px-2 text-xs font-semibold rounded-full ${
                    invoice.status === "APPROVED"
                      ? "bg-green-100 text-green-800"
                      : invoice.status === "EXTRACTED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {invoice.statusLabel}
                </span>
              </td>
              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                {rawVatAmount !== null ? formatCurrency(Number(rawVatAmount)) : "-"}
              </td>
              <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                {rawTotalAmount !== null ? formatCurrency(Number(rawTotalAmount)) : "-"}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot className="bg-gray-50">
        <tr>
          <td colSpan={3} className="px-6 py-3 text-sm font-semibold text-gray-900">
            Total
          </td>
          <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
            {formatCurrency(vatTotal)}
          </td>
          <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
            {formatCurrency(total)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

export default function SupplierStatementsPage() {
  const statementsQuery = useAuRubberTaxInvoiceStatements("SUPPLIER");
  const rawStatementsData = statementsQuery.data;
  const statements = rawStatementsData || [];
  const isLoading = statementsQuery.isLoading;
  const error = statementsQuery.error;
  const [expandedCompanyId, setExpandedCompanyId] = useState<number | null>(null);

  const grandTotal = statements.reduce((sum, s) => sum + s.total, 0);
  const grandVatTotal = statements.reduce((sum, s) => sum + s.vatTotal, 0);

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Companies" },
            { label: "Suppliers", href: "/au-rubber/portal/companies/suppliers" },
            { label: "Statements" },
          ]}
        />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Statements</div>
            <p className="text-gray-600">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Companies" },
          { label: "Suppliers", href: "/au-rubber/portal/companies/suppliers" },
          { label: "Statements" },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-orange-500 rounded-full mr-3" />
            Supplier Statements
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Financial summary of all supplier tax invoices
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <TableLoadingState
            message="Loading statements..."
            spinnerClassName="border-b-2 border-yellow-600"
          />
        </div>
      ) : statements.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <p className="text-gray-500">No supplier invoices found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white shadow rounded-lg p-5 border-l-4 border-orange-500">
              <p className="text-sm font-medium text-gray-500">Total Suppliers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{statements.length}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-5 border-l-4 border-orange-500">
              <p className="text-sm font-medium text-gray-500">Total Excl. VAT</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(grandTotal - grandVatTotal)}
              </p>
            </div>
            <div className="bg-white shadow rounded-lg p-5 border-l-4 border-orange-500">
              <p className="text-sm font-medium text-gray-500">Total Incl. VAT</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(grandTotal)}</p>
            </div>
          </div>

          <div className="space-y-4">
            {statements.map((statement) => {
              const emailConfig = statement.emailConfig;
              const rawStatementEmail = emailConfig ? emailConfig.statementEmail : null;
              const statementEmail = rawStatementEmail || null;
              const isExpanded = expandedCompanyId === statement.companyId;

              return (
                <div
                  key={statement.companyId}
                  className="bg-white shadow rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCompanyId(isExpanded ? null : statement.companyId)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <svg
                        className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <div className="text-left">
                        <span className="text-sm font-semibold text-gray-900">
                          {statement.companyName}
                        </span>
                        {statement.companyCode && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({statement.companyCode})
                          </span>
                        )}
                        {statementEmail && (
                          <p className="text-xs text-gray-400 mt-0.5">{statementEmail}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <span className="text-xs text-gray-500">
                          {statement.invoiceCount} invoices
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(statement.total)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      <CompanyInvoicesTable
                        companyId={statement.companyId}
                        vatTotal={statement.vatTotal}
                        total={statement.total}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
