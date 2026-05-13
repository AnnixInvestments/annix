import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { EmailService } from "../../email/email.service";
import { Candidate } from "../entities/candidate.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { EmbeddingService } from "./embedding.service";

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
        { provide: getRepositoryToken(Candidate), useValue: {} },
        { provide: getRepositoryToken(ExternalJob), useValue: {} },
        { provide: AiUsageService, useValue: aiUsageService },
        { provide: EmailService, useValue: emailService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
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

  it("alerts when daily calls breach the threshold", async () => {
    aiUsageService.aggregateDailyUsageByModel.mockResolvedValue({ calls: 5_500, tokens: 100_000 });

    const result = await service.runEmbeddingCostGuard();

    expect(result.alerted).toBe(true);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    const args = emailService.sendEmail.mock.calls[0][0];
    expect(args.subject).toContain("5500 calls");
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
