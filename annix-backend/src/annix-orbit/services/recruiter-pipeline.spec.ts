import {
  buildPipelineFunnel,
  effectiveStageIndex,
  pipelineStageIndex,
  submissionStageIndex,
} from "./recruiter-pipeline";

describe("recruiter-pipeline (issue #362 phase 0)", () => {
  describe("submissionStageIndex", () => {
    it("maps every submission status to at least submitted", () => {
      expect(submissionStageIndex("submitted")).toBe(pipelineStageIndex("submitted"));
      expect(submissionStageIndex("rejected")).toBe(pipelineStageIndex("submitted"));
      expect(submissionStageIndex("no_response")).toBe(pipelineStageIndex("submitted"));
      expect(submissionStageIndex("interview")).toBe(pipelineStageIndex("interview"));
      expect(submissionStageIndex("offer")).toBe(pipelineStageIndex("offer"));
      expect(submissionStageIndex("placed")).toBe(pipelineStageIndex("placed"));
    });
  });

  describe("effectiveStageIndex", () => {
    it("takes the furthest of manual stage, placed status, and submissions", () => {
      expect(effectiveStageIndex({ pipelineStage: "shortlisted" }, [])).toBe(
        pipelineStageIndex("shortlisted"),
      );
      expect(effectiveStageIndex({ pipelineStage: "identified" }, ["interview"])).toBe(
        pipelineStageIndex("interview"),
      );
      expect(effectiveStageIndex({ status: "placed" }, [])).toBe(pipelineStageIndex("placed"));
      expect(effectiveStageIndex({ pipelineStage: "screened" }, ["submitted", "offer"])).toBe(
        pipelineStageIndex("offer"),
      );
    });

    it("defaults to identified", () => {
      expect(effectiveStageIndex({}, [])).toBe(0);
    });
  });

  describe("buildPipelineFunnel", () => {
    it("builds a cumulative funnel with percentages and conversion rate", () => {
      // 4 identified, 3 reached submitted(3), 2 interview(4), 1 placed(6)
      const indexes = [0, 3, 4, 6];
      const funnel = buildPipelineFunnel(indexes);
      const byKey = Object.fromEntries(funnel.stages.map((s) => [s.key, s.count]));
      expect(byKey.identified).toBe(4);
      expect(byKey.submitted).toBe(3);
      expect(byKey.interview).toBe(2);
      expect(byKey.offer).toBe(1);
      expect(byKey.placed).toBe(1);
      expect(funnel.stages[0].pct).toBe(100);
      expect(funnel.conversionRate).toBe(25);
    });

    it("handles an empty pool", () => {
      const funnel = buildPipelineFunnel([]);
      expect(funnel.conversionRate).toBe(0);
      expect(funnel.stages.every((s) => s.count === 0 && s.pct === 0)).toBe(true);
    });
  });
});
