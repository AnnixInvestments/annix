import { LearningSource, LearningType } from "../entities/nix-learning.entity";
import {
  feedbackLearningRow,
  feedbackPatternKey,
  NIX_STEP3_FEEDBACK_CATEGORY,
  type NixFeedbackCorrection,
  type NixFeedbackPayload,
} from "./learning-feedback.util";

const correction = (overrides: Partial<NixFeedbackCorrection>): NixFeedbackCorrection => ({
  originalRowNumber: 53,
  sheetName: "BOQ",
  correctionType: "field_correction",
  originalItem: { description: "DN 100 flexible spigot pipes", diameter: 450 },
  correctedItem: { description: "DN 100 flexible spigot pipes", diameter: 100 },
  changedFields: ["diameter"],
  ...overrides,
});

const payload = (overrides: Partial<NixFeedbackPayload>): NixFeedbackPayload => ({
  extractionId: 42,
  userId: 7,
  customerId: null,
  corrections: [],
  ...overrides,
});

describe("learning-feedback.util (issue #263)", () => {
  describe("feedbackPatternKey", () => {
    it("keys on extraction, sheet, row and correction type", () => {
      expect(feedbackPatternKey(42, correction({}))).toBe(
        "extraction:42:row:BOQ#53:field_correction",
      );
    });

    it("tolerates missing extraction id, sheet and row", () => {
      expect(
        feedbackPatternKey(
          null,
          correction({ sheetName: null, originalRowNumber: null, correctionType: "item_added" }),
        ),
      ).toBe("extraction:na:row:#na:item_added");
    });
  });

  describe("feedbackLearningRow", () => {
    it("builds an explicit human correction at confidence 1.0", () => {
      const row = feedbackLearningRow(payload({}), correction({}));
      expect(row.learningType).toBe(LearningType.CORRECTION);
      expect(row.source).toBe(LearningSource.USER_CORRECTION);
      expect(row.category).toBe(NIX_STEP3_FEEDBACK_CATEGORY);
      expect(row.confidence).toBe(1);
      expect(row.confirmationCount).toBe(1);
      expect(row.isActive).toBe(true);
      expect(row.originalValue).toContain('"diameter":450');
      expect(row.learnedValue).toContain('"diameter":100');
    });

    it("marks deletions with the DELETED sentinel", () => {
      const row = feedbackLearningRow(
        payload({}),
        correction({ correctionType: "item_deletion", correctedItem: null }),
      );
      expect(row.learnedValue).toBe("DELETED");
    });

    it("carries who and where in context", () => {
      const row = feedbackLearningRow(payload({ userId: 7, customerId: 9 }), correction({}));
      expect(row.context).toMatchObject({
        extractionId: 42,
        rowNumber: 53,
        sheetName: "BOQ",
        correctionType: "field_correction",
        changedFields: ["diameter"],
        userId: 7,
        customerId: 9,
      });
    });

    it("leaves originalValue undefined for added items", () => {
      const row = feedbackLearningRow(
        payload({}),
        correction({
          correctionType: "item_added",
          originalItem: null,
          correctedItem: { description: "Manually added pipe" },
        }),
      );
      expect(row.originalValue).toBeUndefined();
      expect(row.learnedValue).toContain("Manually added pipe");
    });
  });
});
