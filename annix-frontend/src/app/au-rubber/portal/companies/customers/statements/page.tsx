"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TableLoadingState } from "@/app/components/shared/TableComponents";
import type { RubberTaxInvoiceDto } from "@/app/lib/api/auRubberApi";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto } from "@/app/lib/api/rubberPortalApi";
import { Breadcrumb } from "../../../../components/Breadcrumb";

interface CompanyStatement {
  company: RubberCompanyDto;
  invoices: RubberTaxInvoiceDto[];
  total: number;
  vatTotal: number;
}

export default function CustomerStatementsPage() {
  const [statements, setStatements] = useState<CompanyStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [expandedCompanyId, setExpandedCompanyId] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [companies, invoices] = await Promise.all([
          auRubberApiClient.companies(),
          auRubberApiClient.taxInvoices({ invoiceType: "CUSTOMER" }),
        ]);

        const customers = companies.filter((c) => c.companyType === "CUSTOMER");
        const companyStatements = customers
          .map((company) => {
            const companyInvoices = invoices.filter((inv) => inv.companyId === company.id);
            const total = companyInvoices.reduce(
              (sum, inv) => sum + (inv.totalAmount ? Number(inv.totalAmount) : 0),
              0,
            );
            const vatTotal = companyInvoices.reduce(
              (sum, inv) => sum + (inv.vatAmount ? Number(inv.vatAmount) : 0),
              0,
            );
            return { company, invoices: companyInvoices, total, vatTotal };
          })
          .filter((s) => s.invoices.length > 0)
          .sort((a, b) => b.total - a.total);

        setStatements(companyStatements);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load statements"));
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const grandTotal = statements.reduce((sum, s) => sum + s.total, 0);
  const grandVatTotal = statements.reduce((sum, s) => sum + s.vatTotal, 0);

  const formatCurrency = (amount: number) =>
    `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Companies" },
            { label: "Customers", href: "/au-rubber/portal/companies/customers" },
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
          { label: "Customers", href: "/au-rubber/portal/companies/customers" },
          { label: "Statements" },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-3" />
            Customer Statements
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Financial summary of all customer tax invoices
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
          <p className="text-gray-500">No customer invoices found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white shadow rounded-lg p-5 border-l-4 border-blue-500">
              <p className="text-sm font-medium text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{statements.length}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-5 border-l-4 border-blue-500">
              <p className="text-sm font-medium text-gray-500">Total Excl. VAT</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(grandTotal - grandVatTotal)}
              </p>
            </div>
            <div className="bg-white shadow rounded-lg p-5 border-l-4 border-blue-500">
              <p className="text-sm font-medium text-gray-500">Total Incl. VAT</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(grandTotal)}</p>
            </div>
          </div>

          <div className="space-y-4">
            {statements.map((statement) => {
              const isExpanded = expandedCompanyId === statement.company.id;
              const statementEmail = statement.company.emailConfig?.outgoingStatementEmail || null;

              return (
                <div
                  key={statement.company.id}
                  className="bg-white shadow rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedCompanyId(isExpanded ? null : statement.company.id)}
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
                          {statement.company.name}
                        </span>
                        {statement.company.code && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({statement.company.code})
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
                          {statement.invoices.length} invoices
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
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Invoice #
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Date
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Status
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              VAT
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {statement.invoices.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3 whitespace-nowrap">
                                <Link
                                  href={`/au-rubber/portal/tax-invoices/${invoice.id}`}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-900"
                                >
                                  {invoice.invoiceNumber}
                                </Link>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                {invoice.invoiceDate || "-"}
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
                                {invoice.vatAmount !== null
                                  ? formatCurrency(Number(invoice.vatAmount))
                                  : "-"}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                                {invoice.totalAmount !== null
                                  ? formatCurrency(Number(invoice.totalAmount))
                                  : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td
                              colSpan={3}
                              className="px-6 py-3 text-sm font-semibold text-gray-900"
                            >
                              Total
                            </td>
                            <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                              {formatCurrency(statement.vatTotal)}
                            </td>
                            <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                              {formatCurrency(statement.total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
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
