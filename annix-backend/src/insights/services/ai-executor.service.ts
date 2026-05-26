import { Injectable, Logger } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { Asset } from "../entities/asset.entity";
import { PaperHolding } from "../entities/paper-holding.entity";
import {
  type ExecutorStrategy,
  PaperPortfolio,
  type PaperPortfolioSlug,
} from "../entities/paper-portfolio.entity";
import type { NewsProvenance } from "../entities/paper-trade.entity";
import { type SignalComponentBreakdown, SignalSnapshot } from "../entities/signal-snapshot.entity";
import { NewsItemRepository } from "../repositories/news-item.repository";
import { PaperHoldingRepository } from "../repositories/paper-holding.repository";
import { PaperPortfolioRepository } from "../repositories/paper-portfolio.repository";
import { PaperTradeRepository } from "../repositories/paper-trade.repository";
import { PriceHistoryRepository } from "../repositories/price-history.repository";
import { SignalSnapshotRepository } from "../repositories/signal-snapshot.repository";
import { WatchlistItemRepository } from "../repositories/watchlist-item.repository";
import type { BuyDecision, Decision, SellDecision } from "./allocation-rules-engine.service";
import { AllocationRulesEngineService } from "./allocation-rules-engine.service";
import { dedupeProvenance, toNewsProvenance } from "./news-provenance";
import {
  applyTradeDecisions,
  type ExecutionResult,
  type TradeDecisionRepositories,
} from "./paper-trade-execution.service";

const METRIC_CATEGORY = "insights-ai-exec";
const TOP_SIGNAL_COUNT = 20;
const NEWS_LOOKBACK_HOURS = 48;
const NEWS_MAX_ARTICLES = 30;
const MAX_PRICE_AGE_DAYS = 5;
const SYSTEM_PROMPT =
  "You are a paper-trading allocator for an experimental ZAR-denominated portfolio. You receive market signals, recent news, the portfolio's current holdings, and its cash balance. Your job is to output a list of trade decisions — buys, sells, or no-ops — with concise reasoning per decision and an overall rationale. Rules: (1) Never recommend buying more than the cash balance allows. (2) Only sell symbols the portfolio currently holds. (3) Only buy symbols from the provided signal list — those are the universe. (4) Always include at least one risk caveat in the overall rationale. (5) Output ONLY a JSON object — no markdown, no code fences, no surrounding text.";

interface AiDecisionContext {
  topSignals: SignalContextRow[];
  newsItems: NewsContextRow[];
  promptNews: NewsProvenance[];
  holdings: HoldingContextRow[];
  cashBalance: number;
  currency: string;
  todayIso: string;
}

interface SignalContextRow {
  asset: Asset;
  snapshot: SignalSnapshot;
  latestPrice: number;
  latestPriceDate: string;
}

interface NewsContextRow {
  publishedAt: Date | null;
  symbols: string[];
  event: string;
  sentiment: number | null;
  impactLevel: string | null;
  shortTermImplication: string | null;
}

interface HoldingContextRow {
  holding: PaperHolding;
  asset: Asset;
  signal: SignalSnapshot | null;
  latestPrice: number | null;
}

interface ParsedAiDecision {
  action: "buy" | "sell";
  symbol: string;
  qty: number;
  reasoning: string;
}

interface ParsedAiResponse {
  decisions: ParsedAiDecision[];
  rationale: string;
}

@Injectable()
export class AiExecutorService {
  private readonly logger = new Logger(AiExecutorService.name);

  constructor(
    private readonly portfolioRepo: PaperPortfolioRepository,
    private readonly holdingRepo: PaperHoldingRepository,
    private readonly tradeRepo: PaperTradeRepository,
    private readonly watchlistRepo: WatchlistItemRepository,
    private readonly historyRepo: PriceHistoryRepository,
    private readonly signalRepo: SignalSnapshotRepository,
    private readonly newsRepo: NewsItemRepository,
    private readonly txRunner: TransactionRunner,
    private readonly ai: AiChatService,
    private readonly metrics: ExtractionMetricService,
    private readonly rulesEngine: AllocationRulesEngineService,
  ) {}

  private tradeDecisionRepositories(): TradeDecisionRepositories {
    return {
      txRunner: this.txRunner,
      portfolioRepo: this.portfolioRepo,
      holdingRepo: this.holdingRepo,
      tradeRepo: this.tradeRepo,
    };
  }

  async executeOne(portfolio: PaperPortfolio): Promise<ExecutionResult> {
    const strategy = portfolio.executorStrategy;
    if (strategy === "ai-pure") {
      return this.metrics.time(
        METRIC_CATEGORY,
        `${portfolio.slug}:ai-pure`,
        () => this.runPureMode(portfolio),
        () => 0,
      );
    }
    if (strategy === "ai-override") {
      return this.metrics.time(
        METRIC_CATEGORY,
        `${portfolio.slug}:ai-override`,
        () => this.runOverrideMode(portfolio),
        () => 0,
      );
    }
    if (strategy === "ai-picker") {
      return this.metrics.time(
        METRIC_CATEGORY,
        `${portfolio.slug}:ai-picker`,
        () => this.runPickerMode(portfolio),
        () => 0,
      );
    }
    return {
      portfolioSlug: portfolio.slug,
      buysExecuted: 0,
      sellsExecuted: 0,
      cashDeployed: 0,
      cashRaised: 0,
      skipped: true,
      skipReason: `executor_strategy=${strategy} not yet implemented in AiExecutorService`,
    };
  }

  private async runPickerMode(portfolio: PaperPortfolio): Promise<ExecutionResult> {
    const context = await this.gatherContext(portfolio);
    if (context.topSignals.length === 0) {
      return skipResult(portfolio.slug, "no signal snapshots available — skipping ai-picker run");
    }
    const prompt = buildPickerPrompt(portfolio, context);
    let aiContent: string;
    try {
      const response = await this.ai.chat([{ role: "user", content: prompt }], SYSTEM_PROMPT);
      aiContent = response.content;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Gemini picker call failed for ${portfolio.slug}: ${message}`);
      return skipResult(portfolio.slug, `gemini failed: ${message}`);
    }

    let picks: ParsedPickerResponse;
    try {
      picks = parsePickerResponse(aiContent);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Gemini picker parse failed for ${portfolio.slug}: ${message}. Raw: ${aiContent.slice(0, 400)}`,
      );
      return skipResult(portfolio.slug, `ai-response parse failed: ${message}`);
    }

    const pickedSymbols = new Set(picks.picks.map((s) => s.toUpperCase()));
    if (pickedSymbols.size === 0) {
      this.logger.log(
        `${portfolio.slug}: ai-picker returned zero picks — letting rules engine sell-only.`,
      );
    }

    const draft = await this.rulesEngine.evaluateOne(portfolio);
    const filtered: Decision[] = draft.decisions
      .filter((d) => {
        if (d.action === "sell") return true;
        return pickedSymbols.has(d.symbol.toUpperCase());
      })
      .map((d) => {
        const tag = d.action === "buy" ? "[ai-picker · picked]" : "[ai-picker · sell-pass-through]";
        return {
          ...d,
          reasoning: `${tag} ${picks.rationale ? `overall: ${picks.rationale} | ` : ""}original: ${d.reasoning}`,
          newsConsidered: dedupeProvenance([...d.newsConsidered, ...context.promptNews]),
        } as Decision;
      });

    if (filtered.length === 0) {
      this.logger.log(`${portfolio.slug}: ai-picker filter dropped all rules-engine decisions.`);
      return {
        portfolioSlug: portfolio.slug,
        buysExecuted: 0,
        sellsExecuted: 0,
        cashDeployed: 0,
        cashRaised: 0,
        skipped: false,
        skipReason: null,
      };
    }
    return applyTradeDecisions(this.tradeDecisionRepositories(), portfolio, filtered, this.logger);
  }

  private async runOverrideMode(portfolio: PaperPortfolio): Promise<ExecutionResult> {
    const draft = await this.rulesEngine.evaluateOne(portfolio);
    if (draft.decisions.length === 0) {
      this.logger.log(
        `${portfolio.slug}: rules engine produced no draft decisions — nothing to override.`,
      );
      return {
        portfolioSlug: portfolio.slug,
        buysExecuted: 0,
        sellsExecuted: 0,
        cashDeployed: 0,
        cashRaised: 0,
        skipped: false,
        skipReason: null,
      };
    }
    const context = await this.gatherContext(portfolio);
    const prompt = buildOverridePrompt(portfolio, context, draft.decisions);

    let aiContent: string;
    try {
      const response = await this.ai.chat([{ role: "user", content: prompt }], SYSTEM_PROMPT);
      aiContent = response.content;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Gemini override call failed for ${portfolio.slug}: ${message}`);
      return skipResult(portfolio.slug, `gemini failed: ${message}`);
    }

    let verdicts: ParsedOverrideResponse;
    try {
      verdicts = parseOverrideResponse(aiContent);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Gemini override parse failed for ${portfolio.slug}: ${message}. Raw: ${aiContent.slice(0, 400)}`,
      );
      return skipResult(portfolio.slug, `ai-response parse failed: ${message}`);
    }

    const applied = applyOverrides(
      draft.decisions,
      verdicts,
      this.logger,
      portfolio.slug,
      context.promptNews,
    );
    if (applied.length === 0) {
      this.logger.log(`${portfolio.slug}: ai-override dropped every draft decision.`);
      return {
        portfolioSlug: portfolio.slug,
        buysExecuted: 0,
        sellsExecuted: 0,
        cashDeployed: 0,
        cashRaised: 0,
        skipped: false,
        skipReason: null,
      };
    }
    return applyTradeDecisions(this.tradeDecisionRepositories(), portfolio, applied, this.logger);
  }

  private async runPureMode(portfolio: PaperPortfolio): Promise<ExecutionResult> {
    const context = await this.gatherContext(portfolio);
    if (context.topSignals.length === 0) {
      return skipResult(portfolio.slug, "no signal snapshots available — skipping ai-pure run");
    }
    const prompt = buildPurePrompt(portfolio, context);
    let aiContent: string;
    try {
      const response = await this.ai.chat([{ role: "user", content: prompt }], SYSTEM_PROMPT);
      aiContent = response.content;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Gemini call failed for ${portfolio.slug}: ${message}`);
      return skipResult(portfolio.slug, `gemini failed: ${message}`);
    }

    let parsed: ParsedAiResponse;
    try {
      parsed = parseAiResponse(aiContent);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Gemini response parse failed for ${portfolio.slug}: ${message}. Raw: ${aiContent.slice(0, 400)}`,
      );
      return skipResult(portfolio.slug, `ai-response parse failed: ${message}`);
    }

    const decisions = this.resolveDecisions(portfolio, parsed, context);
    if (decisions.length === 0) {
      this.logger.log(`${portfolio.slug}: ai-pure produced no actionable decisions.`);
      return {
        portfolioSlug: portfolio.slug,
        buysExecuted: 0,
        sellsExecuted: 0,
        cashDeployed: 0,
        cashRaised: 0,
        skipped: false,
        skipReason: null,
      };
    }
    return applyTradeDecisions(this.tradeDecisionRepositories(), portfolio, decisions, this.logger);
  }

  private async gatherContext(portfolio: PaperPortfolio): Promise<AiDecisionContext> {
    const todayIso = now().toISODate() ?? "";
    const watchlist = await this.watchlistRepo.findAllWithAsset();
    const candidateAssets = watchlist.map((w) => w.asset);
    const candidateAssetIds = candidateAssets.map((a) => a.id);

    const latestSignals = await this.latestSignalsByAsset(candidateAssetIds);
    const latestPrices = await this.latestPricesByAsset(candidateAssetIds);

    const topSignals: SignalContextRow[] = candidateAssets
      .map((asset) => {
        const snapshot = latestSignals.get(asset.id) ?? null;
        const priceInfo = latestPrices.get(asset.id) ?? null;
        if (snapshot === null || priceInfo === null) return null;
        const staleness = isoDaysDiff(priceInfo.date, todayIso);
        if (staleness > MAX_PRICE_AGE_DAYS) return null;
        return {
          asset,
          snapshot,
          latestPrice: priceInfo.close,
          latestPriceDate: priceInfo.date,
        };
      })
      .filter((row): row is SignalContextRow => row !== null)
      .sort((a, b) => Number(b.snapshot.opportunityScore) - Number(a.snapshot.opportunityScore))
      .slice(0, TOP_SIGNAL_COUNT);

    const cutoff = now().minus({ hours: NEWS_LOOKBACK_HOURS }).toJSDate();
    const newsRows = await this.newsRepo.findExtractedHighImpact(cutoff, NEWS_MAX_ARTICLES);
    const newsItems: NewsContextRow[] = newsRows.map((n) => ({
      publishedAt: n.publishedAt,
      symbols: n.relatedSymbols ?? [],
      event: n.summary ?? n.title,
      sentiment: n.sentiment !== null ? Number(n.sentiment) : null,
      impactLevel: n.impactLevel,
      shortTermImplication: n.shortTermImplication,
    }));
    const promptNews = dedupeProvenance(newsRows.map(toNewsProvenance));

    const holdings = await this.holdingRepo.findByPortfolioWithAsset(portfolio.id);
    const holdingAssetIds = holdings.map((h) => h.assetId);
    const holdingSignals = await this.latestSignalsByAsset(holdingAssetIds);
    const holdingPrices = await this.latestPricesByAsset(holdingAssetIds);
    const holdingsContext: HoldingContextRow[] = holdings.map((h) => ({
      holding: h,
      asset: h.asset,
      signal: holdingSignals.get(h.assetId) ?? null,
      latestPrice: holdingPrices.get(h.assetId)?.close ?? null,
    }));

    return {
      topSignals,
      newsItems,
      promptNews,
      holdings: holdingsContext,
      cashBalance: Number(portfolio.currentCashBalance),
      currency: portfolio.currency,
      todayIso,
    };
  }

  private resolveDecisions(
    portfolio: PaperPortfolio,
    parsed: ParsedAiResponse,
    context: AiDecisionContext,
  ): Decision[] {
    const signalBySymbol = new Map<string, SignalContextRow>();
    for (const row of context.topSignals) {
      signalBySymbol.set(row.asset.symbol.toUpperCase(), row);
    }
    const holdingBySymbol = new Map<string, HoldingContextRow>();
    for (const row of context.holdings) {
      holdingBySymbol.set(row.asset.symbol.toUpperCase(), row);
    }

    const decisions: Decision[] = [];
    let simulatedCash = context.cashBalance;
    const overallRationale = parsed.rationale;

    for (const parsedDecision of parsed.decisions) {
      const symbol = parsedDecision.symbol.toUpperCase();
      const qty = Math.floor(parsedDecision.qty);
      if (qty <= 0) {
        this.logger.warn(`${portfolio.slug}: skipping ${symbol} — non-positive qty ${qty}`);
        continue;
      }
      const reasoning = `[ai-pure] ${parsedDecision.reasoning} | overall: ${overallRationale}`;

      if (parsedDecision.action === "sell") {
        const held = holdingBySymbol.get(symbol);
        if (!held) {
          this.logger.warn(`${portfolio.slug}: ai-pure sell ${symbol} skipped — not held`);
          continue;
        }
        const priceInfo = held.latestPrice;
        if (priceInfo === null) {
          this.logger.warn(`${portfolio.slug}: ai-pure sell ${symbol} skipped — no current price`);
          continue;
        }
        const heldQty = Number(held.holding.quantity);
        const sellQty = Math.min(qty, heldQty);
        const tradeValue = sellQty * priceInfo;
        const sellDecision: SellDecision = {
          action: "sell",
          portfolioId: portfolio.id,
          portfolioSlug: portfolio.slug,
          holdingId: held.holding.id,
          assetId: held.asset.id,
          symbol: held.asset.symbol,
          assetName: held.asset.name,
          qty: sellQty,
          estimatedPrice: priceInfo,
          estimatedTradeValue: tradeValue,
          signalSnapshotId: held.signal?.id ?? null,
          opportunityScore: held.signal !== null ? Number(held.signal.opportunityScore) : 0,
          riskScore: held.signal !== null ? Number(held.signal.riskScore) : 0,
          confidenceScore: held.signal !== null ? Number(held.signal.confidenceScore) : 0,
          reasonCode: "confidence-dropped",
          reasoning,
          ruleEvaluationTrace: "ai-pure executor — Gemini-directed sell",
          newsConsidered: context.promptNews,
        };
        decisions.push(sellDecision);
        simulatedCash += tradeValue;
        continue;
      }

      const sig = signalBySymbol.get(symbol);
      if (!sig) {
        this.logger.warn(
          `${portfolio.slug}: ai-pure buy ${symbol} skipped — not in top ${TOP_SIGNAL_COUNT} signals`,
        );
        continue;
      }
      const tradeValue = qty * sig.latestPrice;
      if (tradeValue > simulatedCash) {
        this.logger.warn(
          `${portfolio.slug}: ai-pure buy ${symbol} ${qty}@${sig.latestPrice} = ${tradeValue.toFixed(2)} exceeds remaining cash ${simulatedCash.toFixed(2)}; skipping`,
        );
        continue;
      }
      const buyDecision: BuyDecision = {
        action: "buy",
        portfolioId: portfolio.id,
        portfolioSlug: portfolio.slug,
        assetId: sig.asset.id,
        symbol: sig.asset.symbol,
        assetName: sig.asset.name,
        qty,
        estimatedPrice: sig.latestPrice,
        estimatedTradeValue: tradeValue,
        signalSnapshotId: sig.snapshot.id,
        signalSnapshotDate:
          typeof sig.snapshot.snapshotDate === "string"
            ? sig.snapshot.snapshotDate.slice(0, 10)
            : sig.snapshot.snapshotDate,
        signalBreakdown: sig.snapshot.componentBreakdownJson,
        opportunityScore: Number(sig.snapshot.opportunityScore),
        riskScore: Number(sig.snapshot.riskScore),
        confidenceScore: Number(sig.snapshot.confidenceScore),
        adjustedScore: Number(sig.snapshot.opportunityScore),
        reasoning,
        ruleEvaluationTrace: "ai-pure executor — Gemini-directed buy",
        newsConsidered: context.promptNews,
      };
      decisions.push(buyDecision);
      simulatedCash -= tradeValue;
    }

    return decisions;
  }

  private async latestSignalsByAsset(assetIds: string[]): Promise<Map<string, SignalSnapshot>> {
    const map = new Map<string, SignalSnapshot>();
    if (assetIds.length === 0) return map;
    const rows = await this.signalRepo.findForAssetsOrderedByDate(assetIds);
    for (const row of rows) {
      if (map.has(row.assetId)) continue;
      map.set(row.assetId, row);
    }
    return map;
  }

  private async latestPricesByAsset(
    assetIds: string[],
  ): Promise<Map<string, { close: number; date: string }>> {
    const map = new Map<string, { close: number; date: string }>();
    if (assetIds.length === 0) return map;
    const rows = await this.historyRepo.latestPriceRows(assetIds);
    for (const row of rows) {
      const date =
        typeof row.date === "string" ? row.date.slice(0, 10) : row.date.toISOString().slice(0, 10);
      map.set(row.asset_id, { close: Number(row.close), date });
    }
    return map;
  }
}

interface ParsedPickerResponse {
  picks: string[];
  rationale: string;
}

function parsePickerResponse(raw: string): ParsedPickerResponse {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const picksRaw = parsed.picks;
  if (!Array.isArray(picksRaw)) {
    throw new Error("picks must be an array");
  }
  const picks: string[] = picksRaw
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .map((s) => s.trim());
  const rationale = typeof parsed.rationale === "string" ? parsed.rationale : "";
  return { picks, rationale };
}

function buildPickerPrompt(portfolio: PaperPortfolio, context: AiDecisionContext): string {
  const rules = portfolio.allocationRulesJson;
  const maxPicks = rules.maxPositions ?? TOP_SIGNAL_COUNT;
  const lines: string[] = [];
  lines.push(`Portfolio: ${portfolio.slug} (${portfolio.displayName})`);
  lines.push(`Currency: ${context.currency}`);
  lines.push(`Cash balance: ${context.currency} ${context.cashBalance.toFixed(2)}`);
  lines.push(`Today (SAST): ${context.todayIso}`);
  lines.push(`Max picks allowed: ${maxPicks}`);
  lines.push("");
  lines.push(
    "You are NOT sizing positions or choosing quantities — a deterministic rules engine handles that downstream.",
  );
  lines.push(
    "Your job: from the candidate universe below, return the high-conviction symbols you'd consider buying TODAY.",
  );
  lines.push(
    "Sell decisions are handled by the rules engine separately — focus only on buy-side picks.",
  );
  lines.push("");

  lines.push(`Current holdings (${context.holdings.length}):`);
  if (context.holdings.length === 0) {
    lines.push("  (none)");
  } else {
    for (const h of context.holdings) {
      lines.push(`  ${h.asset.symbol} (${h.asset.sector ?? "no-sector"})`);
    }
  }
  lines.push("");

  lines.push(`Candidate universe — top ${TOP_SIGNAL_COUNT} signal snapshots (today):`);
  for (const s of context.topSignals) {
    const b = s.snapshot.componentBreakdownJson;
    lines.push(
      `  ${s.asset.symbol} (${s.asset.sector ?? "no-sector"}) — opp ${Number(s.snapshot.opportunityScore).toFixed(0)} / risk ${Number(s.snapshot.riskScore).toFixed(0)} / conf ${Number(s.snapshot.confidenceScore).toFixed(0)} | mom ${b.momentum.score.toFixed(0)} val ${b.valuation.score.toFixed(0)} news ${b.newsSentiment.score.toFixed(0)} sec ${b.sectorTrend.score.toFixed(0)}`,
    );
  }
  lines.push("");

  lines.push(`Recent high/medium-impact news (last ${NEWS_LOOKBACK_HOURS}h):`);
  if (context.newsItems.length === 0) {
    lines.push("  (none)");
  } else {
    for (const n of context.newsItems.slice(0, NEWS_MAX_ARTICLES)) {
      const date = n.publishedAt !== null ? n.publishedAt.toISOString().slice(0, 10) : "?";
      const symbols = n.symbols.length > 0 ? n.symbols.join(",") : "broad";
      lines.push(`  [${date} ${n.impactLevel ?? "?"}] ${symbols}: ${n.event}`);
    }
  }
  lines.push("");

  lines.push("Output JSON in this exact shape (and nothing else):");
  lines.push("{");
  lines.push(`  "picks": ["TICKER1", "TICKER2", ...],`);
  lines.push(`  "rationale": "<overall reasoning incl. at least one risk caveat>"`);
  lines.push("}");
  lines.push("");
  lines.push(
    "Each pick must be a symbol from the candidate universe above. Empty picks array is valid when nothing looks compelling — include the reason in rationale.",
  );

  return lines.join("\n");
}

interface ParsedOverrideVerdict {
  draftIndex: number;
  action: "keep" | "drop" | "replace-qty";
  newQty: number | null;
  reasoning: string;
}

interface ParsedOverrideResponse {
  verdicts: ParsedOverrideVerdict[];
  rationale: string;
}

function applyOverrides(
  draft: Decision[],
  response: ParsedOverrideResponse,
  logger: Logger,
  slug: PaperPortfolioSlug,
  promptNews: NewsProvenance[],
): Decision[] {
  const verdictByIndex = new Map<number, ParsedOverrideVerdict>();
  for (const v of response.verdicts) {
    verdictByIndex.set(v.draftIndex, v);
  }
  const out: Decision[] = [];
  for (let i = 0; i < draft.length; i++) {
    const decision = draft[i];
    const mergedNews = dedupeProvenance([...decision.newsConsidered, ...promptNews]);
    const verdict = verdictByIndex.get(i);
    if (!verdict || verdict.action === "keep") {
      const reasoning = verdict
        ? `[ai-override · keep] ${verdict.reasoning} | overall: ${response.rationale} | original: ${decision.reasoning}`
        : `[ai-override · keep (no verdict)] original: ${decision.reasoning}`;
      out.push({ ...decision, reasoning, newsConsidered: mergedNews } as Decision);
      continue;
    }
    if (verdict.action === "drop") {
      logger.log(
        `${slug}: ai-override dropped ${decision.action} ${decision.symbol} — ${verdict.reasoning}`,
      );
      continue;
    }
    // replace-qty
    if (verdict.newQty === null || verdict.newQty <= 0) {
      logger.warn(
        `${slug}: ai-override replace-qty for ${decision.symbol} missing/invalid newQty — keeping original`,
      );
      out.push({ ...decision, newsConsidered: mergedNews } as Decision);
      continue;
    }
    const newQty = Math.floor(verdict.newQty);
    const newTradeValue = newQty * decision.estimatedPrice;
    const reasoning = `[ai-override · replace-qty ${decision.qty}->${newQty}] ${verdict.reasoning} | overall: ${response.rationale} | original: ${decision.reasoning}`;
    out.push({
      ...decision,
      qty: newQty,
      estimatedTradeValue: newTradeValue,
      reasoning,
      newsConsidered: mergedNews,
    } as Decision);
  }
  return out;
}

function parseOverrideResponse(raw: string): ParsedOverrideResponse {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const verdictsRaw = parsed.verdicts;
  if (!Array.isArray(verdictsRaw)) {
    throw new Error("verdicts must be an array");
  }
  const verdicts: ParsedOverrideVerdict[] = verdictsRaw.map((v, i) => {
    if (typeof v !== "object" || v === null) {
      throw new Error(`verdicts[${i}] must be an object`);
    }
    const rec = v as Record<string, unknown>;
    if (typeof rec.draftIndex !== "number" || !Number.isInteger(rec.draftIndex)) {
      throw new Error(`verdicts[${i}].draftIndex must be an integer`);
    }
    const action = rec.action;
    if (action !== "keep" && action !== "drop" && action !== "replace-qty") {
      throw new Error(`verdicts[${i}].action must be "keep", "drop", or "replace-qty"`);
    }
    const newQty =
      typeof rec.newQty === "number" && Number.isFinite(rec.newQty) ? rec.newQty : null;
    const reasoning = typeof rec.reasoning === "string" ? rec.reasoning : "";
    return { draftIndex: rec.draftIndex, action, newQty, reasoning };
  });
  const rationale = typeof parsed.rationale === "string" ? parsed.rationale : "";
  return { verdicts, rationale };
}

function buildOverridePrompt(
  portfolio: PaperPortfolio,
  context: AiDecisionContext,
  draft: Decision[],
): string {
  const lines: string[] = [];
  lines.push(`Portfolio: ${portfolio.slug} (${portfolio.displayName})`);
  lines.push(`Currency: ${context.currency}`);
  lines.push(`Cash balance: ${context.currency} ${context.cashBalance.toFixed(2)}`);
  lines.push(`Today (SAST): ${context.todayIso}`);
  lines.push("");

  lines.push(`Draft trade decisions from the rules engine (${draft.length}):`);
  draft.forEach((d, i) => {
    const tradeValue = d.estimatedTradeValue.toFixed(2);
    lines.push(
      `  [#${i}] ${d.action.toUpperCase()} ${d.qty} ${d.symbol} @ ${d.estimatedPrice.toFixed(2)} = ${context.currency} ${tradeValue}. opp ${d.opportunityScore.toFixed(0)} risk ${d.riskScore.toFixed(0)} conf ${d.confidenceScore.toFixed(0)}. ${d.reasoning}`,
    );
  });
  lines.push("");

  lines.push(`Current holdings (${context.holdings.length}):`);
  if (context.holdings.length === 0) {
    lines.push("  (none)");
  } else {
    for (const h of context.holdings) {
      const qty = Number(h.holding.quantity);
      const avg = Number(h.holding.averageBuyPrice);
      const cur = h.latestPrice ?? Number(h.holding.currentPrice);
      const plPct = avg > 0 ? ((cur - avg) / avg) * 100 : 0;
      lines.push(
        `  ${h.asset.symbol} — qty ${qty}, avg ${avg.toFixed(2)}, current ${cur.toFixed(2)}, P/L ${plPct >= 0 ? "+" : ""}${plPct.toFixed(2)}%`,
      );
    }
  }
  lines.push("");

  lines.push(`Recent high/medium-impact news (last ${NEWS_LOOKBACK_HOURS}h):`);
  if (context.newsItems.length === 0) {
    lines.push("  (none)");
  } else {
    for (const n of context.newsItems.slice(0, NEWS_MAX_ARTICLES)) {
      const date = n.publishedAt !== null ? n.publishedAt.toISOString().slice(0, 10) : "?";
      const sentimentLabel =
        n.sentiment === null
          ? "?"
          : n.sentiment > 0
            ? `+${n.sentiment.toFixed(2)}`
            : n.sentiment.toFixed(2);
      const symbols = n.symbols.length > 0 ? n.symbols.join(",") : "broad";
      lines.push(`  [${date} ${n.impactLevel ?? "?"} ${sentimentLabel}] ${symbols}: ${n.event}`);
    }
  }
  lines.push("");

  lines.push("For each draft decision, return a verdict:");
  lines.push('  - "keep": accept the rules-engine decision as-is');
  lines.push('  - "drop": reject this trade entirely');
  lines.push('  - "replace-qty": keep the action and symbol but change the quantity (set newQty)');
  lines.push("");
  lines.push("Output JSON in this exact shape (and nothing else):");
  lines.push("{");
  lines.push(`  "verdicts": [`);
  lines.push(
    `    {"draftIndex": <int>, "action": "keep"|"drop"|"replace-qty", "newQty": <int or null>, "reasoning": "<1-2 sentences>"}`,
  );
  lines.push("  ],");
  lines.push(`  "rationale": "<overall reasoning incl. at least one risk caveat>"`);
  lines.push("}");

  return lines.join("\n");
}

function skipResult(slug: PaperPortfolioSlug, reason: string): ExecutionResult {
  return {
    portfolioSlug: slug,
    buysExecuted: 0,
    sellsExecuted: 0,
    cashDeployed: 0,
    cashRaised: 0,
    skipped: true,
    skipReason: reason,
  };
}

function buildPurePrompt(portfolio: PaperPortfolio, context: AiDecisionContext): string {
  const rules = portfolio.allocationRulesJson;
  const lines: string[] = [];
  lines.push(`Portfolio: ${portfolio.slug} (${portfolio.displayName})`);
  lines.push(`Currency: ${context.currency}`);
  lines.push(`Cash balance: ${context.currency} ${context.cashBalance.toFixed(2)}`);
  lines.push(`Today (SAST): ${context.todayIso}`);
  lines.push("");
  lines.push("Allocation rules:");
  lines.push(`- Max positions: ${rules.maxPositions ?? "no cap"}`);
  lines.push(`- Max % per position: ${rules.maxPercentPerPosition ?? "no cap"}`);
  lines.push(`- Max % per sector: ${rules.maxPercentPerSector ?? "no cap"}`);
  lines.push(`- Cash floor %: ${rules.cashFloorPercent}`);
  lines.push(`- Confidence floor: ${rules.confidenceFloor}`);
  if (rules.sectorTilt) {
    lines.push(
      `- Sector tilt: bonus +${rules.sectorTilt.bonus} for [${rules.sectorTilt.sectors.join(", ")}]`,
    );
  }
  if (rules.preferLeveragedEtfs) {
    lines.push("- Prefer leveraged ETFs: yes");
  }
  lines.push("");

  lines.push(`Current holdings (${context.holdings.length}):`);
  if (context.holdings.length === 0) {
    lines.push("  (none)");
  } else {
    for (const h of context.holdings) {
      const qty = Number(h.holding.quantity);
      const avg = Number(h.holding.averageBuyPrice);
      const cur = h.latestPrice ?? Number(h.holding.currentPrice);
      const plPct = avg > 0 ? ((cur - avg) / avg) * 100 : 0;
      lines.push(
        `  ${h.asset.symbol} (${h.asset.name}) — qty ${qty}, avg ${avg.toFixed(2)}, current ${cur.toFixed(2)}, P/L ${plPct >= 0 ? "+" : ""}${plPct.toFixed(2)}%`,
      );
    }
  }
  lines.push("");

  lines.push(`Top ${TOP_SIGNAL_COUNT} signal snapshots (today):`);
  for (const s of context.topSignals) {
    const b = s.snapshot.componentBreakdownJson;
    lines.push(
      `  ${s.asset.symbol} (${s.asset.sector ?? "no-sector"}) — opp ${Number(s.snapshot.opportunityScore).toFixed(0)} / risk ${Number(s.snapshot.riskScore).toFixed(0)} / conf ${Number(s.snapshot.confidenceScore).toFixed(0)} | mom ${b.momentum.score.toFixed(0)} val ${b.valuation.score.toFixed(0)} news ${b.newsSentiment.score.toFixed(0)} sec ${b.sectorTrend.score.toFixed(0)} | price ${s.latestPrice.toFixed(2)} (${s.latestPriceDate})`,
    );
  }
  lines.push("");

  lines.push(`Recent high/medium-impact news (last ${NEWS_LOOKBACK_HOURS}h):`);
  if (context.newsItems.length === 0) {
    lines.push("  (none)");
  } else {
    for (const n of context.newsItems.slice(0, NEWS_MAX_ARTICLES)) {
      const date = n.publishedAt !== null ? n.publishedAt.toISOString().slice(0, 10) : "?";
      const sentimentLabel =
        n.sentiment === null
          ? "?"
          : n.sentiment > 0
            ? `+${n.sentiment.toFixed(2)}`
            : n.sentiment.toFixed(2);
      const symbols = n.symbols.length > 0 ? n.symbols.join(",") : "broad";
      lines.push(
        `  [${date} ${n.impactLevel ?? "?"} ${sentimentLabel}] ${symbols}: ${n.event} — ${n.shortTermImplication ?? ""}`,
      );
    }
  }
  lines.push("");

  lines.push("Output JSON in this exact shape (and nothing else):");
  lines.push("{");
  lines.push(`  "decisions": [`);
  lines.push(
    `    {"action": "buy" | "sell", "symbol": "<TICKER>", "qty": <integer>, "reasoning": "<1-3 sentences>"}`,
  );
  lines.push("  ],");
  lines.push(`  "rationale": "<overall reasoning incl. at least one risk caveat>"`);
  lines.push("}");
  lines.push("");
  lines.push(
    "If no action makes sense today, return an empty decisions array with a rationale explaining why.",
  );

  return lines.join("\n");
}

function parseAiResponse(raw: string): ParsedAiResponse {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const decisionsRaw = parsed.decisions;
  if (!Array.isArray(decisionsRaw)) {
    throw new Error("decisions must be an array");
  }
  const decisions: ParsedAiDecision[] = decisionsRaw.map((d, i) => {
    if (typeof d !== "object" || d === null) {
      throw new Error(`decisions[${i}] must be an object`);
    }
    const rec = d as Record<string, unknown>;
    const action = rec.action;
    if (action !== "buy" && action !== "sell") {
      throw new Error(`decisions[${i}].action must be "buy" or "sell"`);
    }
    if (typeof rec.symbol !== "string") {
      throw new Error(`decisions[${i}].symbol must be a string`);
    }
    if (typeof rec.qty !== "number" || !Number.isFinite(rec.qty)) {
      throw new Error(`decisions[${i}].qty must be a finite number`);
    }
    const reasoning = typeof rec.reasoning === "string" ? rec.reasoning : "";
    return { action, symbol: rec.symbol, qty: rec.qty, reasoning };
  });
  const rationale = typeof parsed.rationale === "string" ? parsed.rationale : "";
  return { decisions, rationale };
}

function isoDaysDiff(earlierIso: string, laterIso: string): number {
  const a = new Date(`${earlierIso}T00:00:00.000Z`).getTime();
  const b = new Date(`${laterIso}T00:00:00.000Z`).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

export type { ExecutorStrategy, SignalComponentBreakdown };
