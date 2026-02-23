import * as path from "node:path";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { UpdateCandidateStatusDto } from "../dto/candidate.dto";
import { CandidateStatus } from "../entities/candidate.entity";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { CandidateService } from "../services/candidate.service";
import { ReferenceService } from "../services/reference.service";
import { WorkflowAutomationService } from "../services/workflow-automation.service";

@Controller("cv-assistant/candidates")
@UseGuards(CvAssistantAuthGuard)
export class CandidateController {
  constructor(
    private readonly candidateService: CandidateService,
    private readonly referenceService: ReferenceService,
    private readonly workflowService: WorkflowAutomationService,
  ) {}

  @Get()
  async findAll(
    @Request() req: { user: { companyId: number } },
    @Query("status") status?: string,
    @Query("jobPostingId") jobPostingId?: string,
  ) {
    return this.candidateService.findAllForCompany(req.user.companyId, {
      status,
      jobPostingId: jobPostingId ? parseInt(jobPostingId, 10) : undefined,
    });
  }

  @Get("top")
  async topCandidates(
    @Request() req: { user: { companyId: number } },
    @Query("limit") limit?: string,
  ) {
    return this.candidateService.topCandidates(
      req.user.companyId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get("stats")
  async stats(@Request() req: { user: { companyId: number } }) {
    return this.candidateService.stats(req.user.companyId);
  }

  @Get("job/:jobPostingId")
  async findByJobPosting(
    @Request() req: { user: { companyId: number } },
    @Param("jobPostingId", ParseIntPipe) jobPostingId: number,
    @Query("status") status?: string,
  ) {
    return this.candidateService.findByJobPosting(req.user.companyId, jobPostingId, status);
  }

  @Get(":id")
  async findById(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.candidateService.findById(req.user.companyId, id);
  }

  @Patch(":id/status")
  async updateStatus(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCandidateStatusDto,
  ) {
    return this.candidateService.updateStatus(
      req.user.companyId,
      id,
      dto.status as CandidateStatus,
    );
  }

  @Post(":id/reject")
  async reject(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.workflowService.manualReject(id, req.user.companyId);
    return { message: "Candidate rejected" };
  }

  @Post(":id/shortlist")
  async shortlist(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.workflowService.manualShortlist(id, req.user.companyId);
    return { message: "Candidate shortlisted" };
  }

  @Post(":id/accept")
  async accept(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.workflowService.manualAccept(id, req.user.companyId);
    return { message: "Candidate accepted" };
  }

  @Post(":id/send-reference-requests")
  async sendReferenceRequests(
    @Request() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.candidateService.findById(req.user.companyId, id);
    const count = await this.referenceService.sendReferenceRequests(id);
    return { message: `Sent ${count} reference request(s)` };
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads/cv-assistant/manual",
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
          cb(null, true);
        } else {
          cb(new Error("Only PDF files are allowed"), false);
        }
      },
    }),
  )
  async uploadCv(
    @Request() req: { user: { companyId: number } },
    @UploadedFile() file: Express.Multer.File,
    @Body("jobPostingId") jobPostingId: string,
    @Body("email") email?: string,
    @Body("name") name?: string,
  ) {
    const candidate = await this.candidateService.create(parseInt(jobPostingId, 10), {
      email: email || null,
      name: name || null,
      cvFilePath: file.path,
    });

    await this.workflowService.processCandidateCv(candidate.id);

    return this.candidateService.findById(req.user.companyId, candidate.id);
  }
}
