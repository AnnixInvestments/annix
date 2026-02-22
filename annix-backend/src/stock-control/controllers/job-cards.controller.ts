import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { CoatingAnalysisService } from "../services/coating-analysis.service";
import { JobCardService } from "../services/job-card.service";
import { RequisitionService } from "../services/requisition.service";

@ApiTags("Stock Control - Job Cards")
@Controller("stock-control/job-cards")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class JobCardsController {
  private readonly logger = new Logger(JobCardsController.name);

  constructor(
    private readonly jobCardService: JobCardService,
    private readonly coatingAnalysisService: CoatingAnalysisService,
    private readonly requisitionService: RequisitionService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List job cards with optional status filter" })
  async list(@Req() req: any, @Query("status") status?: string) {
    return this.jobCardService.findAll(req.user.companyId, status);
  }

  @Get(":id")
  @ApiOperation({ summary: "Job card by ID" })
  async findById(@Req() req: any, @Param("id") id: number) {
    return this.jobCardService.findById(req.user.companyId, id);
  }

  @StockControlRoles("manager", "admin")
  @Post()
  @ApiOperation({ summary: "Create a job card" })
  async create(@Body() body: any, @Req() req: any) {
    return this.jobCardService.create(req.user.companyId, { ...body, createdBy: req.user.name });
  }

  @StockControlRoles("manager", "admin")
  @Put(":id")
  @ApiOperation({ summary: "Update a job card" })
  async update(@Req() req: any, @Param("id") id: number, @Body() body: any) {
    const result = await this.jobCardService.update(req.user.companyId, id, body);

    if (body.status === "active") {
      try {
        await this.requisitionService.createFromJobCard(req.user.companyId, id, req.user.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Failed to create requisition for job card ${id}: ${message}`);
      }
    }

    return result;
  }

  @StockControlRoles("manager", "admin")
  @Delete(":id")
  @ApiOperation({ summary: "Delete a job card" })
  async remove(@Req() req: any, @Param("id") id: number) {
    return this.jobCardService.remove(req.user.companyId, id);
  }

  @Get(":id/coating-analysis")
  @ApiOperation({ summary: "Coating analysis for a job card" })
  async coatingAnalysis(@Req() req: any, @Param("id") id: number) {
    return this.coatingAnalysisService.findByJobCard(req.user.companyId, id);
  }

  @Post(":id/coating-analysis")
  @ApiOperation({ summary: "Trigger coating analysis for a job card" })
  async triggerCoatingAnalysis(@Req() req: any, @Param("id") id: number) {
    return this.coatingAnalysisService.analyseJobCard(id, req.user.companyId);
  }

  @Post(":id/allocate")
  @ApiOperation({ summary: "Allocate stock to a job card" })
  async allocateStock(@Param("id") id: number, @Body() body: any, @Req() req: any) {
    return this.jobCardService.allocateStock(req.user.companyId, {
      ...body,
      jobCardId: id,
      allocatedBy: req.user.name,
    });
  }

  @Get(":id/allocations")
  @ApiOperation({ summary: "Allocations for a job card" })
  async allocations(@Req() req: any, @Param("id") id: number) {
    return this.jobCardService.allocationsByJobCard(req.user.companyId, id);
  }

  @Post(":id/allocations/:allocationId/photo")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a photo for an allocation" })
  async uploadAllocationPhoto(
    @Req() req: any,
    @Param("allocationId") allocationId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.jobCardService.uploadAllocationPhoto(req.user.companyId, allocationId, file);
  }
}
