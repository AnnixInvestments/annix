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
import { CreateJobPostingDto, UpdateJobPostingDto } from "../dto/job-posting.dto";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { JobPostingService } from "../services/job-posting.service";

@Controller("cv-assistant/job-postings")
@UseGuards(CvAssistantAuthGuard)
export class JobPostingController {
  constructor(private readonly jobPostingService: JobPostingService) {}

  @Post()
  async create(@Request() req: { user: { companyId: number } }, @Body() dto: CreateJobPostingDto) {
    return this.jobPostingService.create(req.user.companyId, dto);
  }

  @Get()
  async findAll(@Request() req: { user: { companyId: number } }, @Query("status") status?: string) {
    return this.jobPostingService.findAll(req.user.companyId, status);
  }

  @Get(":id")
  async findById(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.findById(req.user.companyId, id);
  }

  @Patch(":id")
  async update(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateJobPostingDto,
  ) {
    return this.jobPostingService.update(req.user.companyId, id, dto);
  }

  @Delete(":id")
  async delete(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.jobPostingService.delete(req.user.companyId, id);
    return { message: "Job posting deleted successfully" };
  }

  @Post(":id/activate")
  async activate(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.activate(req.user.companyId, id);
  }

  @Post(":id/pause")
  async pause(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.pause(req.user.companyId, id);
  }

  @Post(":id/close")
  async close(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.jobPostingService.close(req.user.companyId, id);
  }
}
