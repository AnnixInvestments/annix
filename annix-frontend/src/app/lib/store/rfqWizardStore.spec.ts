import { beforeEach, describe, expect, it } from "vitest";
import type { PipeItem } from "@/app/lib/hooks/useRfqForm";
import type { NixExtractedItem } from "@/app/lib/nix";
import { useRfqWizardStore } from "@/app/lib/store/rfqWizardStore";

const sourceRowOf = (it: PipeItem): number | undefined =>
  "sourceLocation" in it ? it.sourceLocation?.rowNumber : undefined;

const nixPipe = (overrides: Partial<NixExtractedItem>): NixExtractedItem =>
  ({
    rowNumber: 10,
    itemNumber: "1.1",
    description: "DN 450 rubber lined mild steel pipe",
    itemType: "pipe",
    actionType: "supply",
    material: "mild steel",
    materialGrade: null,
    diameter: 450,
    diameterUnit: "mm",
    secondaryDiameter: null,
    length: 6,
    wallThickness: 8,
    schedule: null,
    angle: null,
    flangeConfig: "both_ends",
    pressureClass: null,
    sdr: null,
    productType: "steel",
    quantity: 12,
    unit: "m",
    confidence: 0.95,
    needsClarification: false,
    clarificationReason: null,
    sheetName: "BOQ",
    ...overrides,
  }) as NixExtractedItem;

const sameExtractionTwice: NixExtractedItem[] = [
  nixPipe({ rowNumber: 10, itemNumber: "1.1" }),
  nixPipe({
    rowNumber: 11,
    itemNumber: "1.2",
    description: "DN 100 flexible spigot pipe",
    diameter: 100,
  }),
  nixPipe({
    rowNumber: 12,
    itemNumber: "1.3",
    description: "DN 200 steel pipe",
    diameter: 200,
  }),
];

describe("rfqWizardStore Nix accept dedup (issue #293)", () => {
  beforeEach(() => {
    useRfqWizardStore.getState().resetForm();
  });

  it("two consecutive accepts of the same item set do not duplicate entries", () => {
    const { applyNixItemsToRfq } = useRfqWizardStore.getState();
    applyNixItemsToRfq(sameExtractionTwice);
    const afterFirst = useRfqWizardStore.getState().rfqData.items.length;
    expect(afterFirst).toBe(3);

    applyNixItemsToRfq(sameExtractionTwice);
    const items = useRfqWizardStore.getState().rfqData.items;
    expect(items).toHaveLength(3);
  });

  it("eleven consecutive accepts still end at the source row count", () => {
    const { applyNixItemsToRfq } = useRfqWizardStore.getState();
    Array.from({ length: 11 }).forEach(() => applyNixItemsToRfq(sameExtractionTwice));
    expect(useRfqWizardStore.getState().rfqData.items).toHaveLength(3);
  });

  it("re-extraction refreshes un-edited rows with the latest extracted data", () => {
    const { applyNixItemsToRfq } = useRfqWizardStore.getState();
    applyNixItemsToRfq(sameExtractionTwice);

    applyNixItemsToRfq([
      nixPipe({ rowNumber: 10, itemNumber: "1.1", description: "DN 450 pipe (corrected)" }),
    ]);

    const items = useRfqWizardStore.getState().rfqData.items;
    expect(items).toHaveLength(3);
    const refreshed = items.find((it) => sourceRowOf(it) === 10);
    expect(refreshed?.description).toBe("DN 450 pipe (corrected)");
  });

  it("preserves a user-edited row across a re-extraction of the same source row", () => {
    const { applyNixItemsToRfq } = useRfqWizardStore.getState();
    applyNixItemsToRfq(sameExtractionTwice);

    const edited = useRfqWizardStore.getState().rfqData.items.find((it) => sourceRowOf(it) === 11);
    expect(edited).toBeDefined();
    const editedId = edited?.id;
    useRfqWizardStore.getState().updateStraightPipeEntry(editedId || "", {
      description: "DN 100 hand-corrected by user",
      userEdited: true,
    });

    applyNixItemsToRfq(sameExtractionTwice);

    const items = useRfqWizardStore.getState().rfqData.items;
    expect(items).toHaveLength(3);
    const survivor = items.find((it) => sourceRowOf(it) === 11);
    expect(survivor?.description).toBe("DN 100 hand-corrected by user");
    expect(survivor?.userEdited).toBe(true);
  });

  it("keeps manual entries without source info out of the dedup entirely", () => {
    const { applyNixItemsToRfq, addStraightPipeEntry } = useRfqWizardStore.getState();
    applyNixItemsToRfq(sameExtractionTwice);
    addStraightPipeEntry("Manually added DN 300 pipe");
    expect(useRfqWizardStore.getState().rfqData.items).toHaveLength(4);

    applyNixItemsToRfq(sameExtractionTwice);
    expect(useRfqWizardStore.getState().rfqData.items).toHaveLength(4);
  });
});
