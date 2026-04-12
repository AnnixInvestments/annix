"use client";

import { useMemo, useState } from "react";
import { QrScanner } from "@/app/stock-control/components/QrScanner";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";

export interface TargetSelection {
  kind: "job_card" | "cpo";
  id: number;
  label: string;
  customer: string | null;
  status: string | null;
}

interface JobCardOption {
  id: number;
  jobNumber: string;
  jcNumber?: string | null;
  jobName: string | null;
  customerName: string | null;
  poNumber: string | null;
  workflowStatus: string | null;
  status: string | null;
}

interface CpoOption {
  id: number;
  cpoNumber: string;
  jobNumber: string | null;
  jobName: string | null;
  customerName: string | null;
  poNumber: string | null;
  status: string | null;
}

interface JobCardOrCpoPickerProps {
  value: TargetSelection | null;
  onChange: (selection: TargetSelection | null) => void;
}

interface ScanResult {
  type: "staff" | "stock_item" | "job_card";
  id: number;
  data: { id: number; jobNumber?: string; customerName?: string | null; status?: string | null };
}

type Tab = "job_cards" | "cpos";

export function JobCardOrCpoPicker(props: JobCardOrCpoPickerProps) {
  const config = useStockManagementConfig();
  const authHeaders = config.authHeaders;
  const currentValue = props.value;
  const onChangeProp = props.onChange;

  const pickerData = config.pickerData;
  const jobCards = pickerData.jobCards as JobCardOption[];
  const cpos = pickerData.cpos as CpoOption[];
  const isLoading = pickerData.isLoading;
  const prefetchError = pickerData.error;
  const error = prefetchError == null ? null : new Error(prefetchError);

  const [tab, setTab] = useState<Tab>("job_cards");
  const [search, setSearch] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const filteredJobCards = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (trimmed === "") {
      return jobCards;
    }
    return jobCards.filter((jc) => {
      const jobNumber = jc.jobNumber == null ? "" : jc.jobNumber.toLowerCase();
      const jobName = jc.jobName == null ? "" : jc.jobName.toLowerCase();
      const customer = jc.customerName == null ? "" : jc.customerName.toLowerCase();
      const po = jc.poNumber == null ? "" : jc.poNumber.toLowerCase();
      return (
        jobNumber.includes(trimmed) ||
        jobName.includes(trimmed) ||
        customer.includes(trimmed) ||
        po.includes(trimmed)
      );
    });
  }, [search, jobCards]);

  const filteredCpos = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    if (trimmed === "") {
      return cpos;
    }
    return cpos.filter((cpo) => {
      const cpoNumber = cpo.cpoNumber == null ? "" : cpo.cpoNumber.toLowerCase();
      const jobNumber = cpo.jobNumber == null ? "" : cpo.jobNumber.toLowerCase();
      const jobName = cpo.jobName == null ? "" : cpo.jobName.toLowerCase();
      const customer = cpo.customerName == null ? "" : cpo.customerName.toLowerCase();
      const po = cpo.poNumber == null ? "" : cpo.poNumber.toLowerCase();
      return (
        cpoNumber.includes(trimmed) ||
        jobNumber.includes(trimmed) ||
        jobName.includes(trimmed) ||
        customer.includes(trimmed) ||
        po.includes(trimmed)
      );
    });
  }, [search, cpos]);

  const handleSelectJobCard = (jc: JobCardOption) => {
    const jobName = jc.jobName;
    const jobNameSuffix = jobName == null ? "" : ` · ${jobName}`;
    onChangeProp({
      kind: "job_card",
      id: jc.id,
      label: `${jc.jobNumber}${jobNameSuffix}`,
      customer: jc.customerName,
      status: jc.workflowStatus == null ? jc.status : jc.workflowStatus,
    });
    setSearch("");
    setScanError(null);
  };

  const handleSelectCpo = (cpo: CpoOption) => {
    const jobName = cpo.jobName;
    const jobNameSuffix = jobName == null ? "" : ` · ${jobName}`;
    onChangeProp({
      kind: "cpo",
      id: cpo.id,
      label: `CPO ${cpo.cpoNumber}${jobNameSuffix}`,
      customer: cpo.customerName,
      status: cpo.status,
    });
    setSearch("");
    setScanError(null);
  };

  const handleClear = () => {
    onChangeProp(null);
    setSearch("");
    setScanError(null);
  };

  const handleScan = async (qrCode: string) => {
    setShowScanner(false);
    setIsScanning(true);
    setScanError(null);
    try {
      const response = await fetch("/api/stock-control/issuance/scan-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ qrCode }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Scan failed (${response.status}) ${text}`);
      }
      const result = (await response.json()) as ScanResult;
      if (result.type !== "job_card") {
        setScanError(`Please scan a job card QR (got ${result.type})`);
        return;
      }
      const data = result.data as JobCardOption;
      onChangeProp({
        kind: "job_card",
        id: data.id,
        label: data.jobNumber == null ? `#${data.id}` : data.jobNumber,
        customer: data.customerName == null ? null : data.customerName,
        status: data.status == null ? null : data.status,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setScanError(message);
    } finally {
      setIsScanning(false);
    }
  };

  const errorMessage = error == null ? null : error.message;

  const selectedCustomer = currentValue == null ? null : currentValue.customer;
  const selectedStatus = currentValue == null ? null : currentValue.status;
  const selectedKind = currentValue == null ? null : currentValue.kind;

  return (
    <div className="space-y-2">
      <div className="w-full">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search job number, customer, CPO number (optional)"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            {currentValue != null ? (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                aria-label="Clear selection"
              >
                ×
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            disabled={isScanning}
            className="shrink-0 inline-flex items-center gap-1.5 rounded border border-teal-600 bg-white px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            aria-label="Scan job card QR code"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            Scan QR
          </button>
        </div>
      </div>

      {currentValue == null ? (
        <div className="rounded border border-gray-200 bg-white">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setTab("job_cards")}
              className={`flex-1 px-3 py-2 text-sm font-medium ${
                tab === "job_cards"
                  ? "text-teal-700 border-b-2 border-teal-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Job Cards
            </button>
            <button
              type="button"
              onClick={() => setTab("cpos")}
              className={`flex-1 px-3 py-2 text-sm font-medium ${
                tab === "cpos"
                  ? "text-teal-700 border-b-2 border-teal-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              CPOs
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading…</div>
            ) : errorMessage != null ? (
              <div className="px-3 py-2 text-sm text-red-600">Error: {errorMessage}</div>
            ) : tab === "job_cards" ? (
              filteredJobCards.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  {jobCards.length === 0 ? "No job cards found" : "No matches"}
                </div>
              ) : (
                filteredJobCards.map((jc) => {
                  const jobNameRaw = jc.jobName;
                  const customerRaw = jc.customerName;
                  const statusRaw = jc.workflowStatus == null ? jc.status : jc.workflowStatus;
                  const jobNameLabel = jobNameRaw == null ? "—" : jobNameRaw;
                  const customerLabel = customerRaw == null ? "" : customerRaw;
                  const statusLabel = statusRaw == null ? "" : statusRaw;
                  return (
                    <button
                      key={jc.id}
                      type="button"
                      onClick={() => handleSelectJobCard(jc)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-teal-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-gray-900 truncate">{jc.jobNumber}</div>
                        {statusLabel !== "" ? (
                          <span className="text-[10px] uppercase tracking-wide font-medium text-gray-500 shrink-0">
                            {statusLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-600 truncate">{jobNameLabel}</div>
                      {customerLabel !== "" ? (
                        <div className="text-xs text-gray-500 truncate">{customerLabel}</div>
                      ) : null}
                    </button>
                  );
                })
              )
            ) : filteredCpos.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {cpos.length === 0 ? "No CPOs found" : "No matches"}
              </div>
            ) : (
              filteredCpos.map((cpo) => {
                const jobNameRaw = cpo.jobName;
                const customerRaw = cpo.customerName;
                const statusRaw = cpo.status;
                const jobNameLabel = jobNameRaw == null ? "—" : jobNameRaw;
                const customerLabel = customerRaw == null ? "" : customerRaw;
                const statusLabel = statusRaw == null ? "" : statusRaw;
                return (
                  <button
                    key={cpo.id}
                    type="button"
                    onClick={() => handleSelectCpo(cpo)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-teal-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-gray-900 truncate">
                        CPO {cpo.cpoNumber}
                      </div>
                      {statusLabel !== "" ? (
                        <span className="text-[10px] uppercase tracking-wide font-medium text-gray-500 shrink-0">
                          {statusLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-600 truncate">{jobNameLabel}</div>
                    {customerLabel !== "" ? (
                      <div className="text-xs text-gray-500 truncate">{customerLabel}</div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
      {currentValue != null ? (
        <div className="rounded border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold">
                {selectedKind === "cpo" ? "CPO selected" : "Job card selected"}:{" "}
                {currentValue.label}
              </div>
              {selectedCustomer != null ? <div>Customer: {selectedCustomer}</div> : null}
              {selectedStatus != null ? <div>Status: {selectedStatus}</div> : null}
            </div>
            <button
              type="button"
              onClick={() => onChangeProp(null)}
              className="shrink-0 text-teal-700 hover:text-teal-900 text-xs font-medium hover:underline"
            >
              Change
            </button>
          </div>
        </div>
      ) : null}
      {scanError != null ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {scanError}
        </div>
      ) : null}
      {isScanning ? <div className="text-xs text-gray-500">Resolving scanned QR…</div> : null}
      {showScanner ? <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} /> : null}
    </div>
  );
}
