// @vitest-environment jsdom
/**
 * Integration tests for BendForm — second monolith to come under the
 * `renderRfqWizardComponent` scaffold. BendForm is unusual among the
 * monoliths because it takes its data via props rather than reading
 * from the zustand store; the scaffold's `storeOverrides` aren't
 * needed for this file, only the `queryCache` seeds for
 * `useAllFlangeTypes`, `useAllFlangeTypeWeights`, `useNbToOdMap`.
 *
 * These are broad smoke tests, mirroring the pattern established for
 * BOQStep in commit `f7c8530eb`. They protect against crash-on-mount
 * + missing key UI elements after Tier-3 sub-renderer extractions.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  renderRfqWizardComponent,
  resetRfqWizardStore,
} from "@/test-utils/renderRfqWizardComponent";
import BendForm from "./BendForm";

const buildMinimalProps = () => ({
  entry: {
    id: "test-bend-1",
    itemType: "bend" as const,
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

describe("BendForm (integration via renderRfqWizardComponent)", () => {
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

  it("renders the Item Description label on a fresh empty bend entry", () => {
    const { getByLabelText } = renderRfqWizardComponent(<BendForm {...buildMinimalProps()} />, {
      queryCache: EMPTY_CACHE,
    });
    expect(getByLabelText("Item Description *")).toBeInTheDocument();
  });

  it("does not crash on initial mount with empty query cache + bare entry", () => {
    expect(() =>
      renderRfqWizardComponent(<BendForm {...buildMinimalProps()} />, {
        queryCache: EMPTY_CACHE,
      }),
    ).not.toThrow();
  });

  it("renders the description placeholder text", () => {
    const { getByPlaceholderText } = renderRfqWizardComponent(
      <BendForm {...buildMinimalProps()} />,
      { queryCache: EMPTY_CACHE },
    );
    expect(getByPlaceholderText(/40NB 90° 1.5D Bend/i)).toBeInTheDocument();
  });

  it("renders the description as a required textarea", () => {
    const { getByLabelText } = renderRfqWizardComponent(<BendForm {...buildMinimalProps()} />, {
      queryCache: EMPTY_CACHE,
    });
    const textarea = getByLabelText("Item Description *") as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea.required).toBe(true);
  });

  it("does NOT render the Remove Item button when entriesCount is 1", () => {
    const { queryByText } = renderRfqWizardComponent(<BendForm {...buildMinimalProps()} />, {
      queryCache: EMPTY_CACHE,
    });
    expect(queryByText("Remove Item")).not.toBeInTheDocument();
  });

  it("renders the Remove Item button when entriesCount is > 1", () => {
    const props = { ...buildMinimalProps(), entriesCount: 2 };
    const { getByText } = renderRfqWizardComponent(<BendForm {...props} />, {
      queryCache: EMPTY_CACHE,
    });
    expect(getByText("Remove Item")).toBeInTheDocument();
  });
});
