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

  it("renders the BOQ heading on an empty wizard", () => {
    const { getByRole } = renderRfqWizardComponent(<BOQStep />, {
      queryCache: {
        flangeTypeWeights: [],
        bnwSetWeights: [],
        gasketWeights: [],
      },
    });
    expect(
      getByRole("heading", { level: 2, name: /Bill of Quantities \(BOQ\)/i }),
    ).toBeInTheDocument();
  });

  it("does not crash when the React Query cache has no data and the store is at its initial values", () => {
    expect(() =>
      renderRfqWizardComponent(<BOQStep />, {
        queryCache: { flangeTypeWeights: [], bnwSetWeights: [], gasketWeights: [] },
      }),
    ).not.toThrow();
  });
});
