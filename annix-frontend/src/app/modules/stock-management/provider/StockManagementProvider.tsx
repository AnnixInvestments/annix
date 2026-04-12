"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StockManagementApiClient } from "../api/stockManagementApi";
import {
  DEFAULT_STOCK_MANAGEMENT_LABELS,
  type StockManagementLabelKey,
} from "../i18n/default-labels";
import { DEFAULT_STOCK_MANAGEMENT_THEME } from "../theme/default-theme";
import type { StockManagementThemeTokens } from "../theme/theme-types";
import type {
  PrefetchedPickerData,
  StockManagementCurrentUser,
  StockManagementHostConfig,
  StockManagementResolvedConfig,
} from "../types/config";
import type { StockManagementFeatureKey, StockManagementLicenseSnapshot } from "../types/license";

const EMPTY_USER: StockManagementCurrentUser = {
  staffId: null,
  roles: [],
  permissions: [],
};

const EMPTY_HEADERS: () => Record<string, string> = () => ({});

export const StockManagementContext = createContext<StockManagementResolvedConfig | null>(null);

interface StockManagementProviderProps {
  config: StockManagementHostConfig;
  children: ReactNode;
}

export function StockManagementProvider(props: StockManagementProviderProps) {
  const config = props.config;
  const authHeaders = config.authHeaders ?? EMPTY_HEADERS;
  const apiClientRef = useRef<StockManagementApiClient>(
    new StockManagementApiClient({ baseUrl: config.apiBaseUrl, headers: authHeaders }),
  );
  const [license, setLicense] = useState<StockManagementLicenseSnapshot | null>(null);
  const [isLoadingLicense, setIsLoadingLicense] = useState(true);

  const refetchLicense = useCallback(async () => {
    setIsLoadingLicense(true);
    try {
      const next = await apiClientRef.current.licenseSelf();
      setLicense(next);
    } catch (err) {
      console.error("Failed to load stock management license", err);
      setLicense(null);
    } finally {
      setIsLoadingLicense(false);
    }
  }, []);

  const [pickerStaff, setPickerStaff] = useState<PrefetchedPickerData["staff"]>([]);
  const [pickerJobCards, setPickerJobCards] = useState<PrefetchedPickerData["jobCards"]>([]);
  const [pickerCpos, setPickerCpos] = useState<PrefetchedPickerData["cpos"]>([]);
  const [pickerLoading, setPickerLoading] = useState(true);
  const [pickerError, setPickerError] = useState<string | null>(null);

  useEffect(() => {
    refetchLicense();
  }, [refetchLicense]);

  useEffect(() => {
    let cancelled = false;
    setPickerLoading(true);
    const headers = authHeaders();
    const opts: RequestInit = { headers, credentials: "include" };

    const fetchJson = async (url: string) => {
      const res = await fetch(url, opts);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      return res.json();
    };

    Promise.all([
      fetchJson("/api/stock-control/staff?active=true"),
      fetchJson("/api/stock-control/job-cards?limit=100"),
      fetchJson("/api/stock-control/cpos?limit=100"),
    ])
      .then(([staffData, jcData, cpoData]) => {
        if (cancelled) return;
        setPickerStaff(staffData as PrefetchedPickerData["staff"]);
        setPickerJobCards(jcData as PrefetchedPickerData["jobCards"]);
        setPickerCpos(cpoData as PrefetchedPickerData["cpos"]);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        console.error("Picker prefetch failed:", message);
        setPickerError(message);
      })
      .finally(() => {
        if (!cancelled) setPickerLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  const pickerData = useMemo<PrefetchedPickerData>(() => {
    return {
      staff: pickerStaff,
      jobCards: pickerJobCards,
      cpos: pickerCpos,
      isLoading: pickerLoading,
      error: pickerError,
    };
  }, [pickerStaff, pickerJobCards, pickerCpos, pickerLoading, pickerError]);

  const theme = useMemo<Required<StockManagementThemeTokens>>(() => {
    return { ...DEFAULT_STOCK_MANAGEMENT_THEME, ...(config.theme ?? {}) };
  }, [config.theme]);

  const labels = useMemo(() => {
    const overrides = config.labels ?? {};
    return { ...DEFAULT_STOCK_MANAGEMENT_LABELS, ...overrides };
  }, [config.labels]);

  const labelLookup = useCallback(
    (key: string, fallback?: string) => {
      const value = labels[key as StockManagementLabelKey];
      if (typeof value === "string") {
        return value;
      }
      return fallback ?? key;
    },
    [labels],
  );

  const features = useMemo<Record<string, boolean>>(() => {
    if (!license) {
      return {};
    }
    return license.features as Record<StockManagementFeatureKey, boolean>;
  }, [license]);

  const resolved = useMemo<StockManagementResolvedConfig>(() => {
    return {
      hostAppKey: config.hostAppKey,
      apiBaseUrl: config.apiBaseUrl,
      authHeaders,
      license,
      features,
      theme,
      label: labelLookup,
      currentUser: config.currentUser ?? EMPTY_USER,
      isLoadingLicense,
      refetchLicense,
      pickerData,
    };
  }, [
    config.hostAppKey,
    config.apiBaseUrl,
    authHeaders,
    config.currentUser,
    license,
    features,
    theme,
    labelLookup,
    isLoadingLicense,
    refetchLicense,
    pickerData,
  ]);

  return (
    <StockManagementContext.Provider value={resolved}>
      {props.children}
    </StockManagementContext.Provider>
  );
}
