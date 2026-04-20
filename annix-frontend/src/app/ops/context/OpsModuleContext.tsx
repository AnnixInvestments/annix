"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { browserBaseUrl, getAuthHeaders } from "@/lib/api-config";
import type { ModuleCode } from "../config/modules";

interface OpsModuleContextValue {
  activeModules: string[];
  isLoaded: boolean;
  hasModule: (code: ModuleCode) => boolean;
}

const OpsModuleContext = createContext<OpsModuleContextValue>({
  activeModules: [],
  isLoaded: false,
  hasModule: () => false,
});

export function useOpsModules() {
  return useContext(OpsModuleContext);
}

interface OpsModuleProviderProps {
  children: React.ReactNode;
  companyId: number | null;
}

export function OpsModuleProvider(props: OpsModuleProviderProps) {
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!props.companyId) {
      return;
    }

    const abortController = new AbortController();

    async function loadModules() {
      try {
        const response = await fetch(
          `${browserBaseUrl()}/platform/companies/${props.companyId}/modules`,
          {
            headers: getAuthHeaders(),
            signal: abortController.signal,
          },
        );

        if (response.ok) {
          const modules: string[] = await response.json();
          setActiveModules(modules);
        }
      } catch {
        // silently fail — modules will be empty, nav will show core items only
      } finally {
        setIsLoaded(true);
      }
    }

    loadModules();

    return () => {
      abortController.abort();
    };
  }, [props.companyId]);

  const hasModule = (code: ModuleCode): boolean => activeModules.includes(code);

  return (
    <OpsModuleContext.Provider value={{ activeModules, isLoaded, hasModule }}>
      {props.children}
    </OpsModuleContext.Provider>
  );
}
