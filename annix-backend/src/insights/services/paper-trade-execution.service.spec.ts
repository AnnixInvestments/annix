import { Logger } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { PaperHolding } from "../entities/paper-holding.entity";
import { PaperPortfolio } from "../entities/paper-portfolio.entity";
import { PaperTrade } from "../entities/paper-trade.entity";
import type { SellDecision } from "./allocation-rules-engine.service";
import { applyTradeDecisions } from "./paper-trade-execution.service";

describe("applyTradeDecisions — applySell", () => {
  const portfolio = {
    id: "p1",
    slug: "nix-pure",
    currentCashBalance: "1000.00",
  } as PaperPortfolio;

  function buildSell(qty: number): SellDecision {
    return {
      action: "sell",
      portfolioId: "p1",
      portfolioSlug: "nix-pure",
      holdingId: "h1",
      assetId: "a1",
      symbol: "ABC",
      assetName: "ABC Corp",
      qty,
      estimatedPrice: 95,
      estimatedTradeValue: qty * 95,
      signalSnapshotId: null,
      opportunityScore: 0,
      riskScore: 0,
      confidenceScore: 0,
      reasonCode: "confidence-dropped",
      reasoning: "test",
      ruleEvaluationTrace: "test",
      newsConsidered: [],
    };
  }

  function mockSetup(holdingQuantity: string) {
    const portfolioRepo = {
      findOneOrFail: jest.fn().mockResolvedValue({ ...portfolio }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const holdingRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: "h1",
        quantity: holdingQuantity,
        averageBuyPrice: "90.000000",
      }),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const tradeRepo = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === PaperPortfolio) return portfolioRepo;
        if (entity === PaperHolding) return holdingRepo;
        if (entity === PaperTrade) return tradeRepo;
        throw new Error("unexpected entity");
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (cb: (m: typeof manager) => Promise<void>) => cb(manager)),
    } as unknown as DataSource;
    return { dataSource, portfolioRepo, holdingRepo, tradeRepo };
  }

  it("partial sell decrements the holding instead of deleting it", async () => {
    const { dataSource, portfolioRepo, holdingRepo } = mockSetup("100");

    const result = await applyTradeDecisions(
      dataSource,
      portfolio,
      [buildSell(2)],
      new Logger("test"),
    );

    expect(holdingRepo.delete).not.toHaveBeenCalled();
    expect(holdingRepo.update).toHaveBeenCalledWith(
      { id: "h1" },
      expect.objectContaining({ quantity: "98" }),
    );
    expect(result.sellsExecuted).toBe(1);
    expect(result.cashRaised).toBe(190);
    expect(portfolioRepo.update).toHaveBeenCalledWith(
      { id: "p1" },
      { currentCashBalance: "1190.00" },
    );
  });

  it("full sell deletes the holding row", async () => {
    const { dataSource, holdingRepo } = mockSetup("2");

    await applyTradeDecisions(dataSource, portfolio, [buildSell(2)], new Logger("test"));

    expect(holdingRepo.delete).toHaveBeenCalledWith({ id: "h1" });
    expect(holdingRepo.update).not.toHaveBeenCalled();
  });
});
