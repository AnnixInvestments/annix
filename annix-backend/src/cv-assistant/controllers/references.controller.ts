import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { ReferenceStatus } from "../entities/candidate-reference.entity";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { ReferenceService } from "../services/reference.service";

@Controller("cv-assistant/references")
@UseGuards(CvAssistantAuthGuard)
export class ReferencesController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get()
  async findAll(@Request() req: { user: { companyId: number } }, @Query("status") status?: string) {
    const referenceStatus = status ? (status as ReferenceStatus) : undefined;
    return this.referenceService.referencesForCompany(req.user.companyId, referenceStatus);
  }

  @Get("pending")
  async pendingReferences(@Request() req: { user: { companyId: number } }) {
    return this.referenceService.referencesForCompany(
      req.user.companyId,
      ReferenceStatus.REQUESTED,
    );
  }

  @Get("completed")
  async completedReferences(@Request() req: { user: { companyId: number } }) {
    return this.referenceService.referencesForCompany(
      req.user.companyId,
      ReferenceStatus.RESPONDED,
    );
  }
}
