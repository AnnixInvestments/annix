import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { ExtractionStatus, NixExtraction } from "./entities/nix-extraction.entity";

export type RevisionComparison = "older" | "newer" | "same" | "unknown";

/**
 * Outcome of running an incoming extraction through the supersession check.
 * The frontend uses this to decide what to show the user (silent / toast /
 * modal warning).
 *
 * - first    no other extraction in the library matches this doc number for
 *            the inferred mine — silent, this becomes the canonical record.
 * - same     same revision is already on file — silent, the new extraction
 *            joins the cluster but doesn't change which row is canonical.
 *            (Phase 3 reuse usually short-circuits before we get here.)
 * - newer    the new extraction is a higher rev than what was on file. The
 *            old canonical has been flipped to is_latest_revision = false
 *            and superseded_by_extraction_id pointing at the new one.
 *            Frontend shows a green toast 'Updated rev → NN, archived old'.
 * - older    the new extraction is a lower rev than what's on file. We
 *            DON'T auto-supersede the canonical — instead we mark the new
 *            extraction is_latest_revision = false and surface a modal so
 *            the user explicitly decides whether to quote against this old
 *            rev or switch to the latest.
 * - unknown  revisions can't be ordered (mixed numeric/alpha, weird
 *            schemes). Modal: 'we don't know which is newer — pick'.
 */
export type SupersessionVerdict =
  | { action: "first" }
  | { action: "same"; canonicalExtractionId: number; canonicalRevision: string | null }
  | {
      action: "duplicate-in-session";
      canonicalExtractionId: number;
      canonicalRevision: string | null;
    }
  | {
      action: "newer";
      previousCanonicalExtractionId: number;
      previousCanonicalRevision: string | null;
    }
  | {
      action: "older";
      latestExtractionId: number;
      latestRevision: string | null;
    }
  | {
      action: "unknown";
      otherExtractionId: number;
      otherRevision: string | null;
    };

@Injectable()
export class RevisionTrackingService {
  private readonly logger = new Logger(RevisionTrackingService.name);

  constructor(
    @InjectRepository(NixExtraction)
    private readonly extractionRepo: Repository<NixExtraction>,
  ) {}

  /**
   * Compares two revision strings semantically. Handles:
   *   - both numeric ('02' vs '03')             → numeric
   *   - both alpha ('A' vs 'AF' vs 'B')          → length-then-lex (A < B < ... < Z < AA < AB ...)
   *   - mixed ('02' vs 'AD')                     → 'unknown' — caller surfaces a prompt
   *   - same string                              → 'same'
   *   - one empty, the other not                 → empty is older
   *   - 'Rev. AB' / 'rev AB' / 'AB'              → all normalise to 'ab'
   */
  compareRevisions(a: string | null | undefined, b: string | null | undefined): RevisionComparison {
    const na = normaliseRevision(a);
    const nb = normaliseRevision(b);
    if (na === nb) return "same";
    if (!na && nb) return "older";
    if (na && !nb) return "newer";

    const numA = /^\d+$/.test(na) ? Number.parseInt(na, 10) : null;
    const numB = /^\d+$/.test(nb) ? Number.parseInt(nb, 10) : null;
    if (numA !== null && numB !== null) {
      if (numA > numB) return "newer";
      if (numA < numB) return "older";
      return "same";
    }

    const alphaA = /^[a-z]+$/.test(na);
    const alphaB = /^[a-z]+$/.test(nb);
    if (alphaA && alphaB) {
      if (na.length !== nb.length) return na.length > nb.length ? "newer" : "older";
      if (na > nb) return "newer";
      if (na < nb) return "older";
      return "same";
    }

    return "unknown";
  }

  /**
   * Runs the new extraction through the supersession check. Updates
   * nix_extractions in-place to reflect the new state (flipping
   * is_latest_revision flags + writing superseded_by_extraction_id) and
   * returns the verdict the API can hand back to the frontend.
   *
   * Looks up 'currently canonical' via (documentNumber + mineCountry +
   * mineId where mine is known, else just documentNumber). Limits to
   * COMPLETED extractions so half-finished ones don't influence ordering.
   */
  async processIncomingExtraction(extraction: NixExtraction): Promise<SupersessionVerdict> {
    if (!extraction.documentNumber) {
      return { action: "first" };
    }

    const where: Record<string, unknown> = {
      documentNumber: extraction.documentNumber,
      isLatestRevision: true,
      status: ExtractionStatus.COMPLETED,
    };
    if (extraction.mineId && extraction.mineCountry) {
      where.mineId = extraction.mineId;
      where.mineCountry = extraction.mineCountry;
    } else {
      where.mineId = IsNull();
    }

    const candidates = await this.extractionRepo.find({ where });
    const others = candidates.filter((c) => c.id !== extraction.id);

    if (others.length === 0) {
      return { action: "first" };
    }

    const incomingRev = extraction.documentRevision ?? null;
    const verdicts: RevisionComparison[] = others.map((o) =>
      this.compareRevisions(incomingRev, o.documentRevision),
    );
    const newerIdx = verdicts.indexOf("newer");
    const sameIdx = verdicts.indexOf("same");
    const unknownIdx = verdicts.indexOf("unknown");
    let bestComparison: RevisionComparison;
    let bestOther: NixExtraction;
    if (newerIdx >= 0) {
      bestComparison = "newer";
      bestOther = others[newerIdx];
    } else if (sameIdx >= 0) {
      bestComparison = "same";
      bestOther = others[sameIdx];
    } else if (unknownIdx >= 0) {
      bestComparison = "unknown";
      bestOther = others[unknownIdx];
    } else {
      bestComparison = "older";
      bestOther = others[0];
    }

    if (bestComparison === "newer") {
      for (const other of others) {
        await this.extractionRepo.update(
          { id: other.id },
          { isLatestRevision: false, supersededByExtractionId: extraction.id },
        );
      }
      this.logger.log(
        `Revision tracking #${extraction.id}: new rev '${incomingRev}' supersedes ${others.length} older row(s) for doc '${extraction.documentNumber}'`,
      );
      return {
        action: "newer",
        previousCanonicalExtractionId: bestOther.id,
        previousCanonicalRevision: bestOther.documentRevision ?? null,
      };
    }

    if (bestComparison === "same") {
      this.logger.debug(
        `Revision tracking #${extraction.id}: same rev '${incomingRev}' as canonical #${bestOther.id} for doc '${extraction.documentNumber}'`,
      );
      return {
        action: "same",
        canonicalExtractionId: bestOther.id,
        canonicalRevision: bestOther.documentRevision ?? null,
      };
    }

    if (bestComparison === "older") {
      await this.extractionRepo.update(
        { id: extraction.id },
        { isLatestRevision: false, supersededByExtractionId: bestOther.id },
      );
      this.logger.log(
        `Revision tracking #${extraction.id}: rev '${incomingRev}' is older than canonical rev '${bestOther.documentRevision}' (#${bestOther.id}) — flagged for user review`,
      );
      return {
        action: "older",
        latestExtractionId: bestOther.id,
        latestRevision: bestOther.documentRevision ?? null,
      };
    }

    await this.extractionRepo.update({ id: extraction.id }, { isLatestRevision: false });
    this.logger.log(
      `Revision tracking #${extraction.id}: cannot order rev '${incomingRev}' vs canonical rev '${bestOther.documentRevision}' (#${bestOther.id}) — surfacing for user`,
    );
    return {
      action: "unknown",
      otherExtractionId: bestOther.id,
      otherRevision: bestOther.documentRevision ?? null,
    };
  }
}

function normaliseRevision(rev: string | null | undefined): string {
  if (!rev) return "";
  return rev
    .trim()
    .toLowerCase()
    .replace(/^rev(ision)?\.?\s*/, "")
    .trim();
}
