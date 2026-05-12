// @vitest-environment jsdom
/**
 * Integration tests for FittingForm — third monolith to come under the
 * `renderRfqWizardComponent` scaffold (after BOQStep and BendForm).
 * Follows the established Phase 2 pattern: broad smoke tests that
 * protect against crash-on-mount + missing key UI elements after
 * Tier-3 sub-renderer extractions.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderRfqWizardComponent,
  resetRfqWizardStore,
} from "@/test-utils/renderRfqWizardComponent";
import FittingForm from "./FittingForm";

const buildMinimalProps = () => ({
  entry: {
    id: "test-fitting-1",
    itemType: "fitting" as const,
    description: "",
    specs: {
      quantityValue: 1,
      quantityType: "number_of_items" as const,
    },
  } as never,
  index: 0,
  entriesCount: 1,
  globalSpecs: {},
  masterData: {
    steelSpecs: [],
    flangeStandards: [],
    pressureClasses: [],
    nominalBores: [],
    flangeTypes: [],
  } as never,
  onUpdateEntry: vi.fn(),
  onRemoveEntry: vi.fn(),
  generateItemDescription: () => "",
  pressureClassesByStandard: {},
  getFilteredPressureClasses: vi.fn(),
});

describe("FittingForm (integration via renderRfqWizardComponent)", () => {
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

  it("renders the Item Description label on a fresh empty fitting entry", () => {
    const { getByLabelText } = renderRfqWizardComponent(<FittingForm {...buildMinimalProps()} />, {
      queryCache: EMPTY_CACHE,
    });
    expect(getByLabelText("Item Description *")).toBeInTheDocument();
  });

  it("does not crash on initial mount with empty query cache + bare entry", () => {
    expect(() =>
      renderRfqWizardComponent(<FittingForm {...buildMinimalProps()} />, {
        queryCache: EMPTY_CACHE,
      }),
    ).not.toThrow();
  });

  it("renders the fitting description placeholder text", () => {
    const { getByPlaceholderText } = renderRfqWizardComponent(
      <FittingForm {...buildMinimalProps()} />,
      { queryCache: EMPTY_CACHE },
    );
    expect(getByPlaceholderText(/100NB Short Equal Tee/i)).toBeInTheDocument();
  });

  it("does NOT render the Remove Item button when entriesCount is 1", () => {
    const { queryByText } = renderRfqWizardComponent(<FittingForm {...buildMinimalProps()} />, {
      queryCache: EMPTY_CACHE,
    });
    expect(queryByText("Remove Item")).not.toBeInTheDocument();
  });

  it("renders the Remove Item button when entriesCount is > 1", () => {
    const props = { ...buildMinimalProps(), entriesCount: 2 };
    const { getByText } = renderRfqWizardComponent(<FittingForm {...props} />, {
      queryCache: EMPTY_CACHE,
    });
    expect(getByText("Remove Item")).toBeInTheDocument();
  });
});
