export interface NixSessionQueryParams {
  rfqId?: number;
}

export const nixKeys = {
  all: ["nix"] as const,
  sessions: {
    all: ["nix", "sessions"] as const,
    detail: (sessionId: number) => ["nix", "sessions", "detail", sessionId] as const,
    history: (sessionId: number) => ["nix", "sessions", "history", sessionId] as const,
  },
  extractions: {
    all: ["nix", "extractions"] as const,
    detail: (extractionId: number) => ["nix", "extractions", "detail", extractionId] as const,
    documentUrl: (extractionId: number) =>
      ["nix", "extractions", "document-url", extractionId] as const,
  },
  extractionSessions: {
    all: ["nix", "extraction-sessions"] as const,
    detail: (sessionId: number) => ["nix", "extraction-sessions", "detail", sessionId] as const,
  },
  validation: {
    all: ["nix", "validation"] as const,
    item: (item: unknown) => ["nix", "validation", "item", item] as const,
    rfq: (items: unknown[]) => ["nix", "validation", "rfq", items] as const,
  },
  capabilities: {
    all: ["nix", "capabilities"] as const,
    list: (appCode?: string) => ["nix", "capabilities", "list", appCode ?? "all"] as const,
    apps: ["nix", "capabilities", "apps"] as const,
  },
  walkthrough: {
    all: ["nix", "walkthrough"] as const,
    state: (sessionId: number) => ["nix", "walkthrough", "state", sessionId] as const,
    currentStep: (sessionId: number) => ["nix", "walkthrough", "current-step", sessionId] as const,
  },
  mineLibrary: {
    all: ["nix", "mine-library"] as const,
    mines: (q?: string) => ["nix", "mine-library", "mines", q ?? ""] as const,
    extractionsForMine: (mineId: number) =>
      ["nix", "mine-library", "mine-extractions", mineId] as const,
    docNumberSearch: (q: string, mineId: number | null) =>
      ["nix", "mine-library", "doc-number-search", q, mineId ?? "any"] as const,
    documentRevisions: (documentNumber: string, mineId: number | null) =>
      ["nix", "mine-library", "document-revisions", documentNumber, mineId ?? "any"] as const,
  },
} as const;
