// @vitest-environment jsdom
/**
 * Integration tests for BOQStep — the first monolith of the RFQ wizard
 * to use the new `renderRfqWizardComponent` scaffold. Two roles:
 *
 *   1. Prove the scaffold actually renders a real monolith without
 *      mocking individual hooks.
 *   2. Provide a regression net so the Tier-3 sub-renderer extractions
 *      (currently deferred — see issue #267 Phase 1 acceptance list)
 *      can land safely. Each existing render branch should be exercised
 *      by at least one assertion here before the corresponding sub-
 *      renderer is moved out into its own file.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  renderRfqWizardComponent,
  resetRfqWizardStore,
} from "@/test-utils/renderRfqWizardComponent";
import BOQStep from "./BOQStep";

describe("BOQStep (integration via renderRfqWizardComponent)", () => {
  beforeEach(() => {
    resetRfqWizardStore();
  });

  const EMPTY_WEIGHTS = {
    flangeTypeWeights: [],
    bnwSetWeights: [],
    gasketWeights: [],
  };

  it("renders the BOQ heading on an empty wizard", () => {
    const { getByRole } = renderRfqWizardComponent(<BOQStep />, { queryCache: EMPTY_WEIGHTS });
    expect(
      getByRole("heading", { level: 2, name: /Bill of Quantities \(BOQ\)/i }),
    ).toBeInTheDocument();
  });

  it("does not crash when the React Query cache has no data and the store is at its initial values", () => {
    expect(() =>
      renderRfqWizardComponent(<BOQStep />, { queryCache: EMPTY_WEIGHTS }),
    ).not.toThrow();
  });

  it("renders the project subtitle from the consolidated BOQ description", () => {
    const { getByText } = renderRfqWizardComponent(<BOQStep />, { queryCache: EMPTY_WEIGHTS });
    expect(
      getByText(/Consolidated Material Requirements - Similar items pooled together/i),
    ).toBeInTheDocument();
  });

  it("renders the Untitled project marker when no project name is set in the store", () => {
    const { getByText } = renderRfqWizardComponent(<BOQStep />, { queryCache: EMPTY_WEIGHTS });
    expect(getByText(/Untitled/)).toBeInTheDocument();
  });

  it("reflects the project name from the store when seeded", () => {
    const { getByText } = renderRfqWizardComponent(<BOQStep />, {
      queryCache: EMPTY_WEIGHTS,
      storeOverrides: {
        rfqData: {
          ...useRfqWizardStoreInitialRfqData(),
          projectName: "Integration Test Project",
        },
      },
    });
    expect(getByText("Integration Test Project")).toBeInTheDocument();
  });

  it("renders the Print BOQ action button (registered-customer affordance is always present in the DOM)", () => {
    const { getByRole } = renderRfqWizardComponent(<BOQStep />, { queryCache: EMPTY_WEIGHTS });
    expect(getByRole("button", { name: /Print BOQ/i })).toBeInTheDocument();
  });

  it("renders the customer label on the project info summary", () => {
    const { getByText } = renderRfqWizardComponent(<BOQStep />, { queryCache: EMPTY_WEIGHTS });
    expect(getByText(/^Customer$/)).toBeInTheDocument();
  });
});

// Local helper — the store's initialRfqData factory is module-private,
// so reconstruct the minimum shape the test needs (just project metadata).
const useRfqWizardStoreInitialRfqData = () => ({
  projectName: "",
  projectType: undefined,
  description: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  additionalContacts: "",
  boqExtractionAccepted: false,
  requiredDate: "2026-06-15",
  requiredProducts: [],
  notes: "",
  globalSpecs: {},
  items: [],
  straightPipeEntries: [],
  useNix: false,
  nixPopupShown: false,
});
