"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  BatchIssuanceDto,
  BatchIssuanceResult,
  IssuanceScanResult,
  JobCard,
  StaffMember,
  StockIssuance,
  StockItem,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { QrScanner } from "../../components/QrScanner";

type Step = "issuer" | "recipient" | "stock_items" | "job_card" | "confirm";

interface IssuanceItem {
  stockItem: StockItem;
  quantity: number;
  batchNumber: string;
}

interface SessionIssuance {
  id: number;
  issuanceIds: number[];
  issuerName: string;
  recipientName: string;
  itemSummary: string;
  itemCount: number;
  totalQty: number;
  jobNumber: string | null;
  timestamp: string;
  canUndo: boolean;
}

interface FavouriteCombo {
  recipientId: number;
  recipientName: string;
  recipientPhoto: string | null;
  itemIds: number[];
  itemNames: string[];
  useCount: number;
  lastUsed: string;
}

const FAVOURITES_KEY = "asca-issuance-favourites";
const QUICK_ISSUE_KEY = "asca-quick-issue-mode";
const BATCH_MODE_KEY = "asca-batch-mode";
const UNDO_WINDOW_MS = 5 * 60 * 1000;

const STEPS: { key: Step; label: string }[] = [
  { key: "issuer", label: "Issuer" },
  { key: "recipient", label: "Recipient" },
  { key: "stock_items", label: "Items" },
  { key: "job_card", label: "Job Card" },
  { key: "confirm", label: "Confirm" },
];

function loadFavourites(): FavouriteCombo[] {
  try {
    const raw = localStorage.getItem(FAVOURITES_KEY);
    return raw ? (JSON.parse(raw) as FavouriteCombo[]) : [];
  } catch {
    return [];
  }
}

function saveFavourites(favourites: FavouriteCombo[]): void {
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
}

function updateFavourites(recipient: StaffMember, items: IssuanceItem[]): void {
  const existing = loadFavourites();
  const itemIds = items.map((i) => i.stockItem.id).sort((a, b) => a - b);
  const matchIndex = existing.findIndex(
    (f) =>
      f.recipientId === recipient.id &&
      f.itemIds.length === itemIds.length &&
      f.itemIds.every((id, idx) => id === itemIds[idx]),
  );

  if (matchIndex >= 0) {
    const updated = [...existing];
    updated[matchIndex] = {
      ...updated[matchIndex],
      useCount: updated[matchIndex].useCount + 1,
      lastUsed: new Date().toISOString(),
    };
    saveFavourites(updated);
  } else {
    const newFav: FavouriteCombo = {
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientPhoto: recipient.photoUrl ?? null,
      itemIds,
      itemNames: items.map((i) => i.stockItem.name),
      useCount: 1,
      lastUsed: new Date().toISOString(),
    };
    saveFavourites([newFav, ...existing].slice(0, 50));
  }
}

function triggerHaptic(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(50);
  }
}

function playSuccessSound(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 200);
  } catch {
    // Audio not available
  }
}

function staffInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function IssueStockPage() {
  const { profile } = useStockControlAuth();
  const [currentStep, setCurrentStep] = useState<Step>("issuer");
  const [scanInput, setScanInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [issuer, setIssuer] = useState<StaffMember | null>(null);
  const [recipient, setRecipient] = useState<StaffMember | null>(null);
  const [items, setItems] = useState<IssuanceItem[]>([]);
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [notes, setNotes] = useState("");

  const [quickIssueMode, setQuickIssueMode] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [linkedStaff, setLinkedStaff] = useState<StaffMember | null>(null);
  const [sessionIssuances, setSessionIssuances] = useState<SessionIssuance[]>([]);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [favourites, setFavourites] = useState<FavouriteCombo[]>([]);
  const [showFavourites, setShowFavourites] = useState(false);
  const [recentIssuances, setRecentIssuances] = useState<StockIssuance[]>([]);
  const [undoingId, setUndoingId] = useState<number | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [showLinkStaffModal, setShowLinkStaffModal] = useState(false);
  const [showBrowseItems, setShowBrowseItems] = useState(false);
  const [browseSearch, setBrowseSearch] = useState("");
  const [browseItems, setBrowseItems] = useState<StockItem[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);

  useEffect(() => {
    setQuickIssueMode(localStorage.getItem(QUICK_ISSUE_KEY) === "true");
    setBatchMode(localStorage.getItem(BATCH_MODE_KEY) === "true");
    setFavourites(loadFavourites());
  }, []);

  useEffect(() => {
    if (profile?.linkedStaffId) {
      stockControlApiClient
        .staffMemberById(profile.linkedStaffId)
        .then((staff) => {
          setLinkedStaff(staff);
          if (localStorage.getItem(QUICK_ISSUE_KEY) === "true" && !issuer) {
            setIssuer(staff);
            setCurrentStep("recipient");
          }
        })
        .catch(() => setLinkedStaff(null));
    }
  }, [profile?.linkedStaffId]);

  useEffect(() => {
    stockControlApiClient
      .recentIssuances()
      .then(setRecentIssuances)
      .catch(() => setRecentIssuances([]));
  }, []);

  const fetchBrowseItems = useCallback(async (search: string) => {
    try {
      setBrowseLoading(true);
      const result = await stockControlApiClient.stockItems({
        search: search || undefined,
        limit: "20",
      });
      setBrowseItems(result.items);
    } catch (err) {
      console.error("Failed to fetch browse items:", err);
      setBrowseItems([]);
    } finally {
      setBrowseLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showBrowseItems) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    timeoutId = setTimeout(() => {
      fetchBrowseItems(browseSearch);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [browseSearch, showBrowseItems, fetchBrowseItems]);

  const handleBrowseItemSelect = (stockItem: StockItem) => {
    const alreadyAdded = items.some((i) => i.stockItem.id === stockItem.id);
    if (alreadyAdded) {
      setError(`${stockItem.name} is already in your list`);
      return;
    }
    if (stockItem.quantity <= 0) {
      setError(`${stockItem.name} has no available stock`);
      return;
    }
    setItems([...items, { stockItem, quantity: 1, batchNumber: "" }]);
    triggerHaptic();
    playSuccessSound();
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const handleScan = async () => {
    await processScanResult(scanInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan();
    }
  };

  const handleCameraScan = (result: string) => {
    setShowCameraScanner(false);
    setScanInput(result);
    triggerHaptic();
    playSuccessSound();
    setTimeout(() => {
      processScanResult(result);
    }, 100);
  };

  const processScanResult = async (input: string) => {
    if (!input.trim()) return;

    try {
      setIsScanning(true);
      setError(null);

      const result: IssuanceScanResult = await stockControlApiClient.scanIssuanceQr(input.trim());

      triggerHaptic();
      playSuccessSound();

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
        setCurrentStep("stock_items");
      } else if (currentStep === "stock_items") {
        if (result.type !== "stock_item") {
          setError("Please scan a stock item QR code");
          return;
        }
        const stockItem = result.data as StockItem;
        const existingIndex = items.findIndex((i) => i.stockItem.id === stockItem.id);
        if (existingIndex >= 0) {
          setError(`${stockItem.name} is already in your list`);
          return;
        }
        setItems([...items, { stockItem, quantity: 1, batchNumber: "" }]);
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

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    setItems(items.map((item, i) => (i === index ? { ...item, quantity } : item)));
  };

  const handleUpdateBatchNumber = (index: number, batchNumber: string) => {
    setItems(items.map((item, i) => (i === index ? { ...item, batchNumber } : item)));
  };

  const handleContinueToJobCard = () => {
    if (items.length === 0) {
      setError("Please add at least one item");
      return;
    }
    setCurrentStep("job_card");
    setError(null);
  };

  const handleSkipJobCard = () => {
    setJobCard(null);
    setCurrentStep("confirm");
  };

  const handleBack = () => {
    if (currentStep === "recipient") {
      if (quickIssueMode && linkedStaff) {
        return;
      }
      setCurrentStep("issuer");
      setRecipient(null);
    } else if (currentStep === "stock_items") {
      setCurrentStep("recipient");
      setItems([]);
    } else if (currentStep === "job_card") {
      setCurrentStep("stock_items");
      setJobCard(null);
    } else if (currentStep === "confirm") {
      setCurrentStep("job_card");
    }
    setError(null);
    setScanInput("");
  };

  const startNextIssuance = useCallback(() => {
    setItems([]);
    setJobCard(null);
    setNotes("");
    setError(null);
    setSuccessMessage(null);
    setScanInput("");

    if (batchMode && issuer) {
      if (recipient) {
        setCurrentStep("stock_items");
      } else {
        setCurrentStep("recipient");
      }
    } else if (quickIssueMode && linkedStaff) {
      setRecipient(null);
      setCurrentStep("recipient");
    } else {
      setIssuer(null);
      setRecipient(null);
      setCurrentStep("issuer");
    }
  }, [batchMode, quickIssueMode, linkedStaff, issuer, recipient]);

  const handleConfirm = async () => {
    if (!issuer || !recipient || items.length === 0) return;

    const invalidItems = items.filter(
      (item) => item.quantity > item.stockItem.quantity || item.quantity <= 0,
    );
    if (invalidItems.length > 0) {
      setError("Some items have invalid quantities. Please check and try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const dto: BatchIssuanceDto = {
        issuerStaffId: issuer.id,
        recipientStaffId: recipient.id,
        jobCardId: jobCard ? jobCard.id : null,
        items: items.map((item) => ({
          stockItemId: item.stockItem.id,
          quantity: item.quantity,
          batchNumber: item.batchNumber.trim() || null,
        })),
        notes: notes.trim() || null,
      };

      const result: BatchIssuanceResult = await stockControlApiClient.createBatchIssuance(dto);

      if (result.errors.length > 0) {
        setError(`Some items failed: ${result.errors.map((e) => e.message).join(", ")}`);
      }

      if (result.created > 0) {
        triggerHaptic();
        playSuccessSound();

        updateFavourites(recipient, items);
        setFavourites(loadFavourites());

        const itemSummary = items
          .map((item) => `${item.quantity}x ${item.stockItem.name}`)
          .join(", ");

        const sessionEntry: SessionIssuance = {
          id: Date.now(),
          issuanceIds: result.issuances.map((i) => i.id),
          issuerName: issuer.name,
          recipientName: recipient.name,
          itemSummary,
          itemCount: items.length,
          totalQty: items.reduce((sum, item) => sum + item.quantity, 0),
          jobNumber: jobCard?.jobNumber ?? null,
          timestamp: new Date().toISOString(),
          canUndo: true,
        };

        setSessionIssuances((prev) => [sessionEntry, ...prev]);

        setSuccessMessage(
          `Issued ${result.created} item(s) (${itemSummary}) from ${issuer.name} to ${recipient.name}`,
        );

        stockControlApiClient
          .recentIssuances()
          .then(setRecentIssuances)
          .catch(() => {});

        if (batchMode) {
          setItems([]);
          setJobCard(null);
          setNotes("");
          setCurrentStep("stock_items");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create issuance");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndo = async (sessionEntry: SessionIssuance) => {
    const elapsed = Date.now() - new Date(sessionEntry.timestamp).getTime();
    if (elapsed > UNDO_WINDOW_MS) {
      setError("Undo window has expired (5 minutes)");
      return;
    }

    try {
      setUndoingId(sessionEntry.id);
      const undoPromises = sessionEntry.issuanceIds.map((issuanceId) =>
        stockControlApiClient.undoIssuance(issuanceId),
      );
      await Promise.all(undoPromises);

      setSessionIssuances((prev) =>
        prev.map((s) => (s.id === sessionEntry.id ? { ...s, canUndo: false } : s)),
      );

      setSuccessMessage(`Undone: ${sessionEntry.itemSummary} to ${sessionEntry.recipientName}`);

      stockControlApiClient
        .recentIssuances()
        .then(setRecentIssuances)
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to undo issuance");
    } finally {
      setUndoingId(null);
    }
  };

  const handleReset = () => {
    setIssuer(quickIssueMode && linkedStaff ? linkedStaff : null);
    setRecipient(null);
    setItems([]);
    setJobCard(null);
    setNotes("");
    setCurrentStep(quickIssueMode && linkedStaff ? "recipient" : "issuer");
    setError(null);
    setSuccessMessage(null);
    setScanInput("");
  };

  const toggleQuickIssue = async (enabled: boolean) => {
    if (enabled && !profile?.linkedStaffId) {
      try {
        const staffMembers = await stockControlApiClient.staffMembers({
          active: "true",
        });
        setStaffList(staffMembers);
        setShowLinkStaffModal(true);
      } catch {
        setError("Failed to load staff members");
      }
      return;
    }

    setQuickIssueMode(enabled);
    localStorage.setItem(QUICK_ISSUE_KEY, String(enabled));

    if (enabled && linkedStaff && currentStep === "issuer") {
      setIssuer(linkedStaff);
      setCurrentStep("recipient");
    } else if (!enabled && currentStep === "recipient" && !recipient) {
      setIssuer(null);
      setCurrentStep("issuer");
    }
  };

  const handleLinkStaff = async (staffId: number) => {
    try {
      await stockControlApiClient.updateLinkedStaff(staffId);
      const staff = await stockControlApiClient.staffMemberById(staffId);
      setLinkedStaff(staff);
      setShowLinkStaffModal(false);
      setQuickIssueMode(true);
      localStorage.setItem(QUICK_ISSUE_KEY, "true");
      setIssuer(staff);
      setCurrentStep("recipient");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link staff member");
    }
  };

  const toggleBatchMode = (enabled: boolean) => {
    setBatchMode(enabled);
    localStorage.setItem(BATCH_MODE_KEY, String(enabled));
  };

  const totalItemsQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasInvalidQuantities = items.some(
    (item) => item.quantity > item.stockItem.quantity || item.quantity <= 0,
  );
  const isConfirmDisabled = isSubmitting || items.length === 0 || hasInvalidQuantities;

  const topFavourites = favourites.sort((a, b) => b.useCount - a.useCount).slice(0, 5);

  return (
    <>
      {showCameraScanner && (
        <QrScanner onScan={handleCameraScan} onClose={() => setShowCameraScanner(false)} />
      )}

      {showLinkStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Link Your Staff Profile</h3>
              <p className="text-sm text-gray-500 mt-1">
                Select your staff member to enable Quick Issue mode
              </p>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
              {staffList.map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => handleLinkStaff(staff.id)}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200 text-left"
                >
                  <div className="flex-shrink-0">
                    {staff.photoUrl ? (
                      <img
                        src={staff.photoUrl}
                        alt={staff.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center">
                        <span className="text-teal-600 font-semibold text-sm">
                          {staffInitials(staff.name)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{staff.name}</p>
                    {staff.employeeNumber && (
                      <p className="text-xs text-gray-500">#{staff.employeeNumber}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => setShowLinkStaffModal(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Issue Stock</h1>
          <div className="flex items-center gap-3">
            {sessionIssuances.length > 0 && (
              <button
                onClick={() => setShowSessionSummary(!showSessionSummary)}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Session ({sessionIssuances.length})
              </button>
            )}
            {currentStep !== "issuer" && !(quickIssueMode && currentStep === "recipient") && (
              <button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700">
                Start Over
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 bg-gray-50 rounded-lg p-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={quickIssueMode}
              onChange={(e) => toggleQuickIssue(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700">Quick Issue</span>
            {linkedStaff && quickIssueMode && (
              <span className="text-xs text-gray-500">({linkedStaff.name})</span>
            )}
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={batchMode}
              onChange={(e) => toggleBatchMode(e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700">Batch Mode</span>
          </label>
        </div>

        {showSessionSummary && sessionIssuances.length > 0 && (
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Session Summary</h3>
              <button
                onClick={() => {
                  setSessionIssuances([]);
                  setShowSessionSummary(false);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {sessionIssuances.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3 rounded-lg text-sm ${entry.canUndo ? "bg-green-50" : "bg-gray-100 opacity-60"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{entry.itemSummary}</p>
                    <p className="text-xs text-gray-500">
                      {entry.issuerName} &rarr; {entry.recipientName}
                      {entry.jobNumber ? ` | JC: ${entry.jobNumber}` : ""}
                    </p>
                  </div>
                  {entry.canUndo ? (
                    <button
                      onClick={() => handleUndo(entry)}
                      disabled={undoingId === entry.id}
                      className="ml-3 px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50"
                    >
                      {undoingId === entry.id ? "Undoing..." : "Undo"}
                    </button>
                  ) : (
                    <span className="ml-3 text-xs text-gray-400">Undone</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t text-sm text-gray-600">
              <strong>Total:</strong> {sessionIssuances.filter((s) => s.canUndo).length}{" "}
              issuance(s),{" "}
              {sessionIssuances.filter((s) => s.canUndo).reduce((sum, s) => sum + s.totalQty, 0)}{" "}
              units
            </div>
          </div>
        )}

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
            <div className="flex items-center gap-2">
              {!batchMode && (
                <button
                  onClick={startNextIssuance}
                  className="text-teal-600 hover:text-teal-700 font-medium"
                >
                  Issue More
                </button>
              )}
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-green-500 hover:text-green-700 font-medium"
              >
                Dismiss
              </button>
            </div>
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

        {currentStep === "recipient" && topFavourites.length > 0 && !recipient && (
          <div className="bg-white shadow rounded-lg p-4">
            <button
              onClick={() => setShowFavourites(!showFavourites)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700"
            >
              <span>Recent / Favourites</span>
              <svg
                className={`w-4 h-4 transition-transform ${showFavourites ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showFavourites && (
              <div className="mt-3 space-y-2">
                {topFavourites.map((fav, idx) => (
                  <button
                    key={`${fav.recipientId}-${idx}`}
                    onClick={async () => {
                      try {
                        const staff = await stockControlApiClient.staffMemberById(fav.recipientId);
                        setRecipient(staff);
                        setCurrentStep("stock_items");
                        triggerHaptic();
                      } catch {
                        setError("Staff member no longer available");
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200 text-left"
                  >
                    <div className="flex-shrink-0">
                      {fav.recipientPhoto ? (
                        <img
                          src={fav.recipientPhoto}
                          alt={fav.recipientName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
                          <span className="text-teal-600 font-semibold text-xs">
                            {staffInitials(fav.recipientName)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{fav.recipientName}</p>
                      <p className="text-xs text-gray-500 truncate">{fav.itemNames.join(", ")}</p>
                    </div>
                    <span className="text-xs text-gray-400">{fav.useCount}x</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          {issuer && currentStep !== "issuer" && (
            <div className="mb-4">
              <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {issuer.photoUrl ? (
                    <img
                      src={issuer.photoUrl}
                      alt={issuer.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
                      <span className="text-teal-600 font-semibold">
                        {staffInitials(issuer.name)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Issuer (Giving)
                    {quickIssueMode && " - Quick Issue"}
                  </p>
                  <p className="text-sm font-medium text-gray-900 truncate">{issuer.name}</p>
                  {issuer.employeeNumber && (
                    <p className="text-xs text-gray-500">#{issuer.employeeNumber}</p>
                  )}
                </div>
                <svg
                  className="h-5 w-5 text-green-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          )}
          {recipient && currentStep !== "recipient" && currentStep !== "issuer" && (
            <div className="mb-4">
              <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {recipient.photoUrl ? (
                    <img
                      src={recipient.photoUrl}
                      alt={recipient.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
                      <span className="text-teal-600 font-semibold">
                        {staffInitials(recipient.name)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Recipient (Receiving)
                  </p>
                  <p className="text-sm font-medium text-gray-900 truncate">{recipient.name}</p>
                  {recipient.employeeNumber && (
                    <p className="text-xs text-gray-500">#{recipient.employeeNumber}</p>
                  )}
                </div>
                <svg
                  className="h-5 w-5 text-green-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          )}
          {items.length > 0 && currentStep === "confirm" && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Stock Items ({items.length})
              </p>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.stockItem.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {item.stockItem.photoUrl ? (
                            <img
                              src={item.stockItem.photoUrl}
                              alt={item.stockItem.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
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
                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                            Stock Item
                          </p>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.stockItem.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            SKU: {item.stockItem.sku} | Available: {item.stockItem.quantity}{" "}
                            {item.stockItem.unitOfMeasure}
                          </p>
                          {item.batchNumber && (
                            <p className="text-xs text-teal-600 font-medium">
                              Batch: {item.batchNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      x{item.quantity} {item.stockItem.unitOfMeasure}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {jobCard && currentStep === "confirm" && (
            <div className="mb-4">
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
                  <p className="text-sm font-medium text-gray-900 truncate">{jobCard.jobNumber}</p>
                  <p className="text-xs text-gray-500 truncate">{jobCard.jobName}</p>
                </div>
                <svg
                  className="h-5 w-5 text-green-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
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

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Total Items:</strong> {items.length}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Total Quantity:</strong> {totalItemsQty}
                  </p>
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
                  {isSubmitting ? "Issuing..." : `Issue ${items.length} Item(s)`}
                </button>
              </div>
            </div>
          ) : currentStep === "stock_items" ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Scan Stock Items</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Scan the QR code on each stock item to add it to the issuance
                </p>

                {items.length > 0 && (
                  <div className="mb-4 space-y-3">
                    <p className="text-sm font-medium text-gray-700">
                      Items to issue ({items.length}):
                    </p>
                    {items.map((item, index) => (
                      <div
                        key={item.stockItem.id}
                        className="bg-gray-50 rounded-lg p-3 flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.stockItem.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            SKU: {item.stockItem.sku} | Available: {item.stockItem.quantity}{" "}
                            {item.stockItem.unitOfMeasure}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            max={item.stockItem.quantity}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(index, parseInt(e.target.value, 10) || 0)
                            }
                            className={`w-16 text-center rounded-md border shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm py-1 ${
                              item.quantity > item.stockItem.quantity
                                ? "border-red-300 bg-red-50"
                                : "border-gray-300"
                            }`}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Batch:</label>
                          <input
                            type="text"
                            value={item.batchNumber}
                            onChange={(e) => handleUpdateBatchNumber(index, e.target.value)}
                            placeholder="Optional"
                            className="w-24 rounded-md border border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm py-1 px-2"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-red-500 hover:text-red-700"
                          title="Remove item"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex space-x-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Scan item QR code..."
                    autoFocus
                    className="flex-1 block rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-lg py-3"
                  />
                  <button
                    onClick={() => setShowCameraScanner(true)}
                    className="px-4 py-3 text-sm font-medium text-white bg-gray-700 border border-transparent rounded-md hover:bg-gray-800"
                    title="Scan with camera"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handleScan}
                    disabled={isScanning || !scanInput.trim()}
                    className="px-6 py-3 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isScanning ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      "Add"
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-sm text-gray-400 font-medium">OR</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <button
                  onClick={() => {
                    setShowBrowseItems(!showBrowseItems);
                    if (!showBrowseItems) {
                      setBrowseSearch("");
                    }
                  }}
                  className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {showBrowseItems ? "Hide Browse Panel" : "Browse Items Manually"}
                </button>

                {showBrowseItems && (
                  <div className="mt-4 border border-gray-200 rounded-lg p-4">
                    <input
                      type="text"
                      value={browseSearch}
                      onChange={(e) => setBrowseSearch(e.target.value)}
                      placeholder="Search items by name or SKU..."
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm py-2 mb-3"
                    />

                    {browseLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
                      </div>
                    ) : browseItems.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No items found</p>
                    ) : (
                      <div className="max-h-80 overflow-y-auto space-y-2">
                        {browseItems.map((stockItem) => {
                          const alreadyAdded = items.some((i) => i.stockItem.id === stockItem.id);
                          const outOfStock = stockItem.quantity <= 0;
                          return (
                            <button
                              key={stockItem.id}
                              onClick={() => handleBrowseItemSelect(stockItem)}
                              disabled={alreadyAdded || outOfStock}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                                alreadyAdded
                                  ? "border-green-200 bg-green-50 cursor-not-allowed opacity-60"
                                  : outOfStock
                                    ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                                    : "border-gray-200 hover:bg-teal-50 hover:border-teal-300"
                              }`}
                            >
                              <div className="flex-shrink-0">
                                {stockItem.photoUrl ? (
                                  <img
                                    src={stockItem.photoUrl}
                                    alt={stockItem.name}
                                    className="h-10 w-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <svg
                                      className="h-5 w-5 text-blue-600"
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
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {stockItem.name}
                                </p>
                                <p className="text-xs text-gray-500">SKU: {stockItem.sku}</p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                {alreadyAdded ? (
                                  <span className="text-xs font-medium text-green-600">Added</span>
                                ) : outOfStock ? (
                                  <span className="text-xs font-medium text-red-500">
                                    Out of stock
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500">
                                    {stockItem.quantity} {stockItem.unitOfMeasure}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleContinueToJobCard}
                  disabled={items.length === 0}
                  className="px-6 py-3 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Continue ({items.length} item{items.length !== 1 ? "s" : ""})
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {currentStep === "issuer" && "Scan Issuer's Staff ID"}
                  {currentStep === "recipient" && "Scan Recipient's Staff ID"}
                  {currentStep === "job_card" && "Scan Job Card QR Code (Optional)"}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {currentStep === "issuer" &&
                    "Scan the staff ID card of the person issuing the stock"}
                  {currentStep === "recipient" &&
                    "Scan the staff ID card of the person receiving the stock"}
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
                    onClick={() => setShowCameraScanner(true)}
                    className="px-4 py-3 text-sm font-medium text-white bg-gray-700 border border-transparent rounded-md hover:bg-gray-800"
                    title="Scan with camera"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={handleScan}
                    disabled={isScanning || !scanInput.trim()}
                    className="px-6 py-3 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isScanning ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    ) : (
                      "Submit"
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                {currentStep !== "issuer" && !(quickIssueMode && currentStep === "recipient") ? (
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

        {batchMode && sessionIssuances.length > 0 && currentStep !== "confirm" && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowSessionSummary(true)}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Done - View Session Summary ({sessionIssuances.length} issuance
              {sessionIssuances.length !== 1 ? "s" : ""})
            </button>
          </div>
        )}
      </div>
    </>
  );
}
