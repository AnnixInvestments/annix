"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PumpProductCardData } from "@/app/components/pumps/PumpProductCard";

const FAVORITES_STORAGE_KEY = "pump_favorites";
const RECENTLY_VIEWED_STORAGE_KEY = "pump_recently_viewed";
const MAX_RECENTLY_VIEWED = 10;

interface FavoriteEntry {
  productId: number;
  addedAt: string;
}

interface RecentlyViewedEntry {
  product: PumpProductCardData;
  viewedAt: string;
}

interface UsePumpFavoritesReturn {
  favorites: number[];
  recentlyViewed: PumpProductCardData[];
  isFavorite: (productId: number) => boolean;
  addFavorite: (productId: number) => void;
  removeFavorite: (productId: number) => void;
  toggleFavorite: (productId: number) => void;
  clearFavorites: () => void;
  addToRecentlyViewed: (product: PumpProductCardData) => void;
  clearRecentlyViewed: () => void;
  favoritesCount: number;
}

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") {
    return defaultValue;
  }
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn(`Failed to save ${key} to localStorage`);
  }
}

export function usePumpFavorites(): UsePumpFavoritesReturn {
  const [favoriteEntries, setFavoriteEntries] = useState<FavoriteEntry[]>([]);
  const [recentlyViewedEntries, setRecentlyViewedEntries] = useState<RecentlyViewedEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setFavoriteEntries(loadFromStorage<FavoriteEntry[]>(FAVORITES_STORAGE_KEY, []));
    setRecentlyViewedEntries(
      loadFromStorage<RecentlyViewedEntry[]>(RECENTLY_VIEWED_STORAGE_KEY, []),
    );
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      saveToStorage(FAVORITES_STORAGE_KEY, favoriteEntries);
    }
  }, [favoriteEntries, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveToStorage(RECENTLY_VIEWED_STORAGE_KEY, recentlyViewedEntries);
    }
  }, [recentlyViewedEntries, isInitialized]);

  const favorites = useMemo(
    () => favoriteEntries.map((entry) => entry.productId),
    [favoriteEntries],
  );

  const recentlyViewed = useMemo(
    () => recentlyViewedEntries.map((entry) => entry.product),
    [recentlyViewedEntries],
  );

  const isFavorite = useCallback((productId: number) => favorites.includes(productId), [favorites]);

  const addFavorite = useCallback((productId: number) => {
    setFavoriteEntries((prev) => {
      if (prev.some((entry) => entry.productId === productId)) {
        return prev;
      }
      return [...prev, { productId, addedAt: new Date().toISOString() }];
    });
  }, []);

  const removeFavorite = useCallback((productId: number) => {
    setFavoriteEntries((prev) => prev.filter((entry) => entry.productId !== productId));
  }, []);

  const toggleFavorite = useCallback(
    (productId: number) => {
      if (isFavorite(productId)) {
        removeFavorite(productId);
      } else {
        addFavorite(productId);
      }
    },
    [isFavorite, addFavorite, removeFavorite],
  );

  const clearFavorites = useCallback(() => {
    setFavoriteEntries([]);
  }, []);

  const addToRecentlyViewed = useCallback((product: PumpProductCardData) => {
    setRecentlyViewedEntries((prev) => {
      const filtered = prev.filter((entry) => entry.product.id !== product.id);
      const newEntry: RecentlyViewedEntry = {
        product,
        viewedAt: new Date().toISOString(),
      };
      return [newEntry, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewedEntries([]);
  }, []);

  return {
    favorites,
    recentlyViewed,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    clearFavorites,
    addToRecentlyViewed,
    clearRecentlyViewed,
    favoritesCount: favorites.length,
  };
}

export default usePumpFavorites;
