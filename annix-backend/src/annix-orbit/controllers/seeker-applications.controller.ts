import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { SeekerApplicationsService } from "../services/seeker-applications.service";

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

@Controller("annix-orbit/me/applications")
@UseGuards(AnnixOrbitAuthGuard)
export class SeekerApplicationsController {
  constructor(private readonly applicationsService: SeekerApplicationsService) {}

  @Get()
  async list(@Request() req: SeekerAuthRequest) {
    const applications = await this.applicationsService.listForSeeker(req.user.email);
    return { applications };
  }
}
