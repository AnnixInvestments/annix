import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { AuditService } from "../../audit/audit.service";
import { Company } from "../../platform/entities/company.entity";
import { AnnixSentinelCompanyDetails } from "../companies/entities/annix-sentinel-company-details.entity";
import { daysBetween, fromISO, fromJSDate, now } from "../lib/datetime";
import { AnnixSentinelDocument } from "../sentinel-documents/entities/document.entity";
import { AnnixSentinelChecklistProgress } from "./entities/checklist-progress.entity";
import { AnnixSentinelComplianceRequirement } from "./entities/compliance-requirement.entity";
import { AnnixSentinelComplianceStatus } from "./entities/compliance-status.entity";
import { AnnixSentinelDeadlineService } from "./services/deadline.service";
import { AnnixSentinelRuleEngineService } from "./services/rule-engine.service";

interface UpdateStatusDto {
  status: string | null;
  notes: string | null;
  lastCompletedDate: string | null;
}

@Injectable()
export class AnnixSentinelComplianceService {
  private readonly logger = new Logger(AnnixSentinelComplianceService.name);

  constructor(
    @InjectRepository(AnnixSentinelComplianceStatus)
    private readonly statusRepository: Repository<AnnixSentinelComplianceStatus>,
    @InjectRepository(AnnixSentinelComplianceRequirement)
    private readonly requirementRepository: Repository<AnnixSentinelComplianceRequirement>,
    @InjectRepository(AnnixSentinelChecklistProgress)
    private readonly checklistRepository: Repository<AnnixSentinelChecklistProgress>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(AnnixSentinelCompanyDetails)
    private readonly detailsRepository: Repository<AnnixSentinelCompanyDetails>,
    @InjectRepository(AnnixSentinelDocument)
    private readonly documentRepository: Repository<AnnixSentinelDocument>,
    private readonly ruleEngineService: AnnixSentinelRuleEngineService,
    private readonly deadlineService: AnnixSentinelDeadlineService,
    private readonly auditService: AuditService,
  ) {}

  async assessCompany(companyId: number): Promise<AnnixSentinelComplianceStatus[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (company === null) {
      throw new NotFoundException("Company not found");
    }

    const details = await this.detailsRepository.findOne({
      where: { companyId },
    });

    const matchedRequirements = await this.ruleEngineService.matchRequirements(company, details);

    const statuses = await Promise.all(
      matchedRequirements.map(async (requirement) => {
        const existing = await this.statusRepository.findOne({
          where: { companyId, requirementId: requirement.id },
        });

        const nextDueDate = this.deadlineService.calculateNextDueDate(
          requirement,
          company,
          details,
        );

        if (existing !== null) {
          existing.nextDueDate = nextDueDate;
          return this.statusRepository.save(existing);
        } else {
          const status = this.statusRepository.create({
            companyId,
            requirementId: requirement.id,
            status: "in_progress",
            nextDueDate,
          });
          return this.statusRepository.save(status);
        }
      }),
    );

    return statuses;
  }

  async companyDashboard(companyId: number) {
    const [company, statuses] = await Promise.all([
      this.companyRepository.findOne({ where: { id: companyId } }),
      this.statusRepository.find({
        where: { companyId },
        relations: ["requirement"],
      }),
    ]);

    const totalCount = statuses.length;
    const compliantCount = statuses.filter((s) => s.status === "compliant").length;
    const warningCount = statuses.filter((s) => s.status === "warning").length;
    const overdueCount = statuses.filter((s) => s.status === "overdue").length;
    const overallScore = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

    const requirementIds = statuses
      .filter((s) => s.requirement !== null)
      .map((s) => s.requirement.id);

    const [checklistProgress, documents] = await Promise.all([
      requirementIds.length > 0
        ? this.checklistRepository.find({
            where: { companyId, requirementId: In(requirementIds) },
          })
        : Promise.resolve([]),
      requirementIds.length > 0
        ? this.documentRepository.find({
            where: { companyId, requirementId: In(requirementIds) },
          })
        : Promise.resolve([]),
    ]);

    const checklistByReq = checklistProgress.reduce(
      (acc, cp) => {
        const existing = acc[cp.requirementId] ?? [];
        return { ...acc, [cp.requirementId]: [...existing, cp] };
      },
      {} as Record<number, AnnixSentinelChecklistProgress[]>,
    );

    const docsByReq = documents.reduce(
      (acc, doc) => {
        if (doc.requirementId === null) return acc;
        const existing = acc[doc.requirementId] ?? [];
        return { ...acc, [doc.requirementId]: [...existing, doc] };
      },
      {} as Record<number, AnnixSentinelDocument[]>,
    );

    const requirements = statuses
      .filter((s) => s.requirement !== null)
      .map((s) => {
        const req = s.requirement;
        const steps = req.checklistSteps ?? [];
        const progress = checklistByReq[req.id] ?? [];
        const reqDocs = docsByReq[req.id] ?? [];

        const checklist = steps.map((step, index) => {
          const cp = progress.find((p) => p.stepIndex === index);
          return {
            step,
            completed: cp?.completed || false,
            aiVerified: cp?.notes?.startsWith("AI-verified") || false,
          };
        });

        return {
          id: String(req.id),
          name: req.name,
          category: req.category,
          status: s.status,
          description: req.description,
          nextDueDate: s.nextDueDate?.toISOString() ?? null,
          checklist,
          documents: reqDocs.map((d) => ({
            id: String(d.id),
            name: d.name,
            uploadedAt: d.createdAt.toISOString(),
          })),
        };
      });

    const today = now();
    const upcomingDeadlines = statuses
      .filter((s) => s.nextDueDate !== null && s.requirement !== null)
      .map((s) => ({
        id: String(s.id),
        requirementName: s.requirement.name,
        dueDate: s.nextDueDate!.toISOString(),
        daysRemaining: Math.max(0, daysBetween(today, fromJSDate(s.nextDueDate!))),
        status: s.status,
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 10);

    return {
      companyName: company?.name ?? "My Company",
      complianceScore: overallScore,
      summary: {
        compliant: compliantCount,
        warning: warningCount,
        overdue: overdueCount,
      },
      upcomingDeadlines,
      requirements,
      overallScore,
      totalRequirements: totalCount,
      compliantCount,
    };
  }

  async updateStatus(
    companyId: number,
    statusId: number,
    dto: UpdateStatusDto,
  ): Promise<AnnixSentinelComplianceStatus> {
    const status = await this.statusRepository.findOne({
      where: { id: statusId, companyId },
    });

    if (status === null) {
      throw new NotFoundException("Compliance status not found");
    }

    const previousStatus = status.status;

    if (dto.status !== null) {
      status.status = dto.status;
    }
    if (dto.notes !== null) {
      status.notes = dto.notes;
    }
    if (dto.lastCompletedDate !== null) {
      status.lastCompletedDate = fromISO(dto.lastCompletedDate).toJSDate();
    }

    const saved = await this.statusRepository.save(status);

    await this.auditService.logApp({
      appName: "annix-sentinel",
      subAction: "status_change",
      companyId,
      entityType: "compliance_status",
      entityId: statusId,
      details: { previousStatus, newStatus: saved.status },
    });

    return saved;
  }

  async completeChecklistStepsFromAi(
    companyId: number,
    requirementId: number,
    stepIndices: number[],
    reasoning: string,
  ): Promise<void> {
    const requirement = await this.requirementRepository.findOne({
      where: { id: requirementId },
    });

    if (requirement === null || requirement.checklistSteps === null) {
      return;
    }

    const existingProgress = await this.checklistRepository.find({
      where: { companyId, requirementId },
    });

    const existingByIndex = existingProgress.reduce(
      (acc, cp) => ({ ...acc, [cp.stepIndex]: cp }),
      {} as Record<number, AnnixSentinelChecklistProgress>,
    );

    await Promise.all(
      stepIndices.map(async (stepIndex) => {
        const existing = existingByIndex[stepIndex];

        if (existing?.completed) {
          return;
        }

        const stepLabel =
          stepIndex < requirement.checklistSteps!.length
            ? requirement.checklistSteps![stepIndex]
            : `Step ${stepIndex + 1}`;

        if (existing) {
          existing.completed = true;
          existing.completedAt = now().toJSDate();
          existing.completedByUserId = null;
          existing.notes = `AI-verified: ${reasoning}`;
          await this.checklistRepository.save(existing);
        } else {
          const progress = this.checklistRepository.create({
            companyId,
            requirementId,
            stepIndex,
            stepLabel,
            completed: true,
            completedAt: now().toJSDate(),
            completedByUserId: null,
            notes: `AI-verified: ${reasoning}`,
          });
          await this.checklistRepository.save(progress);
        }
      }),
    );

    await this.autoCompleteStatus(companyId, requirementId, null);

    await this.auditService.logApp({
      appName: "annix-sentinel",
      subAction: "ai_checklist_complete",
      companyId,
      entityType: "compliance_checklist",
      entityId: requirementId,
      details: { stepIndices, reasoning },
    });
  }

  async toggleChecklistStep(
    companyId: number,
    requirementId: number,
    stepIndex: number,
    userId: number,
  ): Promise<AnnixSentinelChecklistProgress> {
    const existing = await this.checklistRepository.findOne({
      where: { companyId, requirementId, stepIndex },
    });

    if (existing !== null) {
      existing.completed = !existing.completed;
      existing.completedAt = existing.completed ? now().toJSDate() : null;
      existing.completedByUserId = existing.completed ? userId : null;
      const saved = await this.checklistRepository.save(existing);
      await this.autoCompleteStatus(companyId, requirementId, userId);
      return saved;
    } else {
      const requirement = await this.requirementRepository.findOne({
        where: { id: requirementId },
      });

      if (requirement === null) {
        throw new NotFoundException("Requirement not found");
      }

      const stepLabel =
        requirement.checklistSteps !== null && stepIndex < requirement.checklistSteps.length
          ? requirement.checklistSteps[stepIndex]
          : `Step ${stepIndex + 1}`;

      const progress = this.checklistRepository.create({
        companyId,
        requirementId,
        stepIndex,
        stepLabel,
        completed: true,
        completedAt: now().toJSDate(),
        completedByUserId: userId,
      });

      const saved = await this.checklistRepository.save(progress);
      await this.autoCompleteStatus(companyId, requirementId, userId);
      return saved;
    }
  }

  async allRequirements(
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    data: AnnixSentinelComplianceRequirement[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.requirementRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { id: "ASC" },
    });

    return { data, total, page, limit };
  }

  private async autoCompleteStatus(
    companyId: number,
    requirementId: number,
    userId: number | null,
  ): Promise<void> {
    const requirement = await this.requirementRepository.findOne({
      where: { id: requirementId },
    });

    if (requirement === null || requirement.checklistSteps === null) {
      return;
    }

    const totalSteps = requirement.checklistSteps.length;
    const completedSteps = await this.checklistRepository.count({
      where: { companyId, requirementId, completed: true },
    });

    if (completedSteps >= totalSteps) {
      const status = await this.statusRepository.findOne({
        where: { companyId, requirementId },
      });

      if (status !== null && status.status !== "compliant") {
        status.status = "compliant";
        status.lastCompletedDate = now().toJSDate();
        status.completedByUserId = userId;
        await this.statusRepository.save(status);

        await this.auditService.logApp({
          appName: "annix-sentinel",
          subAction: "checklist_complete",
          companyId,
          userId,
          entityType: "compliance_status",
          entityId: status.id,
          details: { requirementId, totalSteps },
        });
      }
    }
  }

  async updateVatSubmissionCycle(companyId: number, cycle: "odd" | "even"): Promise<void> {
    const [company, details] = await Promise.all([
      this.companyRepository.findOne({ where: { id: companyId } }),
      this.detailsRepository.findOne({ where: { companyId } }),
    ]);

    if (company === null || details === null || details.vatSubmissionCycle === cycle) {
      return;
    }

    details.vatSubmissionCycle = cycle;
    await this.detailsRepository.save(details);

    this.logger.log(`Updated VAT submission cycle for company ${companyId} to ${cycle}`);

    const vatRequirement = await this.requirementRepository.findOne({
      where: { code: "SARS_VAT_RETURNS" },
    });

    if (vatRequirement !== null) {
      const status = await this.statusRepository.findOne({
        where: { companyId, requirementId: vatRequirement.id },
      });

      if (status !== null) {
        const nextDueDate = this.deadlineService.calculateNextDueDate(
          vatRequirement,
          company,
          details,
        );
        status.nextDueDate = nextDueDate;
        await this.statusRepository.save(status);
      }
    }

    await this.auditService.logApp({
      appName: "annix-sentinel",
      subAction: "vat_cycle_detected",
      companyId,
      entityType: "company",
      entityId: companyId,
      details: { vatSubmissionCycle: cycle, source: "ai_document_analysis" },
    });
  }
}
