"use client";

import type React from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { deriveNavRbacConfig } from "../config/deriveNavRbac";
import { ALL_NAV_ITEMS } from "../config/navItems";
import { isDerivedNavMode } from "../config/rbacMode";

type RbacConfig = Record<string, string[]>;

interface StockControlRbacContextValue {
  rbacConfig: RbacConfig;
  isLoaded: boolean;
  reloadRbacConfig: () => Promise<void>;
}

const defaultConfig = (): RbacConfig =>
  ALL_NAV_ITEMS.reduce<RbacConfig>((acc, item) => {
    acc[item.key] = [...item.defaultRoles];
    return acc;
  }, {});

const StockControlRbacContext = createContext<StockControlRbacContextValue>({
  rbacConfig: defaultConfig(),
  isLoaded: false,
  reloadRbacConfig: async () => {},
});

async function loadDerivedConfig(): Promise<RbacConfig> {
  const [actions, roles] = await Promise.all([
    stockControlApiClient.actionPermissions(),
    stockControlApiClient.companyRoles(),
  ]);
  const rawActionConfig = actions.config;
  const actionConfig = rawActionConfig || {};
  const roleKeys = roles.map((r) => r.key);
  return deriveNavRbacConfig(ALL_NAV_ITEMS, actionConfig, roleKeys);
}

export function StockControlRbacProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const [rbacConfig, setRbacConfig] = useState<RbacConfig>(defaultConfig);
  const [isLoaded, setIsLoaded] = useState(false);

  const reloadRbacConfig = useCallback(async () => {
    try {
      if (isDerivedNavMode()) {
        const derived = await loadDerivedConfig();
        setRbacConfig(derived);
      } else {
        const config = await stockControlApiClient.navRbacConfig();
        setRbacConfig(config);
      }
    } catch {
      setRbacConfig(defaultConfig());
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    reloadRbacConfig();
  }, [reloadRbacConfig]);

  return (
    <StockControlRbacContext.Provider value={{ rbacConfig, isLoaded, reloadRbacConfig }}>
      {children}
    </StockControlRbacContext.Provider>
  );
}

export function useStockControlRbac() {
  return useContext(StockControlRbacContext);
}
