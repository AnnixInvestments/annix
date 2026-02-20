import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { JobCardService } from "../services/job-card.service";

@ApiTags("Stock Control - Job Cards")
@Controller("stock-control/job-cards")
@UseGuards(StockControlAuthGuard, StockControlRoleGuard)
export class JobCardsController {
  constructor(private readonly jobCardService: JobCardService) {}

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
    return this.jobCardService.update(req.user.companyId, id, body);
  }

  @StockControlRoles("manager", "admin")
  @Delete(":id")
  @ApiOperation({ summary: "Delete a job card" })
  async remove(@Req() req: any, @Param("id") id: number) {
    return this.jobCardService.remove(req.user.companyId, id);
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
}
