"use client";

import { useRef, useState } from "react";
import type {
  CreateIssuanceDto,
  IssuanceScanResult,
  JobCard,
  StaffMember,
  StockItem,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

type Step = "issuer" | "recipient" | "stock_item" | "job_card" | "confirm";

const STEPS: { key: Step; label: string }[] = [
  { key: "issuer", label: "Issuer" },
  { key: "recipient", label: "Recipient" },
  { key: "stock_item", label: "Stock Item" },
  { key: "job_card", label: "Job Card" },
  { key: "confirm", label: "Confirm" },
];

export default function IssueStockPage() {
  const [currentStep, setCurrentStep] = useState<Step>("issuer");
  const [scanInput, setScanInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [issuer, setIssuer] = useState<StaffMember | null>(null);
  const [recipient, setRecipient] = useState<StaffMember | null>(null);
  const [stockItem, setStockItem] = useState<StockItem | null>(null);
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const handleScan = async () => {
    if (!scanInput.trim()) return;

    try {
      setIsScanning(true);
      setError(null);

      const result: IssuanceScanResult = await stockControlApiClient.scanIssuanceQr(
        scanInput.trim(),
      );

      if (currentStep === "issuer") {
        if (result.type !== "staff") {
          setError("Please scan a staff ID card for the issuer");
          return;
        }
        setIssuer(result.data as StaffMember);
        setCurrentStep("recipient");
      } else if (currentStep === "recipient") {
        if (result.type !== "staff") {
          setError("Please scan a staff ID card for the recipient");
          return;
        }
        const staffData = result.data as StaffMember;
        if (issuer && staffData.id === issuer.id) {
          setError("Recipient cannot be the same as issuer");
          return;
        }
        setRecipient(staffData);
        setCurrentStep("stock_item");
      } else if (currentStep === "stock_item") {
        if (result.type !== "stock_item") {
          setError("Please scan a stock item QR code");
          return;
        }
        setStockItem(result.data as StockItem);
        setCurrentStep("job_card");
      } else if (currentStep === "job_card") {
        if (result.type !== "job_card") {
          setError("Please scan a job card QR code or click Skip");
          return;
        }
        setJobCard(result.data as JobCard);
        setCurrentStep("confirm");
      }

      setScanInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan QR code");
    } finally {
      setIsScanning(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan();
    }
  };

  const handleSkipJobCard = () => {
    setJobCard(null);
    setCurrentStep("confirm");
  };

  const handleBack = () => {
    if (currentStep === "recipient") {
      setCurrentStep("issuer");
      setRecipient(null);
    } else if (currentStep === "stock_item") {
      setCurrentStep("recipient");
      setStockItem(null);
    } else if (currentStep === "job_card") {
      setCurrentStep("stock_item");
      setJobCard(null);
    } else if (currentStep === "confirm") {
      setCurrentStep("job_card");
    }
    setError(null);
    setScanInput("");
  };

  const handleConfirm = async () => {
    if (!issuer || !recipient || !stockItem || quantity <= 0) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const dto: CreateIssuanceDto = {
        issuerStaffId: issuer.id,
        recipientStaffId: recipient.id,
        stockItemId: stockItem.id,
        jobCardId: jobCard?.id ?? null,
        quantity,
        notes: notes.trim() || null,
      };

      await stockControlApiClient.createIssuance(dto);

      setSuccessMessage(
        `Successfully issued ${quantity}x ${stockItem.name} from ${issuer.name} to ${recipient.name}`,
      );

      setIssuer(null);
      setRecipient(null);
      setStockItem(null);
      setJobCard(null);
      setQuantity(1);
      setNotes("");
      setCurrentStep("issuer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create issuance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIssuer(null);
    setRecipient(null);
    setStockItem(null);
    setJobCard(null);
    setQuantity(1);
    setNotes("");
    setCurrentStep("issuer");
    setError(null);
    setSuccessMessage(null);
    setScanInput("");
  };

  const renderStaffCard = (staff: StaffMember, label: string) => (
    <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
      <div className="flex-shrink-0">
        {staff.photoUrl ? (
          <img
            src={staff.photoUrl}
            alt={staff.name}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
            <span className="text-teal-600 font-semibold">
              {staff.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{staff.name}</p>
        {staff.employeeNumber && <p className="text-xs text-gray-500">#{staff.employeeNumber}</p>}
      </div>
      <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );

  const renderStockItemCard = (item: StockItem) => (
    <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
      <div className="flex-shrink-0">
        {item.photoUrl ? (
          <img src={item.photoUrl} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Stock Item</p>
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-500">
          SKU: {item.sku} | Available: {item.quantity} {item.unitOfMeasure}
        </p>
      </div>
      <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );

  const renderJobCardCard = (jc: JobCard) => (
    <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
      <div className="flex-shrink-0">
        <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
          <svg
            className="h-6 w-6 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Job Card</p>
        <p className="text-sm font-medium text-gray-900 truncate">{jc.jobNumber}</p>
        <p className="text-xs text-gray-500 truncate">{jc.jobName}</p>
      </div>
      <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );

  const isConfirmDisabled =
    isSubmitting || quantity <= 0 || (stockItem !== null && quantity > stockItem.quantity);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Issue Stock</h1>
        {currentStep !== "issuer" && (
          <button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700">
            Start Over
          </button>
        )}
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm flex items-center justify-between">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {successMessage}
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-500 hover:text-green-700 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-center justify-between">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        {STEPS.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index < currentStepIndex
                  ? "bg-teal-600 text-white"
                  : index === currentStepIndex
                    ? "bg-teal-600 text-white ring-4 ring-teal-100"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {index < currentStepIndex ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`ml-2 text-sm font-medium hidden sm:inline ${
                index <= currentStepIndex ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <div
                className={`w-8 sm:w-16 h-0.5 mx-2 ${
                  index < currentStepIndex ? "bg-teal-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {issuer && currentStep !== "issuer" && (
          <div className="mb-4">{renderStaffCard(issuer, "Issuer (Giving)")}</div>
        )}
        {recipient && currentStep !== "recipient" && currentStep !== "issuer" && (
          <div className="mb-4">{renderStaffCard(recipient, "Recipient (Receiving)")}</div>
        )}
        {stockItem &&
          currentStep !== "stock_item" &&
          currentStep !== "issuer" &&
          currentStep !== "recipient" && (
            <div className="mb-4">{renderStockItemCard(stockItem)}</div>
          )}
        {jobCard && currentStep === "confirm" && (
          <div className="mb-4">{renderJobCardCard(jobCard)}</div>
        )}

        {currentStep === "confirm" ? (
          <div className="space-y-6">
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Issuance</h3>

              {!jobCard && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md text-sm mb-4">
                  No job card selected - stock will be issued without job reference
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    max={stockItem?.quantity ?? 1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-lg py-3"
                  />
                  {stockItem && (
                    <p className="mt-1 text-sm text-gray-500">
                      Available: {stockItem.quantity} {stockItem.unitOfMeasure}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                    placeholder="Add any notes about this issuance..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={isConfirmDisabled}
                className="px-6 py-3 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Issuing..." : "Issue Stock"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {currentStep === "issuer" && "Scan Issuer's Staff ID"}
                {currentStep === "recipient" && "Scan Recipient's Staff ID"}
                {currentStep === "stock_item" && "Scan Stock Item QR Code"}
                {currentStep === "job_card" && "Scan Job Card QR Code (Optional)"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {currentStep === "issuer" &&
                  "Scan the staff ID card of the person issuing the stock"}
                {currentStep === "recipient" &&
                  "Scan the staff ID card of the person receiving the stock"}
                {currentStep === "stock_item" &&
                  "Scan the QR code on the stock item or shelf label"}
                {currentStep === "job_card" &&
                  "Optionally scan a job card to link this issuance, or skip"}
              </p>

              <div className="flex space-x-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scan QR code or enter ID..."
                  autoFocus
                  className="flex-1 block rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-lg py-3"
                />
                <button
                  onClick={handleScan}
                  disabled={isScanning || !scanInput.trim()}
                  className="px-6 py-3 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isScanning ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    "Scan"
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              {currentStep !== "issuer" ? (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              {currentStep === "job_card" && (
                <button
                  onClick={handleSkipJobCard}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Skip - No Job Card
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
