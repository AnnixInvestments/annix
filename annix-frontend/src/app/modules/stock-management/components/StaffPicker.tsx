"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QrScanner } from "@/app/stock-control/components/QrScanner";
import { useStockManagementConfig } from "../provider/useStockManagementConfig";

interface StaffOption {
  id: number;
  name: string;
  employeeNumber: string | null;
  department: string | null;
  photoUrl: string | null;
  active: boolean;
}

interface StaffPickerProps {
  value: number | "";
  onChange: (staffId: number | "") => void;
  placeholder?: string;
}

interface ScanResult {
  type: "staff" | "stock_item" | "job_card";
  id: number;
  data: StaffOption;
}

export function StaffPicker(props: StaffPickerProps) {
  const config = useStockManagementConfig();
  const authHeaders = config.authHeaders;
  const placeholderProp = props.placeholder;
  const placeholderText =
    placeholderProp == null ? "Search staff by name or employee number" : placeholderProp;
  const currentValue = props.value;
  const onChangeProp = props.onChange;

  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/stock-control/staff?active=true", {
      headers: authHeaders(),
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(`Failed to load staff (${response.status}) ${text}`);
        }
        return response.json() as Promise<StaffOption[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setStaff(data);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const container = containerRef.current;
      if (container && !container.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedStaff = useMemo<StaffOption | null>(() => {
    if (currentValue === "") {
      return null;
    }
    const found = staff.find((s) => s.id === currentValue);
    return found == null ? null : found;
  }, [currentValue, staff]);

  const filtered = useMemo<StaffOption[]>(() => {
    const trimmed = search.trim().toLowerCase();
    if (trimmed === "") {
      return staff;
    }
    return staff.filter((s) => {
      const rawName = s.name;
      const rawEmp = s.employeeNumber;
      const rawDept = s.department;
      const name = rawName == null ? "" : rawName.toLowerCase();
      const emp = rawEmp == null ? "" : rawEmp.toLowerCase();
      const dept = rawDept == null ? "" : rawDept.toLowerCase();
      return name.includes(trimmed) || emp.includes(trimmed) || dept.includes(trimmed);
    });
  }, [search, staff]);

  const handleSelect = (staffMember: StaffOption) => {
    onChangeProp(staffMember.id);
    setSearch("");
    setIsOpen(false);
    setScanError(null);
  };

  const handleClear = () => {
    onChangeProp("");
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
      if (result.type !== "staff") {
        setScanError(`Please scan a staff ID card (got ${result.type})`);
        return;
      }
      const scannedStaff = result.data;
      const existing = staff.find((s) => s.id === scannedStaff.id);
      if (existing == null) {
        setStaff((prev) => [...prev, scannedStaff]);
      }
      onChangeProp(scannedStaff.id);
      setIsOpen(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setScanError(message);
    } finally {
      setIsScanning(false);
    }
  };

  const displayValue = (() => {
    if (isOpen) {
      return search;
    }
    if (selectedStaff == null) {
      return "";
    }
    const empNumber = selectedStaff.employeeNumber;
    const empSuffix = empNumber == null ? "" : ` (${empNumber})`;
    return `${selectedStaff.name}${empSuffix}`;
  })();

  const errorMessage = error == null ? null : error.message;
  const selectedPhotoUrl = selectedStaff == null ? null : selectedStaff.photoUrl;

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative w-full">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            {selectedPhotoUrl != null && !isOpen ? (
              <img
                src={selectedPhotoUrl}
                alt=""
                className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full object-cover border border-gray-200"
              />
            ) : null}
            <input
              type="text"
              value={displayValue}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!isOpen) {
                  setIsOpen(true);
                }
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholderText}
              className={`w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${
                selectedPhotoUrl != null && !isOpen ? "pl-11" : ""
              }`}
            />
            {selectedStaff != null && !isOpen ? (
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
            aria-label="Scan staff ID QR code"
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
        {isOpen ? (
          <div className="absolute left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded border border-gray-200 bg-white shadow-lg z-20">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading staff…</div>
            ) : errorMessage != null ? (
              <div className="px-3 py-2 text-sm text-red-600">Error: {errorMessage}</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {staff.length === 0 ? "No staff members found for this company" : "No matches"}
              </div>
            ) : (
              filtered.map((s) => {
                const rawEmp = s.employeeNumber;
                const rawDept = s.department;
                const photoUrl = s.photoUrl;
                const empLabel = rawEmp == null ? "" : ` · ${rawEmp}`;
                const deptLabel = rawDept == null ? "" : ` · ${rawDept}`;
                const initials = s.name
                  .split(" ")
                  .map((p) => (p.length > 0 ? p[0] : ""))
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-teal-50"
                  >
                    {photoUrl != null ? (
                      <img
                        src={photoUrl}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate">{s.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        #{s.id}
                        {empLabel}
                        {deptLabel}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
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
