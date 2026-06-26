import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { EmailService } from "../../email/email.service";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { CandidateRepository } from "../repositories/candidate.repository";
import { ExternalJobRepository } from "../repositories/external-job.repository";
import { EmbeddingService } from "./embedding.service";
import { EscoNormalisationService } from "./esco-normalisation.service";
import { JobCategorizationService } from "./job-categorization.service";

describe("EmbeddingService.embedding cost guard", () => {
  let service: EmbeddingService;
  let aiUsageService: { aggregateDailyUsageByModel: jest.Mock };
  let emailService: { sendEmail: jest.Mock };

  beforeEach(async () => {
    aiUsageService = {
      aggregateDailyUsageByModel: jest.fn().mockResolvedValue({ calls: 0, tokens: 0 }),
    };
    emailService = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        { provide: CandidateRepository, useValue: {} },
        { provide: ExternalJobRepository, useValue: {} },
        { provide: AiUsageService, useValue: aiUsageService },
        { provide: EmailService, useValue: emailService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
        {
          provide: EscoNormalisationService,
          useValue: {
            canonicalise: jest.fn(),
            canonicaliseAll: jest.fn().mockResolvedValue([]),
            expandedSkillTokens: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: JobCategorizationService,
          useValue: {
            ruleBased: jest.fn().mockReturnValue(null),
            categorize: jest.fn().mockResolvedValue("other"),
            categorizeCandidate: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ExtractionMetricService,
          useValue: { time: jest.fn((_category, _operation, fn) => fn()) },
        },
      ],
    }).compile();
    service = module.get<EmbeddingService>(EmbeddingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does not alert when calls and cost are both below thresholds", async () => {
    aiUsageService.aggregateDailyUsageByModel.mockResolvedValue({ calls: 100, tokens: 50_000 });

    const result = await service.runEmbeddingCostGuard();

    expect(result.alerted).toBe(false);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it("does NOT alert on a call-count spike alone — the embedding guard is cost-only (#390)", async () => {
    // 5500 calls is above the old 5000 call threshold, but embeddings are
    // high-volume / near-zero cost, so a volume spike must not page anyone.
    aiUsageService.aggregateDailyUsageByModel.mockResolvedValue({ calls: 5_500, tokens: 100_000 });

    const result = await service.runEmbeddingCostGuard();

    expect(result.alerted).toBe(false);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it("alerts when estimated USD breaches the threshold", async () => {
    aiUsageService.aggregateDailyUsageByModel.mockResolvedValue({
      calls: 100,
      tokens: 250_000_000,
    });

    const result = await service.runEmbeddingCostGuard();

    expect(result.alerted).toBe(true);
    expect(result.estimatedUsd).toBeGreaterThan(5);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
  });
});
