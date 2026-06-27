"use client";

import { createContext, type ReactNode, useContext } from "react";
import { AU_RUBBER_STATIC_MODULES, type CoreApp } from "./config/navAppMap";

interface CoreModulesContextValue {
  activeModules: string[];
  isLoaded: boolean;
}

const CoreModulesContext = createContext<CoreModulesContextValue>({
  activeModules: [],
  isLoaded: true,
});

export function useCoreModules(): CoreModulesContextValue {
  return useContext(CoreModulesContext);
}

/**
 * Module source for the unified shell.
 *
 * Neither hosted app makes a network module fetch for navigation, so the shell
 * has no silent-failure / stuck-skeleton class to guard against:
 *
 * - Stock Control drives its sidebar from the SAME role-based model the real SC
 *   portal uses (`ALL_NAV_ITEMS` + `isNavItemAllowedForRole` + `StockControlRbac`
 *   + profile QC/staff-leave flags) — it never consults the
 *   `/platform/.../modules` endpoint, so module data is irrelevant for SC.
 * - AU Rubber has no modules endpoint (backend frozen), so a STATIC rubber
 *   module set is provided directly.
 *
 * This deliberately drops the previous reliance on `OpsModuleProvider`, which
 * swallowed fetch errors (isLoaded → true, modules → empty) and could never
 * surface a recoverable failure — removing the failing fetch from the path
 * entirely is a stronger fix than retrying it.
 */
export function CorePortalModuleProvider(props: { activeApp: CoreApp; children: ReactNode }) {
  const activeModules = props.activeApp === "au-rubber" ? AU_RUBBER_STATIC_MODULES : [];
  const value: CoreModulesContextValue = { activeModules, isLoaded: true };
  return <CoreModulesContext.Provider value={value}>{props.children}</CoreModulesContext.Provider>;
}
