import { Injectable } from "@nestjs/common";
import type { IWorkItemProvider, WorkItemLineItem } from "../qc/work-item-provider.interface";
import { JobCardRepository } from "../repositories/job-card.repository";

@Injectable()
export class JobCardWorkItemProvider implements IWorkItemProvider {
  constructor(private readonly jobCardRepo: JobCardRepository) {}

  async lineItemsForWorkItem(companyId: number, workItemId: number): Promise<WorkItemLineItem[]> {
    const jobCard = await this.jobCardRepo.findOneForCompanyWithLineItems(workItemId, companyId);

    if (!jobCard) {
      return [];
    }

    return (jobCard.lineItems ?? []).map((li) => ({
      itemCode: li.itemCode ?? "",
      description: li.itemDescription ?? "",
      jtNumber: li.jtNo ?? null,
      quantity: Number(li.quantity) || 0,
      itemNo: li.itemNo ?? null,
    }));
  }
}
