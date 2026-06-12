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
import { CreateAnnixOrbitJobDto, UpdateAnnixOrbitJobDto } from "../dto/annix-orbit-job.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitJobService } from "../services/annix-orbit-job.service";

@Controller("annix-orbit/recruiter-jobs")
@UseGuards(AnnixOrbitAuthGuard)
export class AnnixOrbitJobController {
  constructor(private readonly jobService: AnnixOrbitJobService) {}

  @Get()
  findAll(@Request() req: { user: { companyId: number } }) {
    return this.jobService.findForCompany(req.user.companyId);
  }

  @Get(":id")
  findOne(@Request() req: { user: { companyId: number } }, @Param("id", ParseIntPipe) id: number) {
    return this.jobService.findByIdForCompany(id, req.user.companyId);
  }

  @Get(":id/matches")
  matches(
    @Request() req: { user: { companyId: number; id: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobService.matchesForJob(id, req.user.companyId, req.user.id);
  }

  @Post()
  create(@Request() req: { user: { companyId: number } }, @Body() dto: CreateAnnixOrbitJobDto) {
    return this.jobService.createWithEmbedding(req.user.companyId, dto);
  }

  @Put(":id")
  update(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitJobDto,
  ) {
    return this.jobService.update(id, req.user.companyId, dto);
  }

  @Delete(":id")
  async remove(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.jobService.remove(id, req.user.companyId);
    return { success: true };
  }
}
