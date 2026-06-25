import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { IsInt, IsISO8601, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import { FEATURE_FLAGS } from "../../feature-flags/feature-flags.constants";
import { FeatureFlagsService } from "../../feature-flags/feature-flags.service";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { SeekerEmploymentService } from "../services/seeker-employment.service";

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

class CreateEmploymentDto {
  @IsOptional()
  @IsInt()
  applyClickId?: number | null;

  @IsOptional()
  @IsInt()
  externalJobId?: number | null;

  @IsString()
  @MaxLength(300)
  employerName: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(1000)
  companyWebsiteUrl?: string | null;

  @IsString()
  @MaxLength(300)
  roleTitle: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  roleOutline?: string | null;

  @IsISO8601()
  startDate: string;
}

class UpdateEmploymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  employerName?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(1000)
  companyWebsiteUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  roleTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  roleOutline?: string | null;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string | null;
}

class MarkLeftDto {
  @IsOptional()
  @IsISO8601()
  endDate?: string | null;
}

@Controller("annix-orbit/me/employment")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.INDIVIDUAL)
export class SeekerEmploymentController {
  constructor(
    private readonly employmentService: SeekerEmploymentService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  private async ensureCvRefreshEnabled(): Promise<void> {
    const enabled = await this.featureFlagsService.isEnabled(
      FEATURE_FLAGS.ANNIX_ORBIT_NIX_CV_BUILDER,
    );
    if (!enabled) {
      throw new ForbiddenException(
        "Refreshing your CV with Nix is not available on your plan. Please contact us to enable it.",
      );
    }
  }

  @Get()
  async list(@Request() req: SeekerAuthRequest) {
    const records = await this.employmentService.listForSeeker(req.user.email);
    return { records };
  }

  @Post("reactivate")
  async reactivate(@Request() req: SeekerAuthRequest) {
    await this.ensureCvRefreshEnabled();
    return this.employmentService.reactivate(req.user.email, req.user.id);
  }

  @Post()
  async create(@Request() req: SeekerAuthRequest, @Body() body: CreateEmploymentDto) {
    const record = await this.employmentService.createOnAcceptance(req.user.email, body);
    if (!record) {
      throw new BadRequestException("Could not save the role. Check the start date and try again.");
    }
    return { record };
  }

  @Patch(":id")
  async update(
    @Request() req: SeekerAuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateEmploymentDto,
  ) {
    const record = await this.employmentService.update(req.user.email, id, body);
    if (!record) {
      throw new NotFoundException("Employment record not found");
    }
    return { record };
  }

  @Patch(":id/left")
  async markLeft(
    @Request() req: SeekerAuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: MarkLeftDto,
  ) {
    const endDate = body.endDate !== undefined ? body.endDate : null;
    const record = await this.employmentService.markLeft(req.user.email, id, endDate);
    if (!record) {
      throw new NotFoundException("Employment record not found");
    }
    return { record };
  }
}
