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
  CreateAnnixOrbitRecruiterInterviewDto,
  UpdateAnnixOrbitRecruiterInterviewDto,
} from "../dto/annix-orbit-recruiter-interview.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRecruiterInterviewService } from "../services/annix-orbit-recruiter-interview.service";

@Controller("annix-orbit/recruiter-interviews")
@UseGuards(AnnixOrbitAuthGuard)
export class AnnixOrbitRecruiterInterviewController {
  constructor(private readonly interviewService: AnnixOrbitRecruiterInterviewService) {}

  @Get()
  findAll(@Request() req: { user: { companyId: number } }) {
    return this.interviewService.findForCompany(req.user.companyId);
  }

  @Get(":id")
  findOne(@Request() req: { user: { companyId: number } }, @Param("id", ParseIntPipe) id: number) {
    return this.interviewService.findByIdForCompany(id, req.user.companyId);
  }

  @Post()
  create(
    @Request() req: { user: { companyId: number } },
    @Body() dto: CreateAnnixOrbitRecruiterInterviewDto,
  ) {
    return this.interviewService.create(req.user.companyId, dto);
  }

  @Put(":id")
  update(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAnnixOrbitRecruiterInterviewDto,
  ) {
    return this.interviewService.update(id, req.user.companyId, dto);
  }

  @Delete(":id")
  async remove(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.interviewService.remove(id, req.user.companyId);
    return { success: true };
  }
}
