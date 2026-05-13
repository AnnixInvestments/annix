// @vitest-environment jsdom
/**
 * Integration smoke tests for ItemUploadStep. Uses
 * renderRfqWizardComponent with stub callbacks. Smoke-level coverage —
 * the broad safety net for future Tier-3 extractions.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderRfqWizardComponent,
  resetRfqWizardStore,
} from "@/test-utils/renderRfqWizardComponent";
import ItemUploadStep from "./ItemUploadStep";

describe("ItemUploadStep (integration via renderRfqWizardComponent)", () => {
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

  const buildProps = () => ({
    onUpdateEntry: vi.fn(),
    fetchAvailableSchedules: vi.fn(async () => []),
    getFilteredPressureClasses: vi.fn(async () => []),
  });

  it("renders the Add Your First Item empty-state heading on a fresh wizard", () => {
    const { getByRole } = renderRfqWizardComponent(<ItemUploadStep {...buildProps()} />, {
      queryCache: EMPTY_CACHE,
    });
    expect(getByRole("heading", { level: 2, name: /Add Your First Item/i })).toBeInTheDocument();
  });

  it("does not crash on initial mount with an empty store + empty query cache", () => {
    expect(() =>
      renderRfqWizardComponent(<ItemUploadStep {...buildProps()} />, { queryCache: EMPTY_CACHE }),
    ).not.toThrow();
  });

  it("renders an empty-state when there are no items in the store", () => {
    const { container } = renderRfqWizardComponent(<ItemUploadStep {...buildProps()} />, {
      queryCache: EMPTY_CACHE,
    });
    // The empty-state heading is the strongest signal that the
    // component took the "no items yet" branch.
    expect(container.textContent).toContain("Add Your First Item");
  });

  it("does not call any of the supplied callback stubs on initial mount", () => {
    const props = buildProps();
    renderRfqWizardComponent(<ItemUploadStep {...props} />, { queryCache: EMPTY_CACHE });
    expect(props.onUpdateEntry).not.toHaveBeenCalled();
    expect(props.fetchAvailableSchedules).not.toHaveBeenCalled();
    expect(props.getFilteredPressureClasses).not.toHaveBeenCalled();
  });

  it("renders without throwing when isLoadingMasterData is true", () => {
    expect(() =>
      renderRfqWizardComponent(<ItemUploadStep {...buildProps()} />, {
        queryCache: EMPTY_CACHE,
        storeOverrides: { isLoadingMasterData: true } as never,
      }),
    ).not.toThrow();
  });
});
