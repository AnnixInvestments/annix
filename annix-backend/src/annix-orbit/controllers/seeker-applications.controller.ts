import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Request,
  UseGuards,
} from "@nestjs/common";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  SeekerApplicationsService,
} from "../services/seeker-applications.service";

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

class UpdateApplicationDto {
  @IsOptional()
  @IsIn(APPLICATION_STATUSES as unknown as string[])
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

@Controller("annix-orbit/me/applications")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.INDIVIDUAL)
export class SeekerApplicationsController {
  constructor(private readonly applicationsService: SeekerApplicationsService) {}

  @Get()
  async list(@Request() req: SeekerAuthRequest) {
    const applications = await this.applicationsService.listForSeeker(req.user.email);
    return { applications };
  }

  @Patch(":id")
  async update(
    @Request() req: SeekerAuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateApplicationDto,
  ) {
    const updated = await this.applicationsService.setStatus(req.user.email, id, {
      status: body.status,
      notes: body.notes,
    });
    if (!updated) {
      throw new NotFoundException("Application not found");
    }
    return { success: true };
  }

  @Delete(":id")
  async remove(@Request() req: SeekerAuthRequest, @Param("id", ParseIntPipe) id: number) {
    const removed = await this.applicationsService.remove(req.user.email, id);
    if (!removed) {
      throw new NotFoundException("Application not found");
    }
    return { success: true };
  }
}
