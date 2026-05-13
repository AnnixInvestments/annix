// @vitest-environment jsdom
/**
 * Integration smoke tests for ProjectDetailsStep. Step 1 of the RFQ
 * wizard. Takes no props (everything via zustand store).
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  renderRfqWizardComponent,
  resetRfqWizardStore,
} from "@/test-utils/renderRfqWizardComponent";
import ProjectDetailsStep from "./ProjectDetailsStep";

describe("ProjectDetailsStep (integration via renderRfqWizardComponent)", () => {
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

  it("renders the Project/RFQ Details h2 heading on the initial empty step", () => {
    const { container } = renderRfqWizardComponent(<ProjectDetailsStep />, {
      queryCache: EMPTY_CACHE,
    });
    // The H2 includes the slash so getByRole may split the text node — use container.
    expect(container.textContent).toContain("Project/RFQ Details");
  });

  it("does not crash on initial mount with an empty store + empty query cache", () => {
    expect(() =>
      renderRfqWizardComponent(<ProjectDetailsStep />, { queryCache: EMPTY_CACHE }),
    ).not.toThrow();
  });

  it("renders the same heading whether store loading flag is true or false", () => {
    const { container: loadingContainer } = renderRfqWizardComponent(<ProjectDetailsStep />, {
      queryCache: EMPTY_CACHE,
      storeOverrides: { isLoadingMasterData: true } as never,
    });
    const { container: idleContainer } = renderRfqWizardComponent(<ProjectDetailsStep />, {
      queryCache: EMPTY_CACHE,
      storeOverrides: { isLoadingMasterData: false } as never,
    });
    expect(loadingContainer.textContent).toContain("Project/RFQ Details");
    expect(idleContainer.textContent).toContain("Project/RFQ Details");
  });

  it("renders without throwing for a wizard that has the Nix flow enabled", () => {
    expect(() =>
      renderRfqWizardComponent(<ProjectDetailsStep />, {
        queryCache: EMPTY_CACHE,
        storeOverrides: {
          rfqData: {
            useNix: true,
            requiredProducts: [],
            globalSpecs: {},
            items: [],
            straightPipeEntries: [],
          },
        } as never,
      }),
    ).not.toThrow();
  });

  it("renders without throwing for a wizard that has Nix flow disabled", () => {
    expect(() =>
      renderRfqWizardComponent(<ProjectDetailsStep />, {
        queryCache: EMPTY_CACHE,
        storeOverrides: {
          rfqData: {
            useNix: false,
            requiredProducts: [],
            globalSpecs: {},
            items: [],
            straightPipeEntries: [],
          },
        } as never,
      }),
    ).not.toThrow();
  });
});
