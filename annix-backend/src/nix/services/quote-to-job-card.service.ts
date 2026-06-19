import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import type { JobCard } from "../../stock-control/entities/job-card.entity";
import { JobCardStatus } from "../../stock-control/entities/job-card.entity";
import type { JobCardLineItem } from "../../stock-control/entities/job-card-line-item.entity";
import { JobCardRepository } from "../../stock-control/repositories/job-card.repository";
import { JobCardLineItemRepository } from "../../stock-control/repositories/job-card-line-item.repository";
import { ConvertToJobCardDto, ConvertToJobCardResponseDto } from "../dto/convert-to-job-card.dto";
import { QuotePdfPoolDto, QuotePdfSnapshotDto } from "../dto/quote-pdf.dto";
import { NixExtractionSession } from "../entities/nix-extraction-session.entity";
import { NixExtractionSessionRepository } from "../nix-extraction-session.repository";
import { NixExtractionSessionService } from "./nix-extraction-session.service";

/**
 * Converts a promoted Nix quote session into a Job Card + Line Items.
 *
 * Triggered by the "Convert to Job Card" button on the quote view. The
 * frontend hands us the same `QuotePdfSnapshotDto` that drives the
 * customer-facing PDF, so the JC's line items mirror exactly what the
 * customer saw on the quote (same pooling, same dedup, same item
 * descriptions). The conversion is a one-shot operation: once
 * `session.jobCardId` is set, the quote page hides the convert button
 * and replaces it with a "View Job Card" link to prevent duplicates from
 * accidental double-clicks (project decision: lock after first convert).
 *
 * Everything runs inside a transaction — if any of the line-item inserts
 * fails, the JC root insert is rolled back too, so the user can retry
 * without ending up with an orphan JC.
 */
@Injectable()
export class QuoteToJobCardService {
  private readonly logger = new Logger(QuoteToJobCardService.name);

  constructor(
    private readonly sessionService: NixExtractionSessionService,
    private readonly sessionRepository: NixExtractionSessionRepository,
    private readonly jobCardRepository: JobCardRepository,
    private readonly jobCardLineItemRepository: JobCardLineItemRepository,
    private readonly txRunner: TransactionRunner,
  ) {}

  async convert(params: {
    sessionId: number;
    companyId: number;
    dto: ConvertToJobCardDto;
  }): Promise<ConvertToJobCardResponseDto> {
    const { sessionId, companyId, dto } = params;

    const session = await this.sessionService.findOne(sessionId);
    if (!session) {
      throw new NotFoundException(`Nix session ${sessionId} not found`);
    }
    if (session.jobCardId) {
      throw new BadRequestException(
        `Quote already converted to Job Card #${session.jobCardId}. Open that JC instead.`,
      );
    }

    const customerName = this.extractCustomerName(session);
    const lineItemRows = flattenPoolsToLineItems(dto.snapshot, companyId);
    if (lineItemRows.length === 0) {
      throw new BadRequestException(
        "Quote has no items — nothing to convert. Add at least one line before creating a Job Card.",
      );
    }

    return await this.txRunner.run(async (ctx) => {
      const jobCardRepo = this.jobCardRepository.withTransaction(ctx);
      const lineItemRepo = this.jobCardLineItemRepository.withTransaction(ctx);

      const jobCardData: DeepPartial<JobCard> = {
        companyId,
        jobNumber: dto.jobNumber.trim(),
        jobName: dto.jobName.trim(),
        customerName,
        description: this.composeDescription(session, dto.snapshot),
        siteLocation: dto.siteLocation?.trim() || null,
        contactPerson: dto.contactPerson?.trim() || null,
        dueDate: dto.dueDate ? dto.dueDate.trim() : null,
        notes: dto.snapshot.generalNotes?.trim() || null,
        reference: session.promotedRef ?? null,
        status: JobCardStatus.DRAFT,
        workflowStatus: "draft",
      };
      const savedJobCard = await jobCardRepo.create(jobCardData);

      const items = await Promise.all(
        lineItemRows.map((row) => lineItemRepo.create({ ...row, jobCardId: savedJobCard.id })),
      );

      await this.sessionRepository.withTransaction(ctx).setJobCardId(sessionId, savedJobCard.id);

      this.logger.log(
        `Converted Nix session ${sessionId} → JobCard ${savedJobCard.id} (${savedJobCard.jobNumber}) with ${items.length} line items`,
      );

      return {
        jobCardId: savedJobCard.id,
        jobNumber: savedJobCard.jobNumber,
      };
    });
  }

  private extractCustomerName(session: NixExtractionSession): string | null {
    const snapshot = session.customerSnapshot;
    if (!snapshot || typeof snapshot !== "object") return null;
    const candidate =
      (snapshot as Record<string, unknown>).name ??
      (snapshot as Record<string, unknown>).companyName;
    return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : null;
  }

  /**
   * Composes the JC root description from quote context — captures the
   * coating + lining spec lines (which apply to every item in a given pool)
   * so the shop has the full spec context without having to walk back to
   * the quote. Each pool contributes one line.
   */
  private composeDescription(
    session: NixExtractionSession,
    snapshot: QuotePdfSnapshotDto,
  ): string | null {
    const refParts = session.promotedRef ? [`Source quote: ${session.promotedRef}`] : [];
    const poolParts = snapshot.pools
      .map((pool) =>
        [pool.coatingLine, pool.liningLine]
          .filter((line): line is string => Boolean(line && line.trim().length > 0))
          .join(" + "),
      )
      .filter((specLine) => specLine.length > 0);
    const parts = [...refParts, ...poolParts];
    return parts.length > 0 ? parts.join("\n") : null;
  }
}

/**
 * Turn each pool's items into JobCardLineItem rows. Line item descriptions
 * carry the per-row drawing description (mark / dimensions / flange config)
 * so the shop can identify the part at a glance; the coating + lining
 * specs that apply to all items in the pool live on the JC root
 * description instead.
 */
function flattenPoolsToLineItems(
  snapshot: QuotePdfSnapshotDto,
  companyId: number,
): DeepPartial<JobCardLineItem>[] {
  return snapshot.pools
    .flatMap((pool) =>
      pool.items.map((item) => ({
        companyId,
        itemCode: item.mark || null,
        itemNo: item.mark || null,
        itemDescription: composeLineDescription(pool, item.description),
        quantity: item.quantity,
        m2: null,
        jtNo: null,
        notes: null,
      })),
    )
    .map((row, index) => ({ ...row, sortOrder: index }));
}

function composeLineDescription(pool: QuotePdfPoolDto, itemDescription: string): string {
  const parts: string[] = [itemDescription.trim()];
  const specLine = [pool.coatingLine, pool.liningLine]
    .filter((line): line is string => Boolean(line && line.trim().length > 0))
    .join(" + ");
  if (specLine) parts.push(specLine);
  return parts.join(" — ");
}
