import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  CreateAnnixOrbitTalentCredentialDto,
  UpdateAnnixOrbitTalentCredentialDto,
} from "../dto/annix-orbit-talent-credential.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitTalentCredentialService } from "../services/annix-orbit-talent-credential.service";
import { DEFAULT_EXPIRY_WARN_DAYS } from "../services/credential-expiry";
import { OrbitCredentialTypeService } from "../services/orbit-credential-type.service";

interface RecruiterAuthRequest {
  user: { companyId: number; id: number };
}

@Controller("annix-orbit")
@UseGuards(AnnixOrbitAuthGuard)
export class AnnixOrbitTalentCredentialController {
  constructor(
    private readonly credentialService: AnnixOrbitTalentCredentialService,
    private readonly credentialTypeService: OrbitCredentialTypeService,
  ) {}

  // Active credential types for the passport editor dropdown.
  @Get("talent-credentials/types")
  async types() {
    const types = await this.credentialTypeService.listActive();
    return { types };
  }

  // Company-wide expiring/expired summary — powers the dashboard
  // "Compliance Alerts" card (#362).
  @Get("talent-credentials/expiring")
  expiring(@Request() req: RecruiterAuthRequest, @Query("withinDays") withinDaysRaw?: string) {
    const parsed = withinDaysRaw ? Number.parseInt(withinDaysRaw, 10) : DEFAULT_EXPIRY_WARN_DAYS;
    const withinDays = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EXPIRY_WARN_DAYS;
    return this.credentialService.expiringSummaryForCompany(req.user.companyId, withinDays);
  }

  // Company-wide site-ready scores keyed by candidate (#362 phase 4) —
  // consumed by the candidate-list facet and the dashboard signal.
  @Get("talent-credentials/site-ready-scores")
  siteReadyScores(@Request() req: RecruiterAuthRequest) {
    return this.credentialService.siteReadyScoresForCompany(req.user.companyId, req.user.id);
  }

  @Get("talent-candidates/:candidateId/credentials")
  list(
    @Request() req: RecruiterAuthRequest,
    @Param("candidateId", ParseIntPipe) candidateId: number,
  ) {
    return this.credentialService.listForCandidate(candidateId, req.user.companyId);
  }

  @Get("talent-candidates/:candidateId/site-ready")
  siteReady(
    @Request() req: RecruiterAuthRequest,
    @Param("candidateId", ParseIntPipe) candidateId: number,
  ) {
    return this.credentialService.siteReadyForCandidate(candidateId, req.user.companyId);
  }

  @Post("talent-candidates/:candidateId/credentials")
  create(
    @Request() req: RecruiterAuthRequest,
    @Param("candidateId", ParseIntPipe) candidateId: number,
    @Body() dto: CreateAnnixOrbitTalentCredentialDto,
  ) {
    return this.credentialService.create(candidateId, req.user.companyId, dto);
  }

  @Patch("talent-candidates/:candidateId/credentials/:id")
  update(
    @Request() req: RecruiterAuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitTalentCredentialDto,
  ) {
    return this.credentialService.update(id, req.user.companyId, dto);
  }

  @Delete("talent-candidates/:candidateId/credentials/:id")
  async remove(@Request() req: RecruiterAuthRequest, @Param("id", ParseIntPipe) id: number) {
    await this.credentialService.remove(id, req.user.companyId);
    return { success: true };
  }
}
