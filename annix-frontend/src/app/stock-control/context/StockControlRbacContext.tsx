"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { ALL_NAV_ITEMS } from "../config/navItems";

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

export function StockControlRbacProvider({ children }: { children: React.ReactNode }) {
  const [rbacConfig, setRbacConfig] = useState<RbacConfig>(defaultConfig);
  const [isLoaded, setIsLoaded] = useState(false);

  const reloadRbacConfig = useCallback(async () => {
    try {
      const config = await stockControlApiClient.navRbacConfig();
      setRbacConfig(config);
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
