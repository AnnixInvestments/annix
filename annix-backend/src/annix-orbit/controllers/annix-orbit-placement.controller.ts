import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";

function assertCanManage(recruiterRole: string | null | undefined): void {
  if (recruiterRole !== "owner" && recruiterRole !== "manager") {
    throw new ForbiddenException("Only an agency owner or manager can do this.");
  }
}

import {
  CreateAnnixOrbitPlacementDto,
  UpdateAnnixOrbitPlacementDto,
} from "../dto/annix-orbit-placement.dto";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { AnnixOrbitPlacementService } from "../services/annix-orbit-placement.service";

@Controller("annix-orbit/placements")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.VIEWER)
export class AnnixOrbitPlacementController {
  constructor(private readonly placementService: AnnixOrbitPlacementService) {}

  @Get()
  findAll(@Request() req: { user: { companyId: number } }) {
    return this.placementService.findForCompany(req.user.companyId);
  }

  @Get(":id")
  findOne(@Request() req: { user: { companyId: number } }, @Param("id", ParseIntPipe) id: number) {
    return this.placementService.findByIdForCompany(id, req.user.companyId);
  }

  @Post()
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  create(
    @Request() req: { user: { companyId: number; id: number } },
    @Body() dto: CreateAnnixOrbitPlacementDto,
  ) {
    return this.placementService.create(req.user.companyId, req.user.id, dto);
  }

  @Put(":id")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  update(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitPlacementDto,
  ) {
    return this.placementService.update(id, req.user.companyId, dto);
  }

  @Delete(":id")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async remove(
    @Request() req: { user: { companyId: number; recruiterRole?: string | null } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    assertCanManage(req.user.recruiterRole);
    await this.placementService.remove(id, req.user.companyId);
    return { success: true };
  }
}
