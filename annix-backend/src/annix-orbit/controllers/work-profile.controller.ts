import type { WorkProfile } from "@annix/product-data/sa-market";
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { WorkProfileService } from "../services/work-profile.service";

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

@Controller("annix-orbit/seeker/work-profile")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.INDIVIDUAL)
export class WorkProfileController {
  constructor(private readonly workProfileService: WorkProfileService) {}

  @Get()
  async get(@Request() req: SeekerAuthRequest) {
    const result = await this.workProfileService.forSeeker(req.user.email);
    return result;
  }

  @Put()
  async upsert(@Request() req: SeekerAuthRequest, @Body() body: WorkProfile) {
    const result = await this.workProfileService.upsertForSeeker(req.user.email, body);
    if (!result.saved) {
      throw new NotFoundException("No candidate profile to attach a work profile to");
    }
    return result;
  }

  @Post("extract-from-cv")
  async autofillFromCv(@Request() req: SeekerAuthRequest) {
    return this.workProfileService.autofillFromCvForSeeker(req.user.email);
  }
}
