import { Injectable } from "@nestjs/common";
import { DateTime } from "../../lib/datetime";
import {
  type DelistReportRow,
  ExternalJobRepository,
} from "../repositories/external-job.repository";

@Injectable()
export class OrbitJobDelistService {
  constructor(private readonly externalJobRepo: ExternalJobRepository) {}

  pendingReports(): Promise<DelistReportRow[]> {
    return this.externalJobRepo.pendingDelistReports();
  }

  pendingCount(): Promise<number> {
    return this.externalJobRepo.countPendingDelistReports();
  }

  confirm(externalJobId: number): Promise<void> {
    return this.externalJobRepo.confirmDelist(externalJobId, DateTime.now().toJSDate());
  }

  reject(externalJobId: number): Promise<void> {
    return this.externalJobRepo.rejectDelist(externalJobId);
  }
}
