"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { DateTime } from "@/app/lib/datetime";
import { AccountsSummaryTable } from "../../../components/accounting/AccountsSummaryTable";
import { AccountsTable } from "../../../components/accounting/AccountsTable";
import { MonthYearPicker } from "../../../components/accounting/MonthYearPicker";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { RequirePermission } from "../../../components/RequirePermission";
import { PAGE_PERMISSIONS } from "../../../config/pagePermissions";

interface CompanyAccount {
  companyId: number;
  companyName: string;
  discountPercent: number;
  invoices: {
    id: number;
    invoiceNumber: string;
    invoiceDate: string | null;
    totalAmount: number;
    vatAmount: number;
    isCreditNote: boolean;
  }[];
  subtotal: number;
  creditTotal: number;
  balance: number;
  discountAmount: number;
  vatTotal: number;
  amountPayable: number;
}

interface AccountData {
  year: number;
  month: number;
  accountType: string;
  companies: CompanyAccount[];
  grandTotal: number;
  grandVat: number;
  grandPayable: number;
}

export default function AccountsPayablePage() {
  const { showToast } = useToast();
  const previousMonth = DateTime.now().minus({ months: 1 });
  const [year, setYear] = useState(previousMonth.year);
  const [month, setMonth] = useState(previousMonth.month);
  const [data, setData] = useState<AccountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = async (y: number, m: number) => {
    setIsLoading(true);
    try {
      const result = await auRubberApiClient.accountingPayable(y, m);
      setData(result as unknown as AccountData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(year, month);
  }, [year, month]);

  const handlePeriodChange = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
  };

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    try {
      await auRubberApiClient.accountingGenerate(year, month, "PAYABLE");
      showToast("PDF generated successfully", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate PDF";
      showToast(msg, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <RequirePermission permission={PAGE_PERMISSIONS["/au-rubber/portal/accounting"]}>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Accounting", href: "/au-rubber/portal/accounting" },
            { label: "Accounts Payable" },
          ]}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Accounts Payable</h1>
          <div className="flex items-center gap-3">
            <MonthYearPicker year={year} month={month} onChange={handlePeriodChange} />
            <button
              onClick={handleGeneratePdf}
              disabled={isGenerating || !data || data.companies.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? "Generating..." : "Generate PDF"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600" />
          </div>
        ) : data ? (
          <>
            <AccountsTable companies={data.companies} />
            <AccountsSummaryTable
              companies={data.companies}
              grandTotal={data.grandTotal}
              grandVat={data.grandVat}
              grandPayable={data.grandPayable}
              entityLabel="Supplier"
            />
          </>
        ) : null}
      </div>
    </RequirePermission>
  );
}
