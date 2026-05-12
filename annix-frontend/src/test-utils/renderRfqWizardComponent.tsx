/**
 * Integration-test scaffold for the RFQ wizard's monolith components
 * (BOQStep, SpecificationsStep, ProjectDetailsStep, ItemUploadStep,
 * BendForm, FittingForm, StraightPipeRfqOrchestrator).
 *
 * Why this exists: the monoliths consume the zustand `useRfqWizardStore`
 * and several React Query hooks. Rendering them directly with vitest's
 * default render throws because no `QueryClientProvider` is in scope.
 * Mocking each hook per-test was rejected as a maintenance trap. Instead
 * we provide a thin wrapper that:
 *
 *   1. Seeds the (real) zustand store with test-controlled state.
 *   2. Spins up a fresh `QueryClient` per render and pre-fills the cache
 *      with whatever data the component needs (no network round-trips).
 *   3. Skips auth providers — `useOptionalAdminAuth` / `useOptionalCustomerAuth`
 *      return a safe default (not authenticated, not loading) when there
 *      is no provider in scope, which is exactly what we want for tests.
 *
 * Why no `vi.mock` calls in the scaffold itself: the goal is to render
 * the component against REAL store + REAL hook code paths so the tests
 * catch real bugs (closure-capture issues, prop-drilling bugs,
 * SWC landmines, circular-import init-order bugs). Mocking the entire
 * hook layer would let those bugs through.
 *
 * Usage:
 *
 *     import { renderRfqWizardComponent, resetRfqWizardStore } from "@/test-utils/renderRfqWizardComponent";
 *     import BOQStep from "@/app/components/rfq/steps/BOQStep";
 *
 *     beforeEach(() => { resetRfqWizardStore(); });
 *
 *     it("renders an empty BOQ when the wizard has no items", () => {
 *       const { container } = renderRfqWizardComponent(<BOQStep />, {
 *         queryCache: {
 *           flangeTypeWeights: [],
 *           bnwSetWeights: [],
 *           gasketWeights: [],
 *         },
 *       });
 *       expect(container.textContent).toContain("Bill of Quantities");
 *     });
 *
 * Seed surfaces are added incrementally — when a new test needs a new
 * mock, extend the `RenderRfqWizardOptions` interface and add the
 * matching `setQueryData(...)` call below. Keep the keys list short
 * and obvious.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, type RenderResult, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import {
  type BnwSetWeightRecord,
  type FlangeType,
  type FlangeTypeWeightRecord,
  type GasketWeightRecord,
} from "@/app/lib/api/client";
import { flangeWeightKeys } from "@/app/lib/query/keys";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";

type RfqWizardState = ReturnType<typeof useRfqWizardStore.getState>;

const INITIAL_RFQ_WIZARD_STATE: RfqWizardState = useRfqWizardStore.getState();

export interface RenderRfqWizardQueryCache {
  flangeTypeWeights?: FlangeTypeWeightRecord[];
  bnwSetWeights?: BnwSetWeightRecord[];
  gasketWeights?: GasketWeightRecord[];
  flangeTypes?: FlangeType[];
  nbToOdMap?: Record<number, number>;
}

export interface RenderRfqWizardOptions {
  storeOverrides?: Partial<RfqWizardState>;
  queryCache?: RenderRfqWizardQueryCache;
  renderOptions?: Omit<RenderOptions, "wrapper">;
}

const buildTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Number.POSITIVE_INFINITY,
        staleTime: Number.POSITIVE_INFINITY,
      },
      mutations: { retry: false },
    },
  });

const seedQueryCache = (client: QueryClient, cache: RenderRfqWizardQueryCache | undefined) => {
  if (!cache) return;
  if (cache.flangeTypeWeights)
    client.setQueryData(flangeWeightKeys.allWeights(), cache.flangeTypeWeights);
  if (cache.bnwSetWeights) client.setQueryData(flangeWeightKeys.allBnwSets(), cache.bnwSetWeights);
  if (cache.gasketWeights)
    client.setQueryData(flangeWeightKeys.allGasketWeights(), cache.gasketWeights);
  if (cache.flangeTypes) client.setQueryData(flangeWeightKeys.allFlangeTypes(), cache.flangeTypes);
  if (cache.nbToOdMap) client.setQueryData(flangeWeightKeys.nbToOdMap(), cache.nbToOdMap);
};

export const renderRfqWizardComponent = (
  ui: ReactElement,
  options: RenderRfqWizardOptions = {},
): RenderResult & { queryClient: QueryClient } => {
  if (options.storeOverrides) {
    useRfqWizardStore.setState(options.storeOverrides);
  }
  const queryClient = buildTestQueryClient();
  seedQueryCache(queryClient, options.queryCache);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const result = render(ui, { ...options.renderOptions, wrapper: Wrapper });
  return { ...result, queryClient };
};

export const resetRfqWizardStore = () => {
  useRfqWizardStore.setState(INITIAL_RFQ_WIZARD_STATE, true);
};
