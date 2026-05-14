import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { JobCard, JobCardStatus } from "../../stock-control/entities/job-card.entity";
import { JobCardLineItem } from "../../stock-control/entities/job-card-line-item.entity";
import { ConvertToJobCardDto, ConvertToJobCardResponseDto } from "../dto/convert-to-job-card.dto";
import { QuotePdfPoolDto, QuotePdfSnapshotDto } from "../dto/quote-pdf.dto";
import { NixExtractionSession } from "../entities/nix-extraction-session.entity";
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
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardLineItem)
    private readonly lineItemRepo: Repository<JobCardLineItem>,
    private readonly sessionService: NixExtractionSessionService,
    private readonly dataSource: DataSource,
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

    return await this.dataSource.transaction(async (manager) => {
      const jobCardRepo = manager.getRepository(JobCard);
      const jobCardEntity: Partial<JobCard> = {
        companyId,
        jobNumber: dto.jobNumber.trim(),
        jobName: dto.jobName.trim(),
        customerName: customerName ?? undefined,
        description: this.composeDescription(session, dto.snapshot),
        siteLocation: dto.siteLocation?.trim() || undefined,
        contactPerson: dto.contactPerson?.trim() || undefined,
        dueDate: dto.dueDate ? dto.dueDate.trim() : null,
        notes: dto.snapshot.generalNotes?.trim() || undefined,
        reference: session.promotedRef ?? undefined,
        status: JobCardStatus.DRAFT,
        workflowStatus: "draft",
      };
      const savedJobCard: JobCard = await jobCardRepo.save(jobCardRepo.create(jobCardEntity));

      const lineItemRepo = manager.getRepository(JobCardLineItem);
      const items = lineItemRows.map((row) =>
        lineItemRepo.create({ ...row, jobCardId: savedJobCard.id }),
      );
      await lineItemRepo.save(items);

      // Flip the FK on the session in the same transaction so a partial
      // failure can't leave a JC without its session link (which would
      // re-enable the convert button and let the user create a duplicate).
      await manager.getRepository(NixExtractionSession).update(sessionId, {
        jobCardId: savedJobCard.id,
      });

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
  ): string | undefined {
    const parts: string[] = [];
    if (session.promotedRef) parts.push(`Source quote: ${session.promotedRef}`);
    for (const pool of snapshot.pools) {
      const specLine = [pool.coatingLine, pool.liningLine]
        .filter((line): line is string => Boolean(line && line.trim().length > 0))
        .join(" + ");
      if (specLine) parts.push(specLine);
    }
    return parts.length > 0 ? parts.join("\n") : undefined;
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
): Partial<JobCardLineItem>[] {
  const rows: Partial<JobCardLineItem>[] = [];
  let sortOrder = 0;
  for (const pool of snapshot.pools) {
    for (const item of pool.items) {
      rows.push({
        companyId,
        itemCode: item.mark || null,
        itemNo: item.mark || null,
        itemDescription: composeLineDescription(pool, item.description),
        quantity: item.quantity,
        m2: null,
        jtNo: null,
        notes: null,
        sortOrder: sortOrder++,
      });
    }
  }
  return rows;
}

function composeLineDescription(pool: QuotePdfPoolDto, itemDescription: string): string {
  const parts: string[] = [itemDescription.trim()];
  const specLine = [pool.coatingLine, pool.liningLine]
    .filter((line): line is string => Boolean(line && line.trim().length > 0))
    .join(" + ");
  if (specLine) parts.push(specLine);
  return parts.join(" — ");
}
