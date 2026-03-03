"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ItemSearch } from "../components/ItemSearch";
import { LiteDelivery, LiteStaffMember, LiteStockItem, liteApi } from "../lib/liteApi";

type Step = "receiver" | "delivery" | "items" | "confirm";

interface ReceivedItem {
  stockItem: LiteStockItem;
  quantityReceived: number;
}

interface SearchableStaff {
  id: number;
  label: string;
  sublabel: string;
}

interface SearchableDelivery {
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

export default function ReceiveDeliveryPage() {
  const [step, setStep] = useState<Step>("receiver");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [staff, setStaff] = useState<LiteStaffMember[]>([]);
  const [deliveries, setDeliveries] = useState<LiteDelivery[]>([]);
  const [stockItems, setStockItems] = useState<LiteStockItem[]>([]);

  const [receiver, setReceiver] = useState<LiteStaffMember | null>(null);
  const [delivery, setDelivery] = useState<LiteDelivery | null>(null);
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
  const [currentQuantity, setCurrentQuantity] = useState("1");

  useEffect(() => {
    setIsLoading(true);
    Promise.all([liteApi.staffMembers(), liteApi.pendingDeliveries(), liteApi.stockItems()])
      .then(([staffData, deliveryData, stockData]) => {
        setStaff(staffData);
        setDeliveries(deliveryData);
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

  const deliverySearchItems: SearchableDelivery[] = deliveries.map((d) => ({
    id: d.id,
    label: d.deliveryNoteNumber,
    sublabel: d.supplierName,
  }));

  const stockSearchItems: SearchableStockItem[] = stockItems
    .filter((item) => {
      return !receivedItems.some((r) => r.stockItem.id === item.id);
    })
    .map((item) => ({
      id: item.id,
      label: `${item.stockNumber} - ${item.description}`,
      sublabel: `${item.categoryName} | ${item.unit}`,
      stockItem: item,
    }));

  const handleSelectReceiver = useCallback(
    (item: SearchableStaff) => {
      const found = staff.find((s) => s.id === item.id);
      if (found) {
        setReceiver(found);
        setStep("delivery");
      }
    },
    [staff],
  );

  const handleSelectDelivery = useCallback(
    (item: SearchableDelivery) => {
      const found = deliveries.find((d) => d.id === item.id);
      if (found) {
        setDelivery(found);
        setStep("items");
      }
    },
    [deliveries],
  );

  const handleSelectStockItem = useCallback(
    (item: SearchableStockItem) => {
      const qty = parseInt(currentQuantity, 10);
      if (Number.isNaN(qty) || qty < 1) {
        alert("Please enter a valid quantity");
        return;
      }
      setReceivedItems((prev) => [...prev, { stockItem: item.stockItem, quantityReceived: qty }]);
      setCurrentQuantity("1");
    },
    [currentQuantity],
  );

  const handleRemoveItem = useCallback((stockItemId: number) => {
    setReceivedItems((prev) => prev.filter((item) => item.stockItem.id !== stockItemId));
  }, []);

  const handleSubmit = async () => {
    if (!receiver || !delivery || receivedItems.length === 0) {
      alert("Please complete all steps");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await liteApi.confirmDelivery(delivery.id, {
        receivedById: receiver.id,
        items: receivedItems.map((item) => ({
          stockItemId: item.stockItem.id,
          quantityReceived: item.quantityReceived,
        })),
      });
      alert("Delivery received successfully!");
      setStep("receiver");
      setReceiver(null);
      setDelivery(null);
      setReceivedItems([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to confirm delivery: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === "delivery") {
      setStep("receiver");
      setReceiver(null);
    } else if (step === "items") {
      setStep("delivery");
      setDelivery(null);
    } else if (step === "confirm") {
      setStep("items");
    }
  };

  const stepNumber = { receiver: 1, delivery: 2, items: 3, confirm: 4 }[step];

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
        <span className="text-sm text-gray-500">Step {stepNumber} of 4</span>
      </div>

      <div className="flex mb-6">
        {["receiver", "delivery", "items", "confirm"].map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-2 mx-0.5 rounded ${i < stepNumber ? "bg-teal-600" : "bg-gray-300"}`}
          />
        ))}
      </div>

      {step !== "receiver" && (
        <button onClick={goBack} className="mb-4 text-sm text-gray-600 hover:text-gray-800">
          ← Go back
        </button>
      )}

      {step === "receiver" && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Select Receiver</h1>
          <p className="text-gray-600 mb-4">Who is receiving this delivery?</p>
          <ItemSearch
            items={staffSearchItems}
            placeholder="Search staff by name..."
            onSelect={handleSelectReceiver}
            isLoading={isLoading}
            emptyMessage="No staff members found"
          />
        </div>
      )}

      {step === "delivery" && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Select Delivery</h1>
          <p className="text-gray-600 mb-4">
            Which delivery are you receiving?
            {receiver && (
              <span className="block text-sm text-teal-600 mt-1">Receiver: {receiver.name}</span>
            )}
          </p>
          {deliveries.length === 0 && !isLoading ? (
            <div className="p-6 text-center text-gray-500 bg-white rounded-lg">
              No pending deliveries found
            </div>
          ) : (
            <ItemSearch
              items={deliverySearchItems}
              placeholder="Search by delivery note..."
              onSelect={handleSelectDelivery}
              isLoading={isLoading}
              emptyMessage="No pending deliveries"
            />
          )}
        </div>
      )}

      {step === "items" && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Add Received Items</h1>
          {delivery && (
            <p className="text-sm text-teal-600 mb-4">
              Delivery: {delivery.deliveryNoteNumber} from {delivery.supplierName}
            </p>
          )}

          {receivedItems.length > 0 && (
            <div className="mb-4 bg-white rounded-lg p-4 shadow-sm">
              <h2 className="font-medium text-gray-900 mb-2">
                Received Items ({receivedItems.length})
              </h2>
              <ul className="space-y-2">
                {receivedItems.map((item) => (
                  <li key={item.stockItem.id} className="flex items-center justify-between text-sm">
                    <span>
                      {item.stockItem.stockNumber}: {item.quantityReceived} {item.stockItem.unit}
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
              Quantity received:
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
            emptyMessage="No stock items found"
          />
        </div>
      )}

      {step === "confirm" && (
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Confirm Receipt</h1>

          <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
            <div>
              <p className="text-sm text-gray-500">Receiver</p>
              <p className="font-medium">{receiver ? receiver.name : "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Delivery</p>
              <p className="font-medium">
                {delivery ? `${delivery.deliveryNoteNumber} - ${delivery.supplierName}` : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Items Received ({receivedItems.length})</p>
              <ul className="mt-1 space-y-1">
                {receivedItems.map((item) => (
                  <li key={item.stockItem.id} className="text-sm">
                    {item.stockItem.stockNumber}: {item.quantityReceived} {item.stockItem.unit}
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
            {submitting ? "Submitting..." : "Confirm Receipt"}
          </button>
        </div>
      )}
    </div>
  );
}
