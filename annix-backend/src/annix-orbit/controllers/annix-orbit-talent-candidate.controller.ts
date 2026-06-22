import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  CreateAnnixOrbitTalentCandidateDto,
  UpdateAnnixOrbitTalentCandidateDto,
} from "../dto/annix-orbit-talent-candidate.dto";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { AnnixOrbitTalentCandidateService } from "../services/annix-orbit-talent-candidate.service";

const CV_MAX_BYTES = 10 * 1024 * 1024;

@Controller("annix-orbit/talent-candidates")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.VIEWER)
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

  @Get("extract-estimate")
  async extractEstimate() {
    return this.candidateService.extractEstimates();
  }

  @Post("extract-cv")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: CV_MAX_BYTES } }))
  async extractCv(
    @Request() req: { user: { companyId: number } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("No CV file was uploaded");
    }
    return this.candidateService.extractCvAutofill(req.user.companyId, file);
  }

  @Post()
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  create(
    @Request() req: { user: { companyId: number; id: number } },
    @Body() dto: CreateAnnixOrbitTalentCandidateDto,
  ) {
    return this.candidateService.create(req.user.companyId, req.user.id, dto);
  }

  @Put(":id")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  update(
    @Request() req: { user: { companyId: number; id: number; name: string } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitTalentCandidateDto,
  ) {
    return this.candidateService.update(
      id,
      req.user.companyId,
      { id: req.user.id, name: req.user.name },
      dto,
    );
  }

  @Delete(":id")
  @AnnixOrbitRoles(AnnixOrbitRole.ADMIN)
  async remove(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.candidateService.remove(id, req.user.companyId);
    return { success: true };
  }
}
