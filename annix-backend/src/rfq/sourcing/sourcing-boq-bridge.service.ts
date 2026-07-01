import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isNil } from "es-toolkit/compat";
import { BoqRepository } from "../../boq/boq.repository";
import { BoqSectionRepository } from "../../boq/boq-section.repository";
import { BoqSupplierAccessRepository } from "../../boq/boq-supplier-access.repository";
import { CAPABILITY_TO_SECTIONS, sectionTitle } from "../../boq/config/capability-mapping";
import { Boq, BoqStatus } from "../../boq/entities/boq.entity";
import { SupplierBoqStatus } from "../../boq/entities/boq-supplier-access.entity";
import { now } from "../../lib/datetime";
import { NixExtractionSession } from "../../nix/entities/nix-extraction-session.entity";
import { NixExtractionSessionRepository } from "../../nix/nix-extraction-session.repository";
import type { StoredSourcingPlan } from "./sourcing-plan.persistence";

export interface PublishBucketResult {
  skipped: boolean;
  reason: string | null;
  boqId: number | null;
}

interface CustomerInfoSnapshot {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

interface ProjectInfoSnapshot {
  name: string;
  description?: string;
  requiredDate?: string;
}

@Injectable()
export class SourcingBoqBridgeService {
  private readonly logger = new Logger(SourcingBoqBridgeService.name);

  constructor(
    private readonly sessionRepo: NixExtractionSessionRepository,
    private readonly boqRepo: BoqRepository,
    private readonly sectionRepo: BoqSectionRepository,
    private readonly accessRepo: BoqSupplierAccessRepository,
    private readonly configService: ConfigService,
  ) {}

  inAppQuoteEnabled(): boolean {
    return this.configService.get<string>("RFQ_SOURCING_INAPP_QUOTE_ENABLED") === "true";
  }

  async publishBucket(
    sessionId: number,
    bucketRef: string,
    callerCompanyId: number,
  ): Promise<PublishBucketResult> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundException(`Sourcing session ${sessionId} not found`);
    }
    this.assertSessionOwnership(session, callerCompanyId);

    const plan = (session.sourcingPlan ?? null) as StoredSourcingPlan | null;
    const bucket = plan?.autoBuckets.find((candidate) => candidate.bucketRef === bucketRef) ?? null;
    if (!plan || !bucket) {
      throw new NotFoundException(`Bucket ${bucketRef} not found in plan`);
    }

    if (!this.inAppQuoteEnabled()) {
      return { skipped: true, reason: "feature-disabled", boqId: null };
    }

    if (isNil(bucket.supplierProfileId)) {
      throw new BadRequestException("external supplier publishing not yet supported");
    }

    if (!isNil(bucket.publishedBoqId)) {
      return { skipped: true, reason: "already-published", boqId: bucket.publishedBoqId };
    }

    const sectionType = CAPABILITY_TO_SECTIONS[bucket.category]?.[0] ?? bucket.category;
    const resolvedSectionTitle = sectionTitle(sectionType);
    const boqNumber = await this.nextBoqNumber();

    const boq = await this.createSourcingBoq(
      sessionId,
      bucketRef,
      boqNumber,
      resolvedSectionTitle,
      bucket.name,
    );
    if (!boq) {
      const existing = await this.boqRepo.findBySourceBucket(sessionId, bucketRef);
      return { skipped: true, reason: "already-published", boqId: existing?.id ?? null };
    }

    const items = bucket.items.map((item) => ({
      description: item.description,
      qty: item.quantity,
      unit: item.unit,
      weightKg: 0,
      entries: [item.rowNumber],
    }));

    await this.sectionRepo.create({
      boqId: boq.id,
      sectionType,
      capabilityKey: bucket.category,
      sectionTitle: resolvedSectionTitle,
      items,
      itemCount: items.length,
      totalWeightKg: 0,
    });

    await this.accessRepo.create({
      boqId: boq.id,
      supplierProfileId: bucket.supplierProfileId,
      allowedSections: [sectionType],
      status: SupplierBoqStatus.PENDING,
      reminderSent: false,
      accessOrigin: "sourcing",
      sourceSessionId: sessionId,
      bucketRef,
      customerInfo: this.customerInfoSnapshot(session),
      projectInfo: this.projectInfoSnapshot(session),
    });

    await this.markBucketPublished(sessionId, plan, bucketRef, boq.id);

    this.logger.log(
      `Published sourcing bucket ${bucketRef} (session ${sessionId}) → BOQ ${boq.id} (${boqNumber})`,
    );
    return { skipped: false, reason: null, boqId: boq.id };
  }

  private async createSourcingBoq(
    sessionId: number,
    bucketRef: string,
    boqNumber: string,
    resolvedSectionTitle: string,
    bucketName: string,
  ): Promise<Boq | null> {
    try {
      return await this.boqRepo.create({
        boqNumber,
        title: `Sourcing: ${resolvedSectionTitle} — ${bucketName}`,
        status: BoqStatus.SUBMITTED,
        sourceSessionId: sessionId,
        sourceBucketRef: bucketRef,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        return null;
      }
      throw error;
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === "object" && error !== null && (error as { code?: number }).code === 11000
    );
  }

  private assertSessionOwnership(session: NixExtractionSession, callerCompanyId: number): void {
    if (session.customerCompanyId !== callerCompanyId) {
      throw new ForbiddenException(`Session ${session.id} does not belong to the calling company`);
    }
  }

  private async markBucketPublished(
    sessionId: number,
    plan: StoredSourcingPlan,
    bucketRef: string,
    boqId: number,
  ): Promise<void> {
    const autoBuckets = plan.autoBuckets.map((candidate) =>
      candidate.bucketRef === bucketRef
        ? { ...candidate, publishedBoqId: boqId, publishState: "published" as const }
        : candidate,
    );
    const updated: StoredSourcingPlan = { ...plan, autoBuckets };
    await this.sessionRepo.setSourcingPlan(
      sessionId,
      updated as unknown as Record<string, unknown>,
    );
  }

  private customerInfoSnapshot(session: NixExtractionSession): CustomerInfoSnapshot | undefined {
    const snapshot = (session.customerSnapshot ?? null) as Record<string, unknown> | null;
    const name = this.stringField(snapshot?.name);
    const email = this.stringField(snapshot?.email);
    if (isNil(name) || isNil(email)) {
      return undefined;
    }
    return {
      name,
      email,
      phone: this.stringField(snapshot?.phone) ?? undefined,
      company: this.stringField(snapshot?.name) ?? undefined,
    };
  }

  private projectInfoSnapshot(session: NixExtractionSession): ProjectInfoSnapshot {
    return {
      name: session.title ?? session.externalReference ?? `Sourcing session ${session.id}`,
    };
  }

  private stringField(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  private async nextBoqNumber(): Promise<string> {
    const prefix = `BOQ-${now().year}-`;
    const lastBoq = await this.boqRepo.findLastByNumberPrefix(prefix);
    const nextNumber = lastBoq ? parseInt(lastBoq.boqNumber.replace(prefix, ""), 10) + 1 : 1;
    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  }
}
