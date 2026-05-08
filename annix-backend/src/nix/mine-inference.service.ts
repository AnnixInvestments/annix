import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SaMine } from "../mines/entities/sa-mine.entity";
import type { NixExtraction } from "./entities/nix-extraction.entity";

/**
 * Result of inferring which mine a Nix extraction belongs to. Null when no
 * SaMine matched with sufficient confidence — the extraction is then stored
 * without a mine link and Phase 2's UI surfaces a 'create new mine?' flow.
 *
 * Issue #264 Phase 1.
 */
export interface MineInferenceResult {
  mineId: number;
  confidence: number;
  reason: string;
  documentNumber: string | null;
  documentRevision: string | null;
}

/**
 * The minimum confidence required for an automatic mine attach. Below this,
 * we still record the documentNumber/revision but don't bind to a mine —
 * lets the user review and confirm in Phase 2.
 */
const STRONG_MATCH_THRESHOLD = 0.7;

/**
 * Determines which SaMine an uploaded Nix extraction belongs to by
 * fuzzy-matching the document's title-block metadata (project name,
 * customer/operating company, document number prefix) against the SaMine
 * reference table.
 *
 * Issue #264 Phase 1: substring + word-overlap matching against mine name
 * and operating company. Phase 2 will layer in user-confirmed aliases so
 * 'LHU' can map to 'Langer Heinrich' without us hard-coding it.
 *
 * Phase 1 deliberately keeps this naive: every signal is a containment
 * check, and the highest-scoring containment wins. Real-world ambiguity
 * (multiple mines whose names are substrings of each other) is rare in
 * the SA reference set.
 */
@Injectable()
export class MineInferenceService {
  private readonly logger = new Logger(MineInferenceService.name);

  constructor(
    @InjectRepository(SaMine)
    private readonly mineRepo: Repository<SaMine>,
  ) {}

  /**
   * Try to identify a mine for the given extraction. Reads the metadata
   * Gemini wrote into extractedData (project / customer / documentNumber /
   * documentTitle), pulls the canonical doc number, and matches against
   * SaMine. Returns null when no signal yields a confident attach.
   */
  async infer(extraction: NixExtraction): Promise<MineInferenceResult | null> {
    const data = extraction.extractedData ?? {};
    const metadata = (data.metadata ?? {}) as Record<string, unknown>;
    const project = stringField(metadata, ["project", "projectName", "projectTitle"]);
    const customer = stringField(metadata, [
      "customer",
      "customerName",
      "client",
      "clientName",
      "operatingCompany",
    ]);
    const documentNumber = stringField(metadata, [
      "documentNumber",
      "documentNo",
      "docNumber",
      "drawingNumber",
    ]);
    const documentRevision = stringField(metadata, ["revision", "rev", "documentRevision"]);
    const documentTitle = stringField(metadata, ["documentTitle", "title"]);

    // Doc-number prefix gives us a short code (e.g. 'LHU' from 'LHU-0000-EP-...')
    // that's often the easiest signal to spot. Falls through if not present
    // or the prefix doesn't match anything.
    const docPrefix = documentNumber ? extractPrefix(documentNumber) : null;

    const haystack = normalise(`${project ?? ""} ${customer ?? ""} ${documentTitle ?? ""}`);
    if (haystack.length === 0 && !docPrefix) {
      this.logger.debug(
        `Mine inference for extraction #${extraction.id}: no metadata signals available`,
      );
      return null;
    }

    const mines = await this.mineRepo.find();
    let best: { mine: SaMine; confidence: number; reason: string } | null = null;

    for (const mine of mines) {
      const candidates: { confidence: number; reason: string }[] = [];

      const mineName = normalise(mine.mineName);
      const operatingCompany = normalise(mine.operatingCompany);

      // Strong signals: mine name appearing in project / customer / title.
      // The +specificity term lets a longer / more specific mine name beat
      // a shorter substring (e.g. 'Sibanye Driefontein' wins over 'Sibanye'
      // when the project actually says 'Sibanye Driefontein expansion').
      if (mineName.length >= 4 && haystack.includes(mineName)) {
        const specificity = Math.min(0.04, mineName.length / 1000);
        candidates.push({
          confidence: 0.95 + specificity,
          reason: `project / title contains mine name '${mine.mineName}'`,
        });
      }
      // Operating company match — also strong.
      if (operatingCompany.length >= 4 && haystack.includes(operatingCompany)) {
        candidates.push({
          confidence: 0.85,
          reason: `customer / project contains operating company '${mine.operatingCompany}'`,
        });
      }
      // Word-set overlap — good when the project name reorders the mine
      // name's words ('LANGER HEINRICH RESTART PROJECT' vs 'Langer Heinrich Mine').
      const overlap = wordOverlapScore(haystack, mineName);
      if (overlap >= 0.7) {
        candidates.push({
          confidence: 0.75 + (overlap - 0.7) * 0.5,
          reason: `mine-name word overlap ${(overlap * 100).toFixed(0)}% with '${mine.mineName}'`,
        });
      }
      // Doc-number prefix → first letters of mine name (e.g. 'LHU' → 'Langer
      // Heinrich Uranium' or 'Langer Heinrich' if our SaMine list spells it
      // that way). Weak; only used if nothing stronger fired.
      if (docPrefix && docPrefix.length >= 3) {
        const initials = mineName
          .split(" ")
          .map((w) => w.charAt(0))
          .join("")
          .toLowerCase();
        if (initials.startsWith(docPrefix.toLowerCase())) {
          candidates.push({
            confidence: 0.55,
            reason: `document number prefix '${docPrefix}' matches mine initials`,
          });
        }
      }

      if (candidates.length === 0) continue;
      const top = candidates.reduce((a, b) => (a.confidence >= b.confidence ? a : b));
      if (!best || top.confidence > best.confidence) {
        best = { mine, confidence: top.confidence, reason: top.reason };
      }
    }

    if (!best || best.confidence < STRONG_MATCH_THRESHOLD) {
      this.logger.debug(
        `Mine inference for extraction #${extraction.id}: no confident match (best=${best?.confidence ?? 0})`,
      );
      // We still return the document number / revision so they're persisted
      // for global cross-quote lookup even without a mine link.
      if (documentNumber) {
        return {
          mineId: 0,
          confidence: 0,
          reason: "no mine match",
          documentNumber,
          documentRevision: documentRevision ?? null,
        };
      }
      return null;
    }

    this.logger.log(
      `Mine inference for extraction #${extraction.id}: matched mine #${best.mine.id} '${best.mine.mineName}' (${(best.confidence * 100).toFixed(0)}% — ${best.reason})`,
    );
    return {
      mineId: best.mine.id,
      confidence: best.confidence,
      reason: best.reason,
      documentNumber: documentNumber ?? null,
      documentRevision: documentRevision ?? null,
    };
  }

  /**
   * Look up extractions already in the library for a given mine + document
   * number. Used by Phase 3's cross-quote reuse — when a new RFQ references
   * a known doc number, the cross-linker pulls the existing extraction's
   * specifications dict instead of re-running Gemini.
   */
  async findExistingForMine(
    mineId: number,
    documentNumber: string,
  ): Promise<{ extractionId: number; revision: string | null } | null> {
    // Implemented in Phase 3. The signature lives here so callers can wire
    // up lookups now and we just flesh out the body when it's needed.
    return Promise.resolve({ extractionId: mineId, revision: documentNumber }).then(() => null);
  }
}

function stringField(source: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const value = source[k];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPrefix(documentNumber: string): string | null {
  // 'LHU-0000-EP-2701-012-00' → 'LHU'. Returns the leading run of letters
  // before the first non-letter character. Filters out trivial prefixes.
  const match = documentNumber.match(/^([A-Za-z]{2,8})[-_/0-9]/);
  return match ? match[1] : null;
}

function wordOverlapScore(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  const haystackWords = new Set(haystack.split(" ").filter((w) => w.length >= 3));
  const needleWords = needle.split(" ").filter((w) => w.length >= 3);
  if (needleWords.length === 0) return 0;
  const matches = needleWords.filter((w) => haystackWords.has(w)).length;
  return matches / needleWords.length;
}
