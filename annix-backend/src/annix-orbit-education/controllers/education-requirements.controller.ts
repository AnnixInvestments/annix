import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AnnixOrbitAuthGuard } from "../../annix-orbit/guards/annix-orbit-auth.guard";
import { now } from "../../lib/datetime";
import {
  EducationRequirementsReadService,
  type PublicProgrammeRequirements,
} from "../services/education-requirements-read.service";

@ApiTags("Orbit Education Requirements")
@Controller("annix-orbit/education")
@UseGuards(AnnixOrbitAuthGuard)
export class EducationRequirementsController {
  constructor(private readonly readService: EducationRequirementsReadService) {}

  @Get("programmes/:programmeId/requirements")
  @ApiOperation({
    summary: "Approved admission requirements for a programme (+ 'still to be confirmed' flag)",
  })
  requirements(
    @Param("programmeId") programmeId: string,
    @Query("intakeYear") intakeYear?: string,
  ): Promise<PublicProgrammeRequirements> {
    const parsed = Number(intakeYear);
    const year = Number.isNaN(parsed) ? now().year + 1 : parsed;
    return this.readService.approvedForProgramme(programmeId, year);
  }
}
