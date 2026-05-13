// @vitest-environment jsdom
/**
 * Integration smoke tests for SpecificationsStep — the 403-KB monster
 * (largest monolith in the RFQ wizard). Uses renderRfqWizardComponent
 * with a fetchAndSelectPressureClass stub. SpecificationsStep is a
 * heavy zustand consumer; the scaffold's storeOverrides + queryCache
 * carry most of the test setup.
 *
 * The smoke tests protect against full-component breakage during the
 * Tier-3 sub-renderer extractions that lie ahead (issue #267 Phase 3).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderRfqWizardComponent,
  resetRfqWizardStore,
} from "@/test-utils/renderRfqWizardComponent";
import SpecificationsStep from "./SpecificationsStep";

describe("SpecificationsStep (integration via renderRfqWizardComponent)", () => {
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

  const stubFetchAndSelect = vi.fn(async () => null);

  it("renders the Specifications heading on the initial empty step", () => {
    const { getByRole } = renderRfqWizardComponent(
      <SpecificationsStep fetchAndSelectPressureClass={stubFetchAndSelect} />,
      { queryCache: EMPTY_CACHE },
    );
    expect(getByRole("heading", { level: 2, name: "Specifications" })).toBeInTheDocument();
  });

  it("does not crash on initial mount with an empty store + empty query cache", () => {
    expect(() =>
      renderRfqWizardComponent(
        <SpecificationsStep fetchAndSelectPressureClass={stubFetchAndSelect} />,
        { queryCache: EMPTY_CACHE },
      ),
    ).not.toThrow();
  });

  it("renders the working-conditions descriptive subtitle", () => {
    const { getByText } = renderRfqWizardComponent(
      <SpecificationsStep fetchAndSelectPressureClass={stubFetchAndSelect} />,
      { queryCache: EMPTY_CACHE },
    );
    expect(getByText(/Define working conditions and material specifications/i)).toBeInTheDocument();
  });

  it("does not throw when the store reports loading master data", () => {
    expect(() =>
      renderRfqWizardComponent(
        <SpecificationsStep fetchAndSelectPressureClass={stubFetchAndSelect} />,
        {
          queryCache: EMPTY_CACHE,
          storeOverrides: { isLoadingMasterData: true } as never,
        },
      ),
    ).not.toThrow();
  });

  it("renders the same heading whether store loading flag is true or false", () => {
    const { getByRole } = renderRfqWizardComponent(
      <SpecificationsStep fetchAndSelectPressureClass={stubFetchAndSelect} />,
      {
        queryCache: EMPTY_CACHE,
        storeOverrides: { isLoadingMasterData: false } as never,
      },
    );
    expect(getByRole("heading", { level: 2, name: "Specifications" })).toBeInTheDocument();
  });
});
