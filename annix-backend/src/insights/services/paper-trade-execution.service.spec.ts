import { Logger } from "@nestjs/common";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { PaperPortfolio } from "../entities/paper-portfolio.entity";
import type { SellDecision } from "./allocation-rules-engine.service";
import {
  applyTradeDecisions,
  type TradeDecisionRepositories,
} from "./paper-trade-execution.service";

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
      findByIdOrFail: jest.fn().mockResolvedValue({ ...portfolio }),
      updateById: jest.fn().mockResolvedValue(undefined),
      withTransaction: jest.fn(),
    };
    portfolioRepo.withTransaction.mockReturnValue(portfolioRepo);
    const holdingRepo = {
      findById: jest.fn().mockResolvedValue({
        id: "h1",
        quantity: holdingQuantity,
        averageBuyPrice: "90.000000",
      }),
      updateById: jest.fn().mockResolvedValue(undefined),
      deleteById: jest.fn().mockResolvedValue(undefined),
      findByPortfolioAndAsset: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
      withTransaction: jest.fn(),
    };
    holdingRepo.withTransaction.mockReturnValue(holdingRepo);
    const tradeRepo = {
      create: jest.fn().mockResolvedValue(undefined),
      withTransaction: jest.fn(),
    };
    tradeRepo.withTransaction.mockReturnValue(tradeRepo);
    const transactionContext = {} as TransactionContext;
    const txRunner = {
      run: jest.fn(async (work: (ctx: TransactionContext) => Promise<unknown>) =>
        work(transactionContext),
      ),
    };
    const repositories = {
      txRunner,
      portfolioRepo,
      holdingRepo,
      tradeRepo,
    } as unknown as TradeDecisionRepositories;
    return { repositories, portfolioRepo, holdingRepo, tradeRepo };
  }

  it("partial sell decrements the holding instead of deleting it", async () => {
    const { repositories, portfolioRepo, holdingRepo } = mockSetup("100");

    const result = await applyTradeDecisions(
      repositories,
      portfolio,
      [buildSell(2)],
      new Logger("test"),
    );

    expect(holdingRepo.deleteById).not.toHaveBeenCalled();
    expect(holdingRepo.updateById).toHaveBeenCalledWith(
      "h1",
      expect.objectContaining({ quantity: "98" }),
    );
    expect(result.sellsExecuted).toBe(1);
    expect(result.cashRaised).toBe(190);
    expect(portfolioRepo.updateById).toHaveBeenCalledWith("p1", {
      currentCashBalance: "1190.00",
    });
  });

  it("full sell deletes the holding row", async () => {
    const { repositories, holdingRepo } = mockSetup("2");

    await applyTradeDecisions(repositories, portfolio, [buildSell(2)], new Logger("test"));

    expect(holdingRepo.deleteById).toHaveBeenCalledWith("h1");
    expect(holdingRepo.updateById).not.toHaveBeenCalled();
  });
});
