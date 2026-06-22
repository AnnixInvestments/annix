import { Controller, Get, ParseIntPipe, Query, Request, UseGuards } from "@nestjs/common";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { AnnixOrbitAuditService } from "../services/annix-orbit-audit.service";

@Controller("annix-orbit/audit-events")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.ADMIN)
export class AnnixOrbitAuditController {
  constructor(private readonly auditService: AnnixOrbitAuditService) {}

  @Get()
  forCandidate(
    @Request() req: { user: { companyId: number } },
    @Query("candidateId", ParseIntPipe) candidateId: number,
  ) {
    return this.auditService.forCandidate(candidateId, req.user.companyId);
  }
}
