import { Controller, Get, Param, Post, Request, UseGuards } from "@nestjs/common";
import { AnnixOrbitAuthGuard } from "../../annix-orbit/guards/annix-orbit-auth.guard";
import { EducationGuardianService } from "../services/education-guardian.service";

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

/**
 * Parent/guardian dashboard endpoints (#304 Phase 2). The logged-in guardian
 * only ever sees/acts on the links that are theirs (matched by user id or
 * invited email) — scoping is enforced in the service.
 */
@Controller("annix-orbit/education/guardian")
@UseGuards(AnnixOrbitAuthGuard)
export class EducationGuardianController {
  constructor(private readonly guardianService: EducationGuardianService) {}

  @Get("students")
  async students(@Request() req: SeekerAuthRequest) {
    const students = await this.guardianService.dashboard(req.user.id, req.user.email);
    return { students };
  }

  @Post("links/:id/accept")
  async accept(@Request() req: SeekerAuthRequest, @Param("id") id: string) {
    const link = await this.guardianService.acceptInvite(req.user.id, req.user.email, id);
    return { guardianLink: link };
  }

  @Post("links/:id/consent")
  async consent(@Request() req: SeekerAuthRequest, @Param("id") id: string) {
    await this.guardianService.recordConsentForLink(req.user.id, req.user.email, id);
    return { recorded: true };
  }
}
