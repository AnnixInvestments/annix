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

export const StockManagementContext = createContext<StockManagementResolvedConfig | null>(null);

interface StockManagementProviderProps {
  config: StockManagementHostConfig;
  children: ReactNode;
}

export function StockManagementProvider(props: StockManagementProviderProps) {
  const config = props.config;
  const apiClientRef = useRef<StockManagementApiClient>(
    new StockManagementApiClient({ baseUrl: config.apiBaseUrl }),
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

  useEffect(() => {
    refetchLicense();
  }, [refetchLicense]);

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
      license,
      features,
      theme,
      label: labelLookup,
      currentUser: config.currentUser ?? EMPTY_USER,
      isLoadingLicense,
      refetchLicense,
    };
  }, [
    config.hostAppKey,
    config.apiBaseUrl,
    config.currentUser,
    license,
    features,
    theme,
    labelLookup,
    isLoadingLicense,
    refetchLicense,
  ]);

  return (
    <StockManagementContext.Provider value={resolved}>
      {props.children}
    </StockManagementContext.Provider>
  );
}
