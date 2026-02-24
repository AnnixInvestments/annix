"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type StockItem, stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { ItemIdentifier } from "../../../components/ItemIdentifier";
import { StockItemModal } from "../../../components/StockItemModal";

interface IdentifiedItem {
  name: string;
  category: string;
  description: string;
  confidence: number;
  suggestedSku: string;
}

interface MatchingStockItem {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  similarity: number;
}

export default function IdentifyItemPage() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prefillItem, setPrefillItem] = useState<Partial<StockItem> | null>(null);

  const handleSelectExisting = (item: MatchingStockItem) => {
    router.push(`/stock-control/portal/inventory/${item.id}`);
  };

  const handleCreateNew = (item: IdentifiedItem) => {
    setPrefillItem({
      id: 0,
      sku: item.suggestedSku,
      name: item.name,
      category: item.category,
      description: item.description,
      unitOfMeasure: "each",
      costPerUnit: 0,
      quantity: 0,
      minStockLevel: 0,
      location: null,
      photoUrl: null,
      createdAt: "",
      updatedAt: "",
    });
    setShowCreateModal(true);
  };

  const handleSave = async (data: {
    sku: string;
    name: string;
    description?: string;
    category?: string;
    unitOfMeasure?: string;
    costPerUnit?: string;
    quantity?: string;
    minStockLevel?: string;
    location?: string;
  }) => {
    try {
      const item = await stockControlApiClient.createStockItem({
        sku: data.sku,
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        unitOfMeasure: data.unitOfMeasure || "each",
        costPerUnit: parseFloat(data.costPerUnit || "0"),
        quantity: parseInt(data.quantity || "0", 10),
        minStockLevel: parseInt(data.minStockLevel || "0", 10),
        location: data.location || null,
      });
      setShowCreateModal(false);
      router.push(`/stock-control/portal/inventory/${item.id}`);
    } catch (error) {
      console.error("Failed to create item:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <Link
              href="/stock-control/portal/inventory"
              className="hover:text-teal-600 transition-colors"
            >
              Inventory
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">Identify Item</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Identify Item</h1>
        </div>
      </div>

      <ItemIdentifier onSelectExisting={handleSelectExisting} onCreateNew={handleCreateNew} />

      {showCreateModal && prefillItem && (
        <StockItemModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleSave}
          item={prefillItem as StockItem}
        />
      )}
    </div>
  );
}
