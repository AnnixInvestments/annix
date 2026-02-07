"use client";

import { useCallback, useEffect, useState } from "react";
import { browserBaseUrl } from "@/lib/api-config";

export interface ExpiringDocument {
  id: number;
  documentType: string;
  fileName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  ownerType: "customer" | "supplier";
  ownerId: number;
}

export interface ExpiryCheckResult {
  expiringSoon: ExpiringDocument[];
  expired: ExpiringDocument[];
}

interface UseDocumentExpiryCheckOptions {
  userType: "customer" | "supplier";
  enabled?: boolean;
  checkIntervalMs?: number;
}

export function useDocumentExpiryCheck({
  userType,
  enabled = true,
  checkIntervalMs = 60000,
}: UseDocumentExpiryCheckOptions) {
  const [expiryResult, setExpiryResult] = useState<ExpiryCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  const checkExpiry = useCallback(async () => {
    if (!enabled) return;

    const token = localStorage.getItem("token") || localStorage.getItem("customerToken");
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = browserBaseUrl();
      const endpoint =
        userType === "customer"
          ? `${baseUrl}/customer/documents/expiry-status`
          : `${baseUrl}/supplier/documents/expiry-status`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to check document expiry");
      }

      const result: ExpiryCheckResult = await response.json();
      setExpiryResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, userType]);

  useEffect(() => {
    checkExpiry();

    if (enabled && checkIntervalMs > 0) {
      const interval = setInterval(checkExpiry, checkIntervalMs);
      return () => clearInterval(interval);
    }
  }, [checkExpiry, enabled, checkIntervalMs]);

  const dismissDocument = useCallback((documentId: number) => {
    setDismissedIds((prev) => new Set([...prev, documentId]));
  }, []);

  const dismissAll = useCallback(() => {
    if (expiryResult) {
      const allIds = [
        ...expiryResult.expiringSoon.map((d) => d.id),
        ...expiryResult.expired.map((d) => d.id),
      ];
      setDismissedIds(new Set(allIds));
    }
  }, [expiryResult]);

  const filteredResult: ExpiryCheckResult | null = expiryResult
    ? {
        expiringSoon: expiryResult.expiringSoon.filter((d) => !dismissedIds.has(d.id)),
        expired: expiryResult.expired.filter((d) => !dismissedIds.has(d.id)),
      }
    : null;

  const hasExpiringDocuments =
    filteredResult && (filteredResult.expiringSoon.length > 0 || filteredResult.expired.length > 0);

  return {
    expiryResult: filteredResult,
    isLoading,
    error,
    hasExpiringDocuments,
    checkExpiry,
    dismissDocument,
    dismissAll,
  };
}
