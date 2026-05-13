// @vitest-environment jsdom
/**
 * Integration tests for StraightPipeRfqOrchestrator — final monolith
 * to come under the `renderRfqWizardComponent` scaffold (after BOQStep,
 * BendForm, and FittingForm). The orchestrator is a heavy zustand
 * consumer (it owns the wizard's currentStep and renders the
 * appropriate Step component), so the scaffold's `storeOverrides`
 * carries most of the test setup.
 *
 * Same shape as the other integration specs: broad smoke tests that
 * protect against crash-on-mount + missing key UI elements after
 * Tier-3 sub-renderer extractions.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// next/navigation requires the App Router runtime which vitest doesn't
// provide. Stub the two hooks the orchestrator uses with safe defaults.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import {
  renderRfqWizardComponent,
  resetRfqWizardStore,
} from "@/test-utils/renderRfqWizardComponent";
import StraightPipeRfqOrchestrator from "./StraightPipeRfqOrchestrator";

const buildMinimalProps = () => ({
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
});

describe("StraightPipeRfqOrchestrator (integration via renderRfqWizardComponent)", () => {
  beforeEach(() => {
    resetRfqWizardStore();
  });

  const EMPTY_CACHE = {
    flangeTypeWeights: [],
    bnwSetWeights: [],
    gasketWeights: [],
    flangeTypes: [],
    nbToOdMap: {},
  };

  it("renders the Create RFQ heading on the initial wizard view", () => {
    const { getByRole } = renderRfqWizardComponent(
      <StraightPipeRfqOrchestrator {...buildMinimalProps()} />,
      { queryCache: EMPTY_CACHE },
    );
    expect(getByRole("heading", { level: 1, name: /Create RFQ/i })).toBeInTheDocument();
  });

  it("does not crash on initial mount with an empty store + empty query cache", () => {
    expect(() =>
      renderRfqWizardComponent(<StraightPipeRfqOrchestrator {...buildMinimalProps()} />, {
        queryCache: EMPTY_CACHE,
      }),
    ).not.toThrow();
  });

  it("renders the BOQ stepper pill for non-Nix flow", () => {
    const { getAllByText } = renderRfqWizardComponent(
      <StraightPipeRfqOrchestrator {...buildMinimalProps()} />,
      { queryCache: EMPTY_CACHE },
    );
    // BOQ appears as the last stepper pill in the standard flow
    expect(getAllByText(/BOQ/i).length).toBeGreaterThan(0);
  });

  it("renders the Specifications stepper title for non-Nix flow", () => {
    const { getByText } = renderRfqWizardComponent(
      <StraightPipeRfqOrchestrator {...buildMinimalProps()} />,
      { queryCache: EMPTY_CACHE },
    );
    expect(getByText(/Specifications/i)).toBeInTheDocument();
  });
});
