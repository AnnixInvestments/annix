"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ItemSearch } from "../components/ItemSearch";
import { LiteJobCard, LiteStaffMember, LiteStockItem, liteApi } from "../lib/liteApi";

type Step = "issuer" | "recipient" | "job_card" | "items" | "confirm";

interface SelectedItem {
  stockItem: LiteStockItem;
  quantity: number;
}

interface SearchableStaff {
  id: number;
  label: string;
  sublabel: string;
}

interface SearchableJobCard {
  id: number;
  label: string;
  sublabel: string;
}

interface SearchableStockItem {
  id: number;
  label: string;
  sublabel: string;
  stockItem: LiteStockItem;
}

export default function IssueStockPage() {
  const [step, setStep] = useState<Step>("issuer");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [staff, setStaff] = useState<LiteStaffMember[]>([]);
  const [jobCards, setJobCards] = useState<LiteJobCard[]>([]);
  const [stockItems, setStockItems] = useState<LiteStockItem[]>([]);

  const [issuer, setIssuer] = useState<LiteStaffMember | null>(null);
  const [recipient, setRecipient] = useState<LiteStaffMember | null>(null);
  const [jobCard, setJobCard] = useState<LiteJobCard | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [currentQuantity, setCurrentQuantity] = useState("1");

  useEffect(() => {
    setIsLoading(true);
    Promise.all([liteApi.staffMembers(), liteApi.activeJobCards(), liteApi.stockItems()])
      .then(([staffData, jobCardData, stockData]) => {
        setStaff(staffData);
        setJobCards(jobCardData);
        setStockItems(stockData);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(`Failed to load data: ${err.message}`);
        setIsLoading(false);
      });
  }, []);

  const staffSearchItems: SearchableStaff[] = staff.map((s) => ({
    id: s.id,
    label: s.name,
    sublabel: s.role,
  }));

  const jobCardSearchItems: SearchableJobCard[] = jobCards.map((j) => ({
    id: j.id,
    label: `${j.jobNumber} - ${j.customerName}`,
    sublabel: j.description,
  }));

  const stockSearchItems: SearchableStockItem[] = stockItems
    .filter((item) => {
      const alreadySelected = selectedItems.some((s) => s.stockItem.id === item.id);
      return !alreadySelected && item.currentQuantity > 0;
    })
    .map((item) => ({
      id: item.id,
      label: `${item.stockNumber} - ${item.description}`,
      sublabel: `${item.categoryName} | Available: ${item.currentQuantity} ${item.unit}`,
      stockItem: item,
    }));

  const handleSelectIssuer = useCallback(
    (item: SearchableStaff) => {
      const found = staff.find((s) => s.id === item.id);
      if (found) {
        setIssuer(found);
        setStep("recipient");
      }
    },
    [staff],
  );

  const handleSelectRecipient = useCallback(
    (item: SearchableStaff) => {
      const found = staff.find((s) => s.id === item.id);
      if (found) {
        setRecipient(found);
        setStep("job_card");
      }
    },
    [staff],
  );

  const handleSelectJobCard = useCallback(
    (item: SearchableJobCard) => {
      const found = jobCards.find((j) => j.id === item.id);
      if (found) {
        setJobCard(found);
        setStep("items");
      }
    },
    [jobCards],
  );

  const handleSelectStockItem = useCallback(
    (item: SearchableStockItem) => {
      const qty = parseInt(currentQuantity, 10);
      if (Number.isNaN(qty) || qty < 1) {
        alert("Please enter a valid quantity");
        return;
      }
      if (qty > item.stockItem.currentQuantity) {
        alert(`Quantity exceeds available stock (${item.stockItem.currentQuantity})`);
        return;
      }
      setSelectedItems((prev) => [...prev, { stockItem: item.stockItem, quantity: qty }]);
      setCurrentQuantity("1");
    },
    [currentQuantity],
  );

  const handleRemoveItem = useCallback((stockItemId: number) => {
    setSelectedItems((prev) => prev.filter((item) => item.stockItem.id !== stockItemId));
  }, []);

  const handleSubmit = async () => {
    if (!issuer || !recipient || !jobCard || selectedItems.length === 0) {
      alert("Please complete all steps");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await liteApi.issueStock({
        issuerId: issuer.id,
        recipientId: recipient.id,
        jobCardId: jobCard.id,
        items: selectedItems.map((item) => ({
          stockItemId: item.stockItem.id,
          quantity: item.quantity,
        })),
      });
      alert("Stock issued successfully!");
      setStep("issuer");
      setIssuer(null);
      setRecipient(null);
      setJobCard(null);
      setSelectedItems([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to issue stock: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === "recipient") {
      setStep("issuer");
      setIssuer(null);
    } else if (step === "job_card") {
      setStep("recipient");
      setRecipient(null);
    } else if (step === "items") {
      setStep("job_card");
      setJobCard(null);
    } else if (step === "confirm") {
      setStep("items");
    }
  };

  const stepNumber = { issuer: 1, recipient: 2, job_card: 3, items: 4, confirm: 5 }[step];

  if (error && !submitting) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href="/stock-control/lite" className="text-teal-600 hover:text-teal-700">
          ← Back to Menu
        </Link>
        <span className="text-sm text-gray-500">Step {stepNumber} of 5</span>
      </div>

      <div className="flex mb-6">
        {["issuer", "recipient", "job_card", "items", "confirm"].map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-2 mx-0.5 rounded ${i < stepNumber ? "bg-teal-600" : "bg-gray-300"}`}
          />
        ))}
      </div>

      {step !== "issuer" && (
        <button onClick={goBack} className="mb-4 text-sm text-gray-600 hover:text-gray-800">
          ← Go back
        </button>
      )}

      {step === "issuer" && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Select Issuer</h1>
          <p className="text-gray-600 mb-4">Who is issuing the stock?</p>
          <ItemSearch
            items={staffSearchItems}
            placeholder="Search staff by name..."
            onSelect={handleSelectIssuer}
            isLoading={isLoading}
            emptyMessage="No staff members found"
          />
        </div>
      )}

      {step === "recipient" && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Select Recipient</h1>
          <p className="text-gray-600 mb-4">
            Who is receiving the stock?
            {issuer && (
              <span className="block text-sm text-teal-600 mt-1">Issuer: {issuer.name}</span>
            )}
          </p>
          <ItemSearch
            items={staffSearchItems}
            placeholder="Search staff by name..."
            onSelect={handleSelectRecipient}
            isLoading={isLoading}
            emptyMessage="No staff members found"
          />
        </div>
      )}

      {step === "job_card" && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Select Job Card</h1>
          <p className="text-gray-600 mb-4">
            Which job card is this for?
            {issuer && recipient && (
              <span className="block text-sm text-teal-600 mt-1">
                {issuer.name} → {recipient.name}
              </span>
            )}
          </p>
          <ItemSearch
            items={jobCardSearchItems}
            placeholder="Search by job number or customer..."
            onSelect={handleSelectJobCard}
            isLoading={isLoading}
            emptyMessage="No active job cards found"
          />
        </div>
      )}

      {step === "items" && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Add Stock Items</h1>
          {jobCard && (
            <p className="text-sm text-teal-600 mb-4">
              Job: {jobCard.jobNumber} - {jobCard.customerName}
            </p>
          )}

          {selectedItems.length > 0 && (
            <div className="mb-4 bg-white rounded-lg p-4 shadow-sm">
              <h2 className="font-medium text-gray-900 mb-2">
                Selected Items ({selectedItems.length})
              </h2>
              <ul className="space-y-2">
                {selectedItems.map((item) => (
                  <li key={item.stockItem.id} className="flex items-center justify-between text-sm">
                    <span>
                      {item.stockItem.stockNumber}: {item.quantity} {item.stockItem.unit}
                    </span>
                    <button
                      onClick={() => handleRemoveItem(item.stockItem.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setStep("confirm")}
                className="mt-4 w-full py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700"
              >
                Continue to Confirm →
              </button>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity to issue:
            </label>
            <input
              type="number"
              min="1"
              value={currentQuantity}
              onChange={(e) => setCurrentQuantity(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
            />
          </div>

          <ItemSearch
            items={stockSearchItems}
            placeholder="Search by stock number or description..."
            onSelect={handleSelectStockItem}
            isLoading={isLoading}
            emptyMessage="No available stock items"
          />
        </div>
      )}

      {step === "confirm" && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Confirm Issuance</h1>

          <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
            <div>
              <p className="text-sm text-gray-500">Issuer</p>
              <p className="font-medium">{issuer ? issuer.name : "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Recipient</p>
              <p className="font-medium">{recipient ? recipient.name : "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Job Card</p>
              <p className="font-medium">
                {jobCard ? `${jobCard.jobNumber} - ${jobCard.customerName}` : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Items ({selectedItems.length})</p>
              <ul className="mt-1 space-y-1">
                {selectedItems.map((item) => (
                  <li key={item.stockItem.id} className="text-sm">
                    {item.stockItem.stockNumber}: {item.quantity} {item.stockItem.unit}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={
              "mt-6 w-full py-4 rounded-lg font-bold text-white text-lg " +
              (submitting ? "bg-gray-400" : "bg-teal-600 hover:bg-teal-700")
            }
          >
            {submitting ? "Submitting..." : "Confirm & Issue Stock"}
          </button>
        </div>
      )}
    </div>
  );
}
