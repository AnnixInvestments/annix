import { Injectable, Logger } from "@nestjs/common";
import { MineRegistryService } from "../mines/mine-registry.service";
import { NixExtraction } from "./entities/nix-extraction.entity";
import { NixExtractionRepository } from "./nix-extraction.repository";

/**
 * Result of inferring which mine a Nix extraction belongs to. Null when no
 * SaMine matched with sufficient confidence — the extraction is then stored
 * without a mine link and Phase 2's UI surfaces a 'create new mine?' flow.
 *
 * Issue #264 Phase 1.
 */
export interface MineInferenceResult {
  mineId: number;
  mineCountry: string | null;
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
    private readonly mineRegistry: MineRegistryService,
    private readonly extractionRepo: NixExtractionRepository,
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
    const fromFilename = extractFromFilename(extraction.documentName);
    // Sanitise metadata first; if Gemini hallucinated a filename-shaped
    // value the sanitiser drops it and we fall back to the filename helper
    // (which already extracts a doc-number-shaped substring).
    const documentNumber =
      sanitiseDocNumber(
        stringField(metadata, ["documentNumber", "documentNo", "docNumber", "drawingNumber"]),
      ) ?? sanitiseDocNumber(fromFilename.documentNumber);
    const documentRevision =
      sanitiseRevision(stringField(metadata, ["revision", "rev", "documentRevision"])) ??
      sanitiseRevision(fromFilename.revision);
    const documentTitle = stringField(metadata, ["documentTitle", "title"]);

    // Doc-number prefix gives us a short code (e.g. 'LHU' from 'LHU-0000-EP-...')
    // that's often the easiest signal to spot. Falls through if not present
    // or the prefix doesn't match anything.
    const docPrefix = documentNumber ? extractPrefix(documentNumber) : null;

    const haystack = normalise(`${project ?? ""} ${customer ?? ""} ${documentTitle ?? ""}`);
    // We still run the mine-matching loop when the haystack is empty
    // but a documentNumber is present, because aliases can match
    // against the documentNumber alone (e.g. an empty title block but
    // a filename of "J528-09-23-JW559" where 'J528' is a Mogalakwena
    // alias). The early-exit only fires when there's no signal at all.
    if (haystack.length === 0 && !docPrefix && !documentNumber) {
      this.logger.debug(
        `Mine inference for extraction #${extraction.id}: no metadata signals available`,
      );
      return null;
    }

    const mines = await this.mineRegistry.allMines();
    let best: {
      mine: { id: number; mineName: string; operatingCompany: string; country: string };
      confidence: number;
      reason: string;
    } | null = null;

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
      // Alias matches — admin-configured identifiers (project names,
      // doc-number prefixes, colloquial names). Scored just below
      // mineName direct match (0.92) so a clean mine-name hit still
      // wins when both fire. Issue #264 Phase 2.
      const rawAliases = mine.aliases;
      const aliases = rawAliases ?? [];
      // Doc-number prefix string for prefix-style aliases. We
      // normalise the full documentNumber rather than relying on
      // `extractPrefix` (which only catches letter-only prefixes
      // ≥ 2 chars and so misses "J528" / "JW559"-style tokens).
      const normalisedDocNumber = documentNumber ? normalise(documentNumber) : null;
      for (const alias of aliases) {
        const normalisedAlias = normalise(alias);
        if (normalisedAlias.length < 3) continue;
        if (haystack.includes(normalisedAlias)) {
          candidates.push({
            confidence: 0.92,
            reason: `alias '${alias}' present in project / title / customer`,
          });
        }
        // Doc-number-token aliases (e.g. 'J528', 'JW559'). Match
        // when the alias appears anywhere inside the normalised
        // document number — that catches both "J528-09-23-JW559"
        // (prefix) and "MWP1-J528-rev3" (mid-string).
        if (normalisedDocNumber?.includes(normalisedAlias)) {
          candidates.push({
            confidence: 0.92,
            reason: `document number prefix '${alias}' matches alias '${alias}'`,
          });
        }
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
      // Heinrich Uranium' = 'lhum'). Strong signal when the prefix is at
      // least 3 chars and corresponds letter-for-letter to the mine's
      // initials — often the customer's filing convention, but a 3-char prefix
      // is weak enough to collide by chance, so it sits BELOW the strong-match
      // threshold: it surfaces as a suggestion for the user to confirm rather
      // than silently binding a mineId on the prefix alone (issue #430).
      if (docPrefix && docPrefix.length >= 3) {
        const initials = mineName
          .split(" ")
          .map((w) => w.charAt(0))
          .join("")
          .toLowerCase();
        if (initials.startsWith(docPrefix.toLowerCase())) {
          candidates.push({
            confidence: 0.65,
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
          mineCountry: null,
          confidence: 0,
          reason: "no mine match",
          documentNumber,
          documentRevision: documentRevision ?? null,
        };
      }
      return null;
    }

    this.logger.log(
      `Mine inference for extraction #${extraction.id}: matched ${best.mine.country} mine #${best.mine.id} '${best.mine.mineName}' (${(best.confidence * 100).toFixed(0)}% — ${best.reason})`,
    );
    return {
      mineId: best.mine.id,
      mineCountry: best.mine.country,
      confidence: best.confidence,
      reason: best.reason,
      documentNumber: documentNumber ?? null,
      documentRevision: documentRevision ?? null,
    };
  }

  /**
   * High-level convenience: given an upload's filename, derive a candidate
   * document number and look up any matching completed extraction. Returns
   * the full source row so callers can clone its extractedData / items /
   * rawText into the new extraction (the actual Phase 3 reuse).
   *
   * Returns null when the filename has no doc-number-shaped token, or when
   * no completed extraction matches that doc number.
   */
  async findReuseTargetForUpload(
    documentName: string | null | undefined,
    mineId: number | null = null,
  ): Promise<{
    source: NixExtraction;
    documentNumber: string;
    documentRevision: string | null;
    mineId: number | null;
  } | null> {
    if (!documentName) return null;
    const { documentNumber } = extractFromFilename(documentName);
    if (!documentNumber) return null;
    const lookup = await this.findExistingForMine(mineId, documentNumber);
    if (!lookup) return null;
    const source = await this.extractionRepo.findById(lookup.extractionId);
    if (!source) return null;
    return {
      source,
      documentNumber,
      documentRevision: lookup.revision,
      mineId: lookup.mineId,
    };
  }

  /**
   * Look up an existing completed extraction by document number, optionally
   * scoped to a known mine. Used by Phase 3's cross-quote reuse — when a
   * new RFQ references a known doc number, the cross-linker pulls the
   * existing extraction's specifications dict instead of re-running Gemini.
   *
   * mineId null/0 = global lookup (any mine). Most-recent revision wins;
   * when revisions tie, newest createdAt breaks the tie. Only completed
   * extractions are returned — half-finished or failed extractions can't
   * be reused.
   */
  async findExistingForMine(
    mineId: number | null,
    documentNumber: string,
  ): Promise<{
    extractionId: number;
    revision: string | null;
    mineId: number | null;
  } | null> {
    if (!documentNumber) return null;

    const found = await this.extractionRepo.findLatestCompletedByDocNumber(documentNumber, mineId);
    if (!found) return null;

    this.logger.log(
      `findExistingForMine hit: mine=${mineId ?? "any"} doc=${documentNumber} → extraction #${found.id} (rev ${found.documentRevision ?? "?"})`,
    );

    return {
      extractionId: found.id,
      revision: found.documentRevision ?? null,
      mineId: found.mineId ?? null,
    };
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

/**
 * Strips title-block noise that Gemini sometimes mis-classifies as a real
 * document number (e.g. the full filename, sheet titles with spaces, or a
 * 'Drawing No: TBC' placeholder). A genuine doc number is a compact
 * alphanumeric token, optionally with hyphens / underscores / slashes — no
 * spaces, no file extensions, no descriptive words.
 *
 * Returns null when the candidate fails the shape check so the supersession
 * + cross-quote-reuse logic don't false-positive on filename-shaped strings.
 */
function sanitiseDocNumber(num: string | null | undefined): string | null {
  if (!num) return null;
  const trimmed = num.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.includes(" ")) return null;
  if (/\.(pdf|docx?|xlsx?|jpe?g|png|tiff?|dwg|dxf|cad|sldprt|sldasm)$/i.test(trimmed)) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{2,}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Filters revision strings to those that look like actual revisions —
 * compact alphanumerics like '00', '03', 'AF', 'B', optionally with a
 * 'Rev ' / 'Rev. ' / 'Revision ' prefix. Rejects 'MTO: 01', 'Multiple
 * Sheets', 'Sheet 1 Of 9' and similar title-block noise that Gemini
 * sometimes returns for revision when no actual rev field exists.
 */
function sanitiseRevision(rev: string | null | undefined): string | null {
  if (!rev) return null;
  const trimmed = rev.trim();
  if (trimmed.length === 0) return null;
  const stripped = trimmed.replace(/^rev(?:ision)?\.?\s+/i, "").trim();
  if (!/^[A-Za-z0-9]{1,6}$/.test(stripped)) return null;
  return trimmed;
}

function extractFromFilename(filename: string | null | undefined): {
  documentNumber: string | null;
  revision: string | null;
} {
  if (!filename) return { documentNumber: null, revision: null };
  const stem = filename.replace(/\.[A-Za-z0-9]+$/, "");
  const matched = stem.match(/[A-Z0-9]+(?:-[A-Z0-9]+)+/gi);
  const candidates: string[] = matched ? Array.from(matched) : [];
  const documentNumber =
    candidates
      .filter((c) => c.length >= 6 && /[0-9]/.test(c))
      .sort((a, b) => b.length - a.length)[0] ?? null;
  const revMatch = stem.match(/\bRev\.?\s+([A-Z0-9]{1,4})\b/i);
  const revision = revMatch ? revMatch[1] : null;
  return { documentNumber, revision };
}

function wordOverlapScore(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  const haystackWords = new Set(haystack.split(" ").filter((w) => w.length >= 3));
  const needleWords = needle.split(" ").filter((w) => w.length >= 3);
  if (needleWords.length === 0) return 0;
  const matches = needleWords.filter((w) => haystackWords.has(w)).length;
  return matches / needleWords.length;
}
