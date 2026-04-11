import type { StockManagementLabelOverrides } from "../i18n/default-labels";
import type { StockManagementThemeOverrides } from "../theme/theme-types";
import type { StockManagementLicenseSnapshot } from "./license";

export type StockManagementHostAppKey = "stock-control" | "au-rubber" | "fieldflow" | "annix-rep";

export interface StockManagementCurrentUser {
  staffId: number | null;
  roles: string[];
  permissions: string[];
}

export interface StockManagementHostConfig {
  hostAppKey: StockManagementHostAppKey;
  apiBaseUrl: string;
  authHeaders?: () => Record<string, string>;
  theme?: StockManagementThemeOverrides;
  labels?: StockManagementLabelOverrides;
  currentUser?: StockManagementCurrentUser;
}

export interface StockManagementResolvedConfig {
  hostAppKey: StockManagementHostAppKey;
  apiBaseUrl: string;
  authHeaders: () => Record<string, string>;
  license: StockManagementLicenseSnapshot | null;
  features: Record<string, boolean>;
  theme: Required<StockManagementThemeOverrides>;
  label: (key: string, fallback?: string) => string;
  currentUser: StockManagementCurrentUser;
  isLoadingLicense: boolean;
  refetchLicense: () => Promise<void>;
}
