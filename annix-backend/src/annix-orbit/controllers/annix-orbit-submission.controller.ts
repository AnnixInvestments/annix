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
  CreateAnnixOrbitSubmissionDto,
  UpdateAnnixOrbitSubmissionDto,
} from "../dto/annix-orbit-submission.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitSubmissionService } from "../services/annix-orbit-submission.service";

@Controller("annix-orbit/submissions")
@UseGuards(AnnixOrbitAuthGuard)
export class AnnixOrbitSubmissionController {
  constructor(private readonly submissionService: AnnixOrbitSubmissionService) {}

  @Get()
  findAll(@Request() req: { user: { companyId: number } }) {
    return this.submissionService.findForCompany(req.user.companyId);
  }

  @Get(":id")
  findOne(@Request() req: { user: { companyId: number } }, @Param("id", ParseIntPipe) id: number) {
    return this.submissionService.findByIdForCompany(id, req.user.companyId);
  }

  @Post()
  create(
    @Request() req: { user: { companyId: number; id: number; name: string } },
    @Body() dto: CreateAnnixOrbitSubmissionDto,
  ) {
    return this.submissionService.create(
      req.user.companyId,
      { id: req.user.id, name: req.user.name },
      dto,
    );
  }

  @Put(":id")
  update(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitSubmissionDto,
  ) {
    return this.submissionService.update(id, req.user.companyId, dto);
  }

  @Delete(":id")
  async remove(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.submissionService.remove(id, req.user.companyId);
    return { success: true };
  }
}
