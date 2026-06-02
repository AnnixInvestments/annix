import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  CreateAnnixOrbitTalentCandidateDto,
  UpdateAnnixOrbitTalentCandidateDto,
} from "../dto/annix-orbit-talent-candidate.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitTalentCandidateService } from "../services/annix-orbit-talent-candidate.service";

@Controller("annix-orbit/talent-candidates")
@UseGuards(AnnixOrbitAuthGuard)
export class AnnixOrbitTalentCandidateController {
  constructor(private readonly candidateService: AnnixOrbitTalentCandidateService) {}

  @Get()
  findAll(@Request() req: { user: { companyId: number; id: number } }) {
    return this.candidateService.findForCompany(req.user.companyId, req.user.id);
  }

  @Get(":id")
  findOne(@Request() req: { user: { companyId: number } }, @Param("id", ParseIntPipe) id: number) {
    return this.candidateService.findByIdForCompany(id, req.user.companyId);
  }

  @Post()
  create(
    @Request() req: { user: { companyId: number; id: number } },
    @Body() dto: CreateAnnixOrbitTalentCandidateDto,
  ) {
    return this.candidateService.create(req.user.companyId, req.user.id, dto);
  }

  @Put(":id")
  update(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitTalentCandidateDto,
  ) {
    return this.candidateService.update(id, req.user.companyId, dto);
  }

  @Delete(":id")
  async remove(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.candidateService.remove(id, req.user.companyId);
    return { success: true };
  }
}
