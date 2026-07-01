import { Injectable, Logger } from "@nestjs/common";
import { NixClarification } from "../entities/nix-clarification.entity";
import { LearningSource, LearningType, NixLearning } from "../entities/nix-learning.entity";
import { NixClarificationRepository } from "../nix-clarification.repository";
import { NixLearningRepository } from "../nix-learning.repository";
import {
  feedbackLearningRow,
  feedbackPatternKey,
  type NixFeedbackPayload,
} from "./learning-feedback.util";

/**
 * Trust context for a learning write, derived from the request's authenticated
 * identity (never from a client-supplied body field). Authenticated writes are
 * trusted (`quarantined:false`, USER_CORRECTION); anonymous writes are
 * quarantined and tagged with a one-way IP hash for audit. Defaults to a trusted
 * system write so internal callers (e.g. patchExtractionItem auto-corrections)
 * are unaffected.
 */
export interface NixLearningWriteTrust {
  ownerUserId: number | null;
  quarantined: boolean;
  sourceIpHash: string | null;
}

export const TRUSTED_LEARNING_WRITE: NixLearningWriteTrust = {
  ownerUserId: null,
  quarantined: false,
  sourceIpHash: null,
};

// Extracted from NixService (#430 Phase 4) — the Nix learning system: relevance
// scoring, clarification-driven learning, admin-seeded rules, and the trust-lane
// isolated correction / feedback writes.
@Injectable()
export class NixLearningService {
  private readonly logger = new Logger(NixLearningService.name);

  constructor(
    private readonly learningRepo: NixLearningRepository,
    private readonly clarificationRepo: NixClarificationRepository,
  ) {}

  async filterByRelevance(items: Array<any>, _productTypes?: string[]): Promise<Array<any>> {
    const learningRules = await this.learningRepo.findActiveRelevanceRules();

    return items.map((item) => ({
      ...item,
      confidence: this.calculateItemConfidence(item, learningRules),
    }));
  }

  calculateItemConfidence(item: any, rules: NixLearning[]): number {
    let confidence = 0.5;

    rules.forEach((rule) => {
      if (item.description?.toLowerCase().includes(rule.patternKey.toLowerCase())) {
        confidence = Math.min(1, confidence + 0.1 * rule.confidence);
      }
    });

    return confidence;
  }

  calculateOverallRelevance(items: Array<any>): number {
    if (items.length === 0) return 0;

    const totalConfidence = items.reduce((sum, item) => sum + (item.confidence || 0.5), 0);
    return totalConfidence / items.length;
  }

  async learnFromClarification(
    clarification: NixClarification,
    trust: NixLearningWriteTrust = TRUSTED_LEARNING_WRITE,
  ): Promise<void> {
    if (!clarification.responseText || !clarification.context?.itemDescription) {
      return;
    }

    const writeSource = trust.quarantined
      ? LearningSource.ANON_UNVERIFIED
      : LearningSource.USER_CORRECTION;

    // Same trust-lane isolation as recordCorrection: an anonymous answer writes
    // a quarantined row (never feeds a prompt) and can never mutate a trusted
    // row; an authenticated answer stays in the trusted lane.
    const existing = await this.learningRepo.findCorrectionByPatternKey(
      clarification.context.itemDescription,
    );
    const existingRule =
      existing && (existing.quarantined === true) === trust.quarantined ? existing : null;

    if (existingRule) {
      existingRule.learnedValue = clarification.responseText;
      existingRule.confirmationCount += 1;
      existingRule.confidence = Math.min(1, existingRule.confidence + 0.05);
      existingRule.source = writeSource;
      existingRule.quarantined = trust.quarantined;
      if (trust.sourceIpHash != null) {
        existingRule.sourceIpHash = trust.sourceIpHash;
      }
      await this.learningRepo.save(existingRule);
    } else {
      await this.learningRepo.create({
        learningType: LearningType.CORRECTION,
        source: writeSource,
        patternKey: clarification.context.itemDescription,
        originalValue: clarification.context.extractedValue,
        learnedValue: clarification.responseText,
        confidence: 0.6,
        confirmationCount: 1,
        quarantined: trust.quarantined,
        sourceIpHash: trust.sourceIpHash ?? undefined,
      });
    }

    clarification.usedForLearning = true;
    await this.clarificationRepo.save(clarification);
  }

  async seedAdminRule(
    category: string,
    patternKey: string,
    learnedValue: string,
    applicableProducts?: string[],
  ): Promise<NixLearning> {
    return this.learningRepo.create({
      learningType: LearningType.RELEVANCE_RULE,
      source: LearningSource.ADMIN_SEEDED,
      category,
      patternKey,
      learnedValue,
      applicableProducts,
      confidence: 0.9,
      confirmationCount: 1,
      isActive: true,
    });
  }

  async adminLearningRules(): Promise<NixLearning[]> {
    return this.learningRepo.findAdminSeededOrdered();
  }

  async recordCorrection(
    correction: {
      extractionId?: number;
      itemDescription: string;
      fieldName: string;
      originalValue: string | number | null;
      correctedValue: string | number;
      userId?: number;
    },
    trust: NixLearningWriteTrust = TRUSTED_LEARNING_WRITE,
  ): Promise<{ success: boolean }> {
    const patternKey = `${correction.itemDescription}::${correction.fieldName}`;
    const writeSource = trust.quarantined
      ? LearningSource.ANON_UNVERIFIED
      : LearningSource.USER_CORRECTION;

    // Only ever read/mutate a row in the WRITER'S OWN trust lane: an anonymous
    // (quarantined) write must never touch a trusted row (that's the poison
    // vector), and a trusted write must never adopt a quarantined row's state.
    const existing = await this.learningRepo.findCorrectionByPatternKey(patternKey);
    const existingRule =
      existing && (existing.quarantined === true) === trust.quarantined ? existing : null;

    if (existingRule) {
      if (existingRule.learnedValue === String(correction.correctedValue)) {
        existingRule.confirmationCount += 1;
        existingRule.confidence = Math.min(1, existingRule.confidence + 0.05);
      } else {
        existingRule.learnedValue = String(correction.correctedValue);
        existingRule.originalValue =
          correction.originalValue != null ? String(correction.originalValue) : undefined;
        existingRule.confirmationCount = 1;
        existingRule.confidence = 0.6;
      }
      existingRule.source = writeSource;
      existingRule.quarantined = trust.quarantined;
      if (trust.sourceIpHash != null) {
        existingRule.sourceIpHash = trust.sourceIpHash;
      }
      await this.learningRepo.save(existingRule);
      this.logger.log(`Updated learning rule for pattern: ${patternKey}`);
    } else {
      await this.learningRepo.create({
        learningType: LearningType.CORRECTION,
        source: writeSource,
        patternKey,
        category: correction.fieldName,
        originalValue:
          correction.originalValue != null ? String(correction.originalValue) : undefined,
        learnedValue: String(correction.correctedValue),
        confidence: 0.6,
        confirmationCount: 1,
        isActive: true,
        quarantined: trust.quarantined,
        sourceIpHash: trust.sourceIpHash ?? undefined,
      });
      this.logger.log(`Created new learning rule for pattern: ${patternKey}`);
    }

    return { success: true };
  }

  // Issue #263: batch feedback posted at RFQ submit time — the diff
  // between what Nix extracted and what the customer ended up with at
  // Step 3 (field corrections, deleted rows, manually added rows).
  // One NixLearning row per correction; re-submitting the same diff
  // confirms the existing row instead of duplicating it.
  async recordFeedbackBatch(
    payload: NixFeedbackPayload,
    trust: NixLearningWriteTrust = TRUSTED_LEARNING_WRITE,
  ): Promise<{ success: boolean; recorded: number }> {
    const writeSource = trust.quarantined
      ? LearningSource.ANON_UNVERIFIED
      : LearningSource.USER_CORRECTION;
    const results = await Promise.all(
      (payload.corrections ?? []).map(async (correction) => {
        const patternKey = feedbackPatternKey(payload.extractionId, correction);
        const existingRow = await this.learningRepo.findCorrectionByPatternKey(patternKey);
        const existing =
          existingRow && (existingRow.quarantined === true) === trust.quarantined
            ? existingRow
            : null;
        if (existing) {
          existing.confirmationCount += 1;
          existing.confidence = 1;
          existing.source = writeSource;
          existing.quarantined = trust.quarantined;
          if (trust.sourceIpHash != null) {
            existing.sourceIpHash = trust.sourceIpHash;
          }
          await this.learningRepo.save(existing);
          return existing;
        }
        return this.learningRepo.create({
          ...feedbackLearningRow(payload, correction),
          source: writeSource,
          quarantined: trust.quarantined,
          sourceIpHash: trust.sourceIpHash ?? undefined,
        });
      }),
    );
    this.logger.log(
      `Recorded ${results.length} Step 3 feedback correction(s) for extraction ${payload.extractionId ?? "n/a"}`,
    );
    return { success: true, recorded: results.length };
  }
}
