"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { type GlossaryTerm, stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface GlossaryContextType {
  terms: GlossaryTerm[];
  termsByAbbreviation: Map<string, GlossaryTerm>;
  hideTooltips: boolean;
  toggleTooltips: () => void;
  isLoaded: boolean;
  reloadTerms: () => void;
}

const GlossaryContext = createContext<GlossaryContextType | null>(null);

export function GlossaryProvider(props: { children: ReactNode }) {
  const { children } = props;
  const { profile, isAuthenticated } = useStockControlAuth();
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [hideTooltips, setHideTooltips] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadTerms = useCallback(() => {
    if (!isAuthenticated) {
      return;
    }
    stockControlApiClient
      .glossaryTerms()
      .then((data) => {
        setTerms(data);
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });
  }, [isAuthenticated]);

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  useEffect(() => {
    if (profile) {
      const hideTooltips = profile.hideTooltips;
      setHideTooltips(hideTooltips || false);
    }
  }, [profile]);

  const termsByAbbreviation = useMemo(
    () => new Map(terms.map((t) => [t.abbreviation.toUpperCase(), t])),
    [terms],
  );

  const toggleTooltips = useCallback(() => {
    const newValue = !hideTooltips;
    setHideTooltips(newValue);
    stockControlApiClient.updateTooltipPreference(newValue).catch(() => {
      setHideTooltips(!newValue);
    });
  }, [hideTooltips]);

  const value = useMemo(
    () => ({
      terms,
      termsByAbbreviation,
      hideTooltips,
      toggleTooltips,
      isLoaded,
      reloadTerms: loadTerms,
    }),
    [terms, termsByAbbreviation, hideTooltips, toggleTooltips, isLoaded, loadTerms],
  );

  return <GlossaryContext.Provider value={value}>{children}</GlossaryContext.Provider>;
}

export function useGlossary() {
  const context = useContext(GlossaryContext);
  if (!context) {
    throw new Error("useGlossary must be used within a GlossaryProvider");
  }
  return context;
}
