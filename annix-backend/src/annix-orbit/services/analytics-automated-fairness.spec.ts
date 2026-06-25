import type { CandidateRepository } from "../repositories/candidate.repository";
import type { ExternalJobRepository } from "../repositories/external-job.repository";
import type { JobPostingRepository } from "../repositories/job-posting.repository";
import { AnalyticsService } from "./analytics.service";
import type { CvAuditService } from "./cv-audit.service";

type FairnessRow = {
  candidate_id: number;
  status: string;
  decision_source: string | null;
  population_group: string;
  gender: string;
  disability_status: string;
  nationality_status: string;
};

function row(overrides: Partial<FairnessRow>): FairnessRow {
  return {
    candidate_id: 0,
    status: "rejected",
    decision_source: "automated",
    population_group: "african",
    gender: "male",
    disability_status: "none",
    nationality_status: "sa_citizen",
    ...overrides,
  };
}

function makeService(rows: FairnessRow[]) {
  const candidateRepo = {
    fairnessRows: jest.fn().mockResolvedValue(rows),
  } as unknown as CandidateRepository;
  const jobPostingRepo = {
    activeJobsForFairness: jest.fn().mockResolvedValue([]),
  } as unknown as JobPostingRepository;
  const externalJobRepo = {} as unknown as ExternalJobRepository;
  const cvAuditService = {
    logFairnessBreach: jest.fn().mockResolvedValue(undefined),
  } as unknown as CvAuditService;
  const service = new AnalyticsService(
    candidateRepo,
    jobPostingRepo,
    externalJobRepo,
    cvAuditService,
  );
  return { service };
}

const automatedAdverseRows: FairnessRow[] = [
  ...Array.from({ length: 10 }, (_, i) =>
    row({
      candidate_id: i,
      decision_source: "automated",
      population_group: "white",
      status: "shortlisted",
    }),
  ),
  ...Array.from({ length: 10 }, (_, i) =>
    row({
      candidate_id: 100 + i,
      decision_source: "automated",
      population_group: "african",
      status: "rejected",
    }),
  ),
  ...Array.from({ length: 10 }, (_, i) =>
    row({
      candidate_id: 200 + i,
      decision_source: "human",
      population_group: "african",
      status: "shortlisted",
    }),
  ),
];

describe("AnalyticsService automated-decision fairness slice (issue #398 finding 4)", () => {
  it("computes a distinct automated slice alongside the overall pool", async () => {
    const { service } = makeService(automatedAdverseRows);
    const report = await service.analyseJobFairness(1, 7, "Welder");

    expect(report.totalAnalysed).toBe(30);
    expect(report.automated.totalAnalysed).toBe(20);
  });

  it("flags a sub-0.8 ratio on the automated slice", async () => {
    const { service } = makeService(automatedAdverseRows);
    const report = await service.analyseJobFairness(1, 7, "Welder");

    expect(report.automated.breaches.length).toBeGreaterThan(0);
    expect(report.automated.breaches.some((b) => b.includes("population_group"))).toBe(true);
  });

  it("counts only automated rows in the automated slice", async () => {
    const onlyHuman = automatedAdverseRows.map((r) => ({ ...r, decision_source: "human" }));
    const { service } = makeService(onlyHuman);
    const report = await service.analyseJobFairness(1, 7, "Welder");

    expect(report.automated.totalAnalysed).toBe(0);
    expect(report.automated.breaches).toEqual([]);
  });
});
