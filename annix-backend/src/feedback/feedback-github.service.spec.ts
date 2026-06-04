jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({})),
}));

import { FeedbackGithubService } from "./feedback-github.service";

interface TestTranslation {
  classification: "bug" | "ui-issue" | "data-issue" | "feature-request" | "question";
  confidence: number;
  likelyLocation: string | null;
  reproductionSteps: string[];
  likelyCause: string | null;
  affectedSurface: string | null;
  riskFlags: string[];
  fixScope: string | null;
  autoFixable: boolean;
}

const baseTranslation: TestTranslation = {
  classification: "feature-request",
  confidence: 0.8,
  likelyLocation: null,
  reproductionSteps: [],
  likelyCause: null,
  affectedSurface: "Annix Orbit seeker",
  riskFlags: [],
  fixScope: null,
  autoFixable: false,
};

const serviceWithConfig = (config: Record<string, string | undefined>): FeedbackGithubService =>
  new FeedbackGithubService(
    {
      get: (key: string) => config[key],
    } as never,
    { chat: jest.fn() } as never,
    {} as never,
    {} as never,
    {} as never,
  );

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

  describe("isAssessOnlyEnvironment", () => {
    const assessOnlyEnv = (svc: FeedbackGithubService): boolean =>
      (svc as unknown as { isAssessOnlyEnvironment: () => boolean }).isAssessOnlyEnvironment();

    it("is true only when FEEDBACK_ENV is test", () => {
      expect(assessOnlyEnv(serviceWithConfig({ FEEDBACK_ENV: "test" }))).toBe(true);
    });

    it("is false when FEEDBACK_ENV is unset (prod/staging)", () => {
      expect(assessOnlyEnv(serviceWithConfig({}))).toBe(false);
    });

    it("is false for any non-test value", () => {
      expect(assessOnlyEnv(serviceWithConfig({ FEEDBACK_ENV: "staging" }))).toBe(false);
    });
  });

  describe("testIssueNumber", () => {
    const issueNumber = (svc: FeedbackGithubService): number | null =>
      (svc as unknown as { testIssueNumber: () => number | null }).testIssueNumber();

    it("parses a bare number", () => {
      expect(issueNumber(serviceWithConfig({ FEEDBACK_TEST_ISSUE: "344" }))).toBe(344);
    });

    it("tolerates a leading hash and whitespace", () => {
      expect(issueNumber(serviceWithConfig({ FEEDBACK_TEST_ISSUE: " #344 " }))).toBe(344);
    });

    it("returns null when unset", () => {
      expect(issueNumber(serviceWithConfig({}))).toBeNull();
    });

    it("returns null for a non-numeric value", () => {
      expect(issueNumber(serviceWithConfig({ FEEDBACK_TEST_ISSUE: "later" }))).toBeNull();
    });
  });

  describe("buildCommentBody", () => {
    const build = (
      svc: FeedbackGithubService,
      translation: TestTranslation,
      labels: string[],
      assessOnly: boolean,
    ): string =>
      (
        svc as unknown as {
          buildCommentBody: (
            commentBody: string,
            translation: TestTranslation,
            labels: string[],
            assessOnly: boolean,
          ) => string;
        }
      ).buildCommentBody("BODY", translation, labels, assessOnly);

    it("emits an assess-only instruction that still mentions @claude and forbids a PR", () => {
      const result = build(service, baseTranslation, [], true);

      expect(result).toContain("@claude");
      expect(result).toContain("Assess only");
      expect(result).toContain("TEST environment");
      expect(result).not.toContain("create a branch");
    });

    it("assess-only mode triggers even for a feature-request the normal path would skip", () => {
      const result = build(service, baseTranslation, [], true);

      expect(result).toContain("@claude");
    });

    it("keeps the existing auto-fix instruction when not in assess-only mode", () => {
      const result = build(service, { ...baseTranslation, classification: "bug" }, [], false);

      expect(result).toContain("@claude");
      expect(result).toContain("create a branch and PR");
      expect(result).not.toContain("Assess only");
    });
  });
});
