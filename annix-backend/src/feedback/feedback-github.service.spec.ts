jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({})),
}));

import { FeedbackGithubService } from "./feedback-github.service";

describe("FeedbackGithubService", () => {
  let service: FeedbackGithubService;

  beforeEach(() => {
    service = new FeedbackGithubService(
      {
        get: jest.fn(),
      } as never,
      {
        chat: jest.fn(),
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  describe("shouldTriggerClaude", () => {
    it("triggers Claude for investigation-style implementation questions", () => {
      const result = (
        service as unknown as {
          shouldTriggerClaude: (
            translation: {
              classification: "question";
              confidence: number;
              likelyLocation: string | null;
              reproductionSteps: string[];
              likelyCause: string | null;
              affectedSurface: string | null;
              riskFlags: string[];
              fixScope: string | null;
              autoFixable: boolean;
            },
            claudeOverride: "force" | "skip" | null,
          ) => boolean;
        }
      ).shouldTriggerClaude(
        {
          classification: "question",
          confidence: 0.91,
          likelyLocation: "Feedback widget implementation across modules",
          reproductionSteps: [],
          likelyCause: "Need to verify consistency and reuse",
          affectedSurface: "Feedback widget",
          riskFlags: [],
          fixScope: "investigation",
          autoFixable: true,
        },
        null,
      );

      expect(result).toBe(true);
    });

    it("triggers Claude for bug/ui-issue/data-issue regardless of fixScope or riskFlags", () => {
      const result = (
        service as unknown as {
          shouldTriggerClaude: (
            translation: {
              classification: "bug" | "ui-issue" | "data-issue";
              confidence: number;
              likelyLocation: string | null;
              reproductionSteps: string[];
              likelyCause: string | null;
              affectedSurface: string | null;
              riskFlags: string[];
              fixScope: string | null;
              autoFixable: boolean;
            },
            claudeOverride: "force" | "skip" | null,
          ) => boolean;
        }
      ).shouldTriggerClaude(
        {
          classification: "ui-issue",
          confidence: 0.4,
          likelyLocation: "Admin dashboard nav",
          reproductionSteps: [],
          likelyCause: null,
          affectedSurface: "Admin dashboard nav",
          riskFlags: ["backend", "mixed-surface"],
          fixScope: "frontend",
          autoFixable: false,
        },
        null,
      );

      expect(result).toBe(true);
    });

    it("does not trigger Claude for ordinary support questions", () => {
      const result = (
        service as unknown as {
          shouldTriggerClaude: (
            translation: {
              classification: "question";
              confidence: number;
              likelyLocation: string | null;
              reproductionSteps: string[];
              likelyCause: string | null;
              affectedSurface: string | null;
              riskFlags: string[];
              fixScope: string | null;
              autoFixable: boolean;
            },
            claudeOverride: "force" | "skip" | null,
          ) => boolean;
        }
      ).shouldTriggerClaude(
        {
          classification: "question",
          confidence: 0.94,
          likelyLocation: null,
          reproductionSteps: [],
          likelyCause: null,
          affectedSurface: "Supplier portal",
          riskFlags: [],
          fixScope: null,
          autoFixable: false,
        },
        null,
      );

      expect(result).toBe(false);
    });
  });
});
