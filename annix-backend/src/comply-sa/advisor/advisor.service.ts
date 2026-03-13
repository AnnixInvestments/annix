import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ComplySaComplianceStatus } from "../compliance/entities/compliance-status.entity";
import { formatDateZA, fromJSDate } from "../lib/datetime";

const SCORE_THRESHOLD_LOW = 50;
const SCORE_THRESHOLD_HIGH = 80;

import { ComplySaAdvisorClient } from "./entities/advisor-client.entity";

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
export class ComplySaAdvisorService {
  constructor(
    @InjectRepository(ComplySaAdvisorClient)
    private readonly advisorClientRepository: Repository<ComplySaAdvisorClient>,
    @InjectRepository(ComplySaComplianceStatus)
    private readonly statusRepository: Repository<ComplySaComplianceStatus>,
  ) {}

  async addClient(advisorUserId: number, companyId: number): Promise<ComplySaAdvisorClient> {
    const existing = await this.advisorClientRepository.findOne({
      where: { advisorUserId, clientCompanyId: companyId },
    });

    if (existing !== null) {
      return existing;
    }

    const advisorClient = this.advisorClientRepository.create({
      advisorUserId,
      clientCompanyId: companyId,
    });

    return this.advisorClientRepository.save(advisorClient);
  }

  async removeClient(advisorUserId: number, companyId: number): Promise<void> {
    const advisorClient = await this.advisorClientRepository.findOne({
      where: { advisorUserId, clientCompanyId: companyId },
    });

    if (advisorClient === null) {
      throw new NotFoundException("Client relationship not found");
    }

    await this.advisorClientRepository.remove(advisorClient);
  }

  async clientList(advisorUserId: number): Promise<ClientSummary[]> {
    const clients = await this.advisorClientRepository.find({
      where: { advisorUserId },
      relations: ["clientCompany"],
    });

    const clientCompanyIds = clients.map((c) => c.clientCompanyId);

    if (clientCompanyIds.length === 0) {
      return [];
    }

    const allStatuses = await this.statusRepository.find({
      where: { companyId: In(clientCompanyIds) },
    });

    const statusesByCompany = allStatuses.reduce<Record<number, ComplySaComplianceStatus[]>>(
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
        companyName: client.clientCompany.name,
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
    const clients = await this.advisorClientRepository.find({
      where: { advisorUserId },
      relations: ["clientCompany"],
    });

    const clientCompanyIds = clients.map((c) => c.clientCompanyId);

    if (clientCompanyIds.length === 0) {
      return [];
    }

    const allStatuses = await this.statusRepository.find({
      where: { companyId: In(clientCompanyIds) },
      relations: ["requirement"],
    });

    const companyNameById = clients.reduce<Record<number, string>>(
      (acc, client) => ({ ...acc, [client.clientCompanyId]: client.clientCompany.name }),
      {},
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
}
