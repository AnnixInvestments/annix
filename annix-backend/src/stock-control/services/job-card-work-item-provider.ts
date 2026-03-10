import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobCard } from "../entities/job-card.entity";
import type { IWorkItemProvider, WorkItemLineItem } from "../qc/work-item-provider.interface";

@Injectable()
export class JobCardWorkItemProvider implements IWorkItemProvider {
  constructor(
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
  ) {}

  async lineItemsForWorkItem(companyId: number, workItemId: number): Promise<WorkItemLineItem[]> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: workItemId, companyId },
      relations: ["lineItems"],
    });

    if (!jobCard) {
      return [];
    }

    return (jobCard.lineItems ?? []).map((li) => ({
      itemCode: li.itemCode ?? "",
      description: li.itemDescription ?? "",
      jtNumber: li.jtNo ?? null,
      quantity: Number(li.quantity) || 0,
    }));
  }
}
