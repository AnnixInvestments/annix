import { Controller, Get, NotFoundException, Request, UseGuards } from "@nestjs/common";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { SeekerCalendarService } from "../services/seeker-calendar.service";

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

@Controller("annix-orbit/me/calendar")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.INDIVIDUAL)
export class SeekerCalendarController {
  constructor(private readonly seekerCalendarService: SeekerCalendarService) {}

  @Get("feed")
  async feed(@Request() req: SeekerAuthRequest) {
    const token = await this.seekerCalendarService.ensureFeedToken(req.user.id);
    if (!token) {
      throw new NotFoundException("Profile not found");
    }
    return { token };
  }
}
