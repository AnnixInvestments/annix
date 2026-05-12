import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaperHolding } from "../entities/paper-holding.entity";
import {
  type AllocationRules,
  PaperPortfolio,
  type PaperPortfolioSlug,
  type RiskProfile,
} from "../entities/paper-portfolio.entity";
import { PaperPortfolioSnapshot } from "../entities/paper-portfolio-snapshot.entity";
import { PaperTrade } from "../entities/paper-trade.entity";

export interface PaperPortfolioSummary {
  id: string;
  slug: PaperPortfolioSlug;
  displayName: string;
  riskProfile: RiskProfile;
  currency: string;
  startingCapital: number;
  monthlyContribution: number;
  currentCashBalance: number;
  currentPortfolioValue: number;
  totalValue: number;
  holdingsCount: number;
  isActive: boolean;
  isPaused: boolean;
  allocationRules: AllocationRules;
  createdAt: string;
}

export interface PaperHoldingDto {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealisedGainLoss: number;
  unrealisedGainLossPercent: number;
  firstAcquiredAt: string;
}

export interface PaperTradeDto {
  id: string;
  symbol: string | null;
  action: string;
  quantity: number;
  price: number;
  tradeValue: number;
  fees: number;
  appReasoning: string;
  opportunityScore: number | null;
  riskScore: number | null;
  confidenceScore: number | null;
  marketRegime: string | null;
  executedAt: string;
}

@Injectable()
export class PaperPortfolioService {
  private readonly logger = new Logger(PaperPortfolioService.name);

  constructor(
    @InjectRepository(PaperPortfolio)
    private readonly portfolioRepo: Repository<PaperPortfolio>,
    @InjectRepository(PaperHolding)
    private readonly holdingRepo: Repository<PaperHolding>,
    @InjectRepository(PaperTrade)
    private readonly tradeRepo: Repository<PaperTrade>,
    @InjectRepository(PaperPortfolioSnapshot)
    private readonly snapshotRepo: Repository<PaperPortfolioSnapshot>,
  ) {}

  async listAll(): Promise<PaperPortfolioSummary[]> {
    const portfolios = await this.portfolioRepo.find({
      order: { createdAt: "ASC" },
    });
    return Promise.all(portfolios.map((p) => this.summariseInternal(p)));
  }

  async bySlug(slug: string): Promise<PaperPortfolioSummary> {
    const portfolio = await this.portfolioRepo.findOne({
      where: { slug: slug as PaperPortfolioSlug },
    });
    if (!portfolio) {
      throw new NotFoundException(`Paper portfolio "${slug}" not found.`);
    }
    return this.summariseInternal(portfolio);
  }

  async holdings(slug: string): Promise<PaperHoldingDto[]> {
    const portfolio = await this.portfolioRepo.findOne({
      where: { slug: slug as PaperPortfolioSlug },
    });
    if (!portfolio) {
      throw new NotFoundException(`Paper portfolio "${slug}" not found.`);
    }
    const holdings = await this.holdingRepo.find({
      where: { portfolioId: portfolio.id },
      relations: { asset: true },
      order: { firstAcquiredAt: "ASC" },
    });
    return holdings.map((h) => ({
      id: h.id,
      symbol: h.asset.symbol,
      name: h.asset.name,
      quantity: Number(h.quantity),
      averageBuyPrice: Number(h.averageBuyPrice),
      currentPrice: Number(h.currentPrice),
      marketValue: Number(h.marketValue),
      unrealisedGainLoss: Number(h.unrealisedGainLoss),
      unrealisedGainLossPercent: Number(h.unrealisedGainLossPercent),
      firstAcquiredAt: h.firstAcquiredAt.toISOString(),
    }));
  }

  async trades(slug: string, limit = 250): Promise<PaperTradeDto[]> {
    const portfolio = await this.portfolioRepo.findOne({
      where: { slug: slug as PaperPortfolioSlug },
    });
    if (!portfolio) {
      throw new NotFoundException(`Paper portfolio "${slug}" not found.`);
    }
    const trades = await this.tradeRepo.find({
      where: { portfolioId: portfolio.id },
      relations: { asset: true },
      order: { executedAt: "DESC" },
      take: limit,
    });
    return trades.map((t) => ({
      id: t.id,
      symbol: t.asset ? t.asset.symbol : null,
      action: t.action,
      quantity: Number(t.quantity),
      price: Number(t.price),
      tradeValue: Number(t.tradeValue),
      fees: Number(t.fees),
      appReasoning: t.appReasoning,
      opportunityScore: t.opportunityScore !== null ? Number(t.opportunityScore) : null,
      riskScore: t.riskScore !== null ? Number(t.riskScore) : null,
      confidenceScore: t.confidenceScore !== null ? Number(t.confidenceScore) : null,
      marketRegime: t.marketRegime,
      executedAt: t.executedAt.toISOString(),
    }));
  }

  async addMonthlyContributionToAll(): Promise<{ credited: number; portfolios: string[] }> {
    const portfolios = await this.portfolioRepo.find({ where: { isActive: true } });
    let credited = 0;
    const updated: string[] = [];
    for (const portfolio of portfolios) {
      try {
        await this.addMonthlyContribution(portfolio);
        credited += Number(portfolio.monthlyContribution);
        updated.push(portfolio.slug);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Monthly contribution failed for ${portfolio.slug}: ${message}`);
      }
    }
    return { credited, portfolios: updated };
  }

  async addMonthlyContribution(portfolio: PaperPortfolio): Promise<void> {
    const amount = Number(portfolio.monthlyContribution);
    if (amount <= 0) return;

    const newCash = Number(portfolio.currentCashBalance) + amount;
    await this.portfolioRepo.update(
      { id: portfolio.id },
      { currentCashBalance: newCash.toFixed(2) },
    );

    const trade = this.tradeRepo.create({
      portfolioId: portfolio.id,
      assetId: null,
      action: "contribution",
      quantity: "0",
      price: "0",
      tradeValue: amount.toFixed(2),
      fees: "0",
      appReasoning: `Scheduled monthly contribution of ${portfolio.currency} ${amount.toFixed(
        2,
      )} — auto-credited by insights:monthly-contribution cron.`,
      opportunityScore: null,
      riskScore: null,
      confidenceScore: null,
      marketRegime: null,
      signalSnapshot: null,
      relatedNewsIds: null,
    });
    await this.tradeRepo.save(trade);
  }

  private async summariseInternal(portfolio: PaperPortfolio): Promise<PaperPortfolioSummary> {
    const holdingsCount = await this.holdingRepo.count({ where: { portfolioId: portfolio.id } });
    const cash = Number(portfolio.currentCashBalance);
    const invested = Number(portfolio.currentPortfolioValue);
    return {
      id: portfolio.id,
      slug: portfolio.slug,
      displayName: portfolio.displayName,
      riskProfile: portfolio.riskProfile,
      currency: portfolio.currency,
      startingCapital: Number(portfolio.startingCapital),
      monthlyContribution: Number(portfolio.monthlyContribution),
      currentCashBalance: cash,
      currentPortfolioValue: invested,
      totalValue: cash + invested,
      holdingsCount,
      isActive: portfolio.isActive,
      isPaused: portfolio.isPaused,
      allocationRules: portfolio.allocationRulesJson,
      createdAt: portfolio.createdAt.toISOString(),
    };
  }
}
