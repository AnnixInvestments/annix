"use client";

import { useState } from "react";
import { usePumpFavorites } from "@/app/hooks/usePumpFavorites";
import { PumpProductCard, PumpProductCardData } from "./PumpProductCard";

interface PumpFavoritesProps {
  allProducts: PumpProductCardData[];
  onProductSelect?: (product: PumpProductCardData) => void;
  onRequestQuote?: (products: PumpProductCardData[]) => void;
  onCompare?: (products: PumpProductCardData[]) => void;
}

type TabType = "favorites" | "recent";

export function PumpFavorites({
  allProducts,
  onProductSelect,
  onRequestQuote,
  onCompare,
}: PumpFavoritesProps) {
  const {
    favorites,
    recentlyViewed,
    toggleFavorite,
    clearFavorites,
    clearRecentlyViewed,
    isFavorite,
  } = usePumpFavorites();

  const [activeTab, setActiveTab] = useState<TabType>("favorites");
  const [selectedForAction, setSelectedForAction] = useState<number[]>([]);

  const favoriteProducts = allProducts.filter((p) => favorites.includes(p.id));
  const displayProducts = activeTab === "favorites" ? favoriteProducts : recentlyViewed;

  const handleToggleSelection = (productId: number) => {
    setSelectedForAction((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  };

  const handleSelectAll = () => {
    const currentIds = displayProducts.map((p) => p.id);
    setSelectedForAction(currentIds);
  };

  const handleClearSelection = () => {
    setSelectedForAction([]);
  };

  const selectedProducts = displayProducts.filter((p) => selectedForAction.includes(p.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setActiveTab("favorites");
              setSelectedForAction([]);
            }}
            className={`pb-3 px-1 relative ${
              activeTab === "favorites"
                ? "text-blue-600 font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg
                className={`w-5 h-5 ${activeTab === "favorites" ? "text-red-500 fill-red-500" : ""}`}
                fill={activeTab === "favorites" ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              Favorites
              {favorites.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {favorites.length}
                </span>
              )}
            </span>
            {activeTab === "favorites" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("recent");
              setSelectedForAction([]);
            }}
            className={`pb-3 px-1 relative ${
              activeTab === "recent"
                ? "text-blue-600 font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Recently Viewed
              {recentlyViewed.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-gray-600 bg-gray-200 rounded-full">
                  {recentlyViewed.length}
                </span>
              )}
            </span>
            {activeTab === "recent" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
            )}
          </button>
        </div>

        {displayProducts.length > 0 && (
          <div className="flex items-center gap-2 pb-3">
            {selectedForAction.length > 0 ? (
              <>
                <span className="text-sm text-gray-600">{selectedForAction.length} selected</span>
                <button
                  onClick={handleClearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
                {onCompare && selectedForAction.length >= 2 && (
                  <button
                    onClick={() => onCompare(selectedProducts)}
                    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Compare
                  </button>
                )}
                {onRequestQuote && (
                  <button
                    onClick={() => onRequestQuote(selectedProducts)}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Quote
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Select All
                </button>
                <button
                  onClick={activeTab === "favorites" ? clearFavorites : clearRecentlyViewed}
                  className="text-sm text-gray-500 hover:text-red-600"
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {displayProducts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          {activeTab === "favorites" ? (
            <>
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
              <p className="text-gray-600">
                Click the heart icon on products to add them to your favorites.
              </p>
            </>
          ) : (
            <>
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No recently viewed products
              </h3>
              <p className="text-gray-600">Products you view will appear here for quick access.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayProducts.map((product) => (
            <div key={product.id} className="relative">
              <button
                onClick={() => handleToggleSelection(product.id)}
                className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedForAction.includes(product.id)
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300 hover:border-blue-400"
                }`}
              >
                {selectedForAction.includes(product.id) && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>

              {activeTab === "favorites" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(product.id);
                  }}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white shadow-sm hover:bg-gray-100"
                  title="Remove from favorites"
                >
                  <svg
                    className="w-5 h-5 text-red-500 fill-red-500"
                    fill="currentColor"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              )}

              {activeTab === "recent" && !isFavorite(product.id) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(product.id);
                  }}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white shadow-sm hover:bg-gray-100"
                  title="Add to favorites"
                >
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              )}

              <PumpProductCard
                product={product}
                onSelect={onProductSelect ? () => onProductSelect(product) : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PumpFavorites;
