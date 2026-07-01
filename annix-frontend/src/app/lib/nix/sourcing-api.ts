"use client";

import { sessionExpiredEvent } from "@/app/components/SessionExpiredModal";
import { anyPortalAuthHeaders } from "@/app/lib/api/portalTokenStores";
import { browserBaseUrl } from "@/lib/api-config";

export interface SourcingDraftLineItem {
  rowNumber: number;
  description: string;
  quantity: number;
  unit: string;
  category: string;
  score: number;
  warnings: string[];
  reasons: string[];
  dualRoute: boolean;
}

export interface SourcingBucket {
  supplierProfileId: number;
  name: string;
  email: string | null;
  category: string;
  items: SourcingDraftLineItem[];
  bucketRef: string;
  draftBody: string | null;
}

export interface SourcingExternalCandidate {
  preferredSupplierId: number;
  name: string;
  email: string | null;
  priority: number;
}

export interface SourcingUnmatchedItem {
  rowNumber: number;
  description: string;
  reason: string;
}

export interface SourcingPlan {
  autoBuckets: SourcingBucket[];
  manualCandidates: SourcingExternalCandidate[];
  unmatchedItems: SourcingUnmatchedItem[];
  categoriesWithoutSupplier: string[];
  generatedAt: string;
  sendingEnabled: boolean;
  aiDraftEnabled: boolean;
}

export interface SourcingSendResult {
  skipped: boolean;
  reason: string | null;
  audit: { id: number } | null;
}

export interface ReassignSourcingInput {
  sessionId: number;
  rowNumber: number;
  targetBucketRef: string;
}

export interface UpdateSourcingDraftBodyInput {
  sessionId: number;
  bucketRef: string;
  body: string;
}

export interface SendSourcingInput {
  sessionId: number;
  bucketRef: string;
  force?: boolean;
}

export interface DraftAiSourcingInput {
  sessionId: number;
  bucketRef: string;
}

function sourcingAuthHeaders(): Record<string, string> {
  return anyPortalAuthHeaders();
}

async function failSourcingResponse(response: Response, action: string): Promise<never> {
  const errorText = await response.text();
  if (response.status === 401) {
    sessionExpiredEvent.emit();
    throw new Error(`Session expired — please sign in again to ${action}.`);
  }
  throw new Error(`Failed to ${action}: ${errorText}`);
}

export const sourcingApi = {
  currentPlan: async (sessionId: number): Promise<SourcingPlan | null> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/rfq/sourcing/plan/${sessionId}`, {
      method: "GET",
      headers: { ...sourcingAuthHeaders() },
    });
    if (!response.ok) await failSourcingResponse(response, "load the sourcing plan");
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as SourcingPlan;
  },

  plan: async (sessionId: number): Promise<SourcingPlan> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/rfq/sourcing/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...sourcingAuthHeaders() },
      body: JSON.stringify({ sessionId }),
    });
    if (!response.ok) await failSourcingResponse(response, "build the sourcing plan");
    return response.json();
  },

  reassign: async (input: ReassignSourcingInput): Promise<SourcingPlan> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/rfq/sourcing/reassign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...sourcingAuthHeaders() },
      body: JSON.stringify(input),
    });
    if (!response.ok) await failSourcingResponse(response, "reassign the item");
    return response.json();
  },

  draftBody: async (input: UpdateSourcingDraftBodyInput): Promise<SourcingPlan> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/rfq/sourcing/draft-body`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...sourcingAuthHeaders() },
      body: JSON.stringify(input),
    });
    if (!response.ok) await failSourcingResponse(response, "save the draft email");
    return response.json();
  },

  draftAi: async (input: DraftAiSourcingInput): Promise<SourcingPlan> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/rfq/sourcing/draft-ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...sourcingAuthHeaders() },
      body: JSON.stringify(input),
    });
    if (!response.ok) await failSourcingResponse(response, "draft the email with AI");
    return response.json();
  },

  send: async (input: SendSourcingInput): Promise<SourcingSendResult> => {
    const baseUrl = browserBaseUrl();
    const response = await fetch(`${baseUrl}/rfq/sourcing/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...sourcingAuthHeaders() },
      body: JSON.stringify(input),
    });
    if (!response.ok) await failSourcingResponse(response, "send the sourcing email");
    return response.json();
  },
};
