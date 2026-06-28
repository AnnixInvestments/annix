import { AU_RUBBER_VERSION } from "@/app/au-rubber/config/version";
import { STOCK_CONTROL_VERSION } from "@/app/stock-control/config/version";
import type { CoreApp } from "./navAppMap";

export const CORE_APP_META: Record<
  CoreApp,
  { label: string; version: string; description: string }
> = {
  "stock-control": {
    label: "Stock Control",
    version: STOCK_CONTROL_VERSION,
    description: "Inventory, job cards, purchasing, quality, and dispatch.",
  },
  "au-rubber": {
    label: "AU Rubber",
    version: AU_RUBBER_VERSION,
    description: "Rubber-lining production, compounds, CoCs, and orders.",
  },
};
