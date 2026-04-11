"use client";

import { useContext } from "react";
import type { StockManagementResolvedConfig } from "../types/config";
import type { StockManagementFeatureKey } from "../types/license";
import { StockManagementContext } from "./StockManagementProvider";

export function useStockManagementConfig(): StockManagementResolvedConfig {
  const value = useContext(StockManagementContext);
  if (!value) {
    throw new Error("useStockManagementConfig must be called inside a <StockManagementProvider>");
  }
  return value;
}

export function useStockManagementFeature(feature: StockManagementFeatureKey): boolean {
  const config = useStockManagementConfig();
  const enabled = config.features[feature];
  return typeof enabled === "boolean" ? enabled : false;
}

export function useStockManagementHasPermission(permission: string): boolean {
  const config = useStockManagementConfig();
  return config.currentUser.permissions.includes(permission);
}
