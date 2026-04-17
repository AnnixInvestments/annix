"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StockItem } from "@/app/lib/api/stockControlApi";
import { useCreateStockItem } from "@/app/lib/query/hooks";
import { ItemIdentifier } from "@/app/stock-control/components/ItemIdentifier";
import { StockItemModal } from "@/app/stock-control/components/StockItemModal";

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
  const { mutateAsync: createStockItem } = useCreateStockItem();
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
      const description = data.description;
      const category = data.category;
      const unitOfMeasure = data.unitOfMeasure;
      const costPerUnit = data.costPerUnit;
      const quantity = data.quantity;
      const minStockLevel = data.minStockLevel;
      const location = data.location;
      const item = await createStockItem({
        sku: data.sku,
        name: data.name,
        description: description || null,
        category: category || null,
        unitOfMeasure: unitOfMeasure || "each",
        costPerUnit: parseFloat(costPerUnit || "0"),
        quantity: parseInt(quantity || "0", 10),
        minStockLevel: parseInt(minStockLevel || "0", 10),
        location: location || null,
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
