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
  CreateAnnixOrbitClientDto,
  UpdateAnnixOrbitClientDto,
} from "../dto/annix-orbit-client.dto";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { AnnixOrbitClientService } from "../services/annix-orbit-client.service";

@Controller("annix-orbit/clients")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.VIEWER)
export class AnnixOrbitClientController {
  constructor(private readonly clientService: AnnixOrbitClientService) {}

  @Get()
  findAll(@Request() req: { user: { companyId: number } }) {
    return this.clientService.findForCompany(req.user.companyId);
  }

  @Get(":id")
  findOne(@Request() req: { user: { companyId: number } }, @Param("id", ParseIntPipe) id: number) {
    return this.clientService.findByIdForCompany(id, req.user.companyId);
  }

  @Post()
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  create(@Request() req: { user: { companyId: number } }, @Body() dto: CreateAnnixOrbitClientDto) {
    return this.clientService.create(req.user.companyId, dto);
  }

  @Put(":id")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  update(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitClientDto,
  ) {
    return this.clientService.update(id, req.user.companyId, dto);
  }

  @Delete(":id")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  async remove(
    @Request() req: { user: { companyId: number; recruiterRole?: string | null } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    assertCanManage(req.user.recruiterRole);
    await this.clientService.remove(id, req.user.companyId);
    return { success: true };
  }
}
