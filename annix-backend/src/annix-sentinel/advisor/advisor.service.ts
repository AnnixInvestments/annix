import { Injectable, NotFoundException } from "@nestjs/common";
import { CompanyRepository } from "../../platform/company.repository";
import { AnnixSentinelComplianceRequirementRepository } from "../compliance/compliance-requirement.repository";
import { AnnixSentinelComplianceStatusRepository } from "../compliance/compliance-status.repository";
import { AnnixSentinelComplianceRequirement } from "../compliance/entities/compliance-requirement.entity";
import { AnnixSentinelComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { formatDateZA, fromJSDate, now } from "../lib/datetime";
import { AnnixSentinelAdvisorClientRepository } from "./advisor-client.repository";

const SCORE_THRESHOLD_LOW = 50;
const SCORE_THRESHOLD_HIGH = 80;

import { AnnixSentinelAdvisorClient } from "./entities/advisor-client.entity";

export interface ClientSummary {
  companyId: number;
  companyName: string;
  score: number;
  overdueCount: number;
  warningCount: number;
}

export interface DashboardStats {
  totalClients: number;
  totalOverdue: number;
  totalWarnings: number;
  clientsByScoreBucket: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface CalendarDeadline {
  companyId: number;
  companyName: string;
  requirementName: string;
  dueDate: string;
  status: string;
}

@Injectable()
export class AnnixSentinelAdvisorService {
  constructor(
    private readonly advisorClientRepository: AnnixSentinelAdvisorClientRepository,
    private readonly statusRepository: AnnixSentinelComplianceStatusRepository,
    private readonly requirementRepository: AnnixSentinelComplianceRequirementRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async addClient(advisorUserId: number, companyId: number): Promise<AnnixSentinelAdvisorClient> {
    const existing = await this.advisorClientRepository.findOneWhere({
      advisorUserId,
      clientCompanyId: companyId,
    });

    if (existing !== null) {
      return existing;
    }

    return this.advisorClientRepository.create({
      advisorUserId,
      clientCompanyId: companyId,
      addedAt: now().toJSDate(),
    });
  }

  async removeClient(advisorUserId: number, companyId: number): Promise<void> {
    const advisorClient = await this.advisorClientRepository.findOneWhere({
      advisorUserId,
      clientCompanyId: companyId,
    });

    if (advisorClient === null) {
      throw new NotFoundException("Client relationship not found");
    }

    await this.advisorClientRepository.remove(advisorClient);
  }

  async clientList(advisorUserId: number): Promise<ClientSummary[]> {
    const clients = await this.advisorClientRepository.findManyWhere({ advisorUserId });

    const clientCompanyIds = clients.map((c) => c.clientCompanyId);

    if (clientCompanyIds.length === 0) {
      return [];
    }

    const companyNameById = await this.companyNameIndex(clientCompanyIds);

    const allStatuses = await this.statusRepository.findByCompanyIds(clientCompanyIds);

    const statusesByCompany = allStatuses.reduce<Record<number, AnnixSentinelComplianceStatus[]>>(
      (acc, status) => ({
        ...acc,
        [status.companyId]: [...(acc[status.companyId] ?? []), status],
      }),
      {},
    );

    return clients.map((client) => {
      const statuses = statusesByCompany[client.clientCompanyId] ?? [];
      const totalCount = statuses.length;
      const compliantCount = statuses.filter((s) => s.status === "compliant").length;
      const overdueCount = statuses.filter((s) => s.status === "overdue").length;
      const warningCount = statuses.filter((s) => s.status === "warning").length;
      const score = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

      return {
        companyId: client.clientCompanyId,
        companyName: companyNameById[client.clientCompanyId] ?? "Unknown",
        score,
        overdueCount,
        warningCount,
      };
    });
  }

  async clientDashboard(advisorUserId: number): Promise<DashboardStats> {
    const summaries = await this.clientList(advisorUserId);

    const totalClients = summaries.length;
    const totalOverdue = summaries.reduce((acc, s) => acc + s.overdueCount, 0);
    const totalWarnings = summaries.reduce((acc, s) => acc + s.warningCount, 0);

    const clientsByScoreBucket = summaries.reduce(
      (acc, s) => {
        if (s.score < SCORE_THRESHOLD_LOW) {
          return { ...acc, low: acc.low + 1 };
        } else if (s.score < SCORE_THRESHOLD_HIGH) {
          return { ...acc, medium: acc.medium + 1 };
        } else {
          return { ...acc, high: acc.high + 1 };
        }
      },
      { low: 0, medium: 0, high: 0 },
    );

    return {
      totalClients,
      totalOverdue,
      totalWarnings,
      clientsByScoreBucket,
    };
  }

  async deadlineCalendar(
    advisorUserId: number,
    month: number,
    year: number,
  ): Promise<CalendarDeadline[]> {
    const clients = await this.advisorClientRepository.findManyWhere({ advisorUserId });

    const clientCompanyIds = clients.map((c) => c.clientCompanyId);

    if (clientCompanyIds.length === 0) {
      return [];
    }

    const companyNameById = await this.companyNameIndex(clientCompanyIds);

    const allStatuses = await this.attachRequirements(
      await this.statusRepository.findByCompanyIds(clientCompanyIds),
    );

    return allStatuses
      .filter((status) => {
        if (status.nextDueDate === null) {
          return false;
        }
        const dueDate = fromJSDate(status.nextDueDate);
        return dueDate.month === month && dueDate.year === year;
      })
      .map((status) => ({
        companyId: status.companyId,
        companyName: companyNameById[status.companyId] ?? "Unknown",
        requirementName: status.requirement?.name ?? "Unknown",
        dueDate: formatDateZA(fromJSDate(status.nextDueDate!)),
        status: status.status,
      }));
  }

  private async attachRequirements(
    statuses: AnnixSentinelComplianceStatus[],
  ): Promise<AnnixSentinelComplianceStatus[]> {
    const requirementIds = [...new Set(statuses.map((s) => s.requirementId))];

    if (requirementIds.length === 0) {
      return statuses;
    }

    const requirements = await this.requirementRepository.findByIds(requirementIds);
    const requirementById = requirements.reduce(
      (acc, requirement) => ({ ...acc, [requirement.id]: requirement }),
      {} as Record<number, AnnixSentinelComplianceRequirement>,
    );

    return statuses.map((status) => {
      status.requirement = (requirementById[status.requirementId] ??
        null) as AnnixSentinelComplianceRequirement;
      return status;
    });
  }

  private async companyNameIndex(companyIds: number[]): Promise<Record<number, string>> {
    const companies = await this.companyRepository.findByIds(companyIds);
    return companies.reduce<Record<number, string>>(
      (acc, company) => ({ ...acc, [Number(company.id)]: company.name }),
      {},
    );
  }
}
