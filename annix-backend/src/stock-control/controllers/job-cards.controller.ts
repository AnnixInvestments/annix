import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { JobCardService } from "../services/job-card.service";

@ApiTags("Stock Control - Job Cards")
@Controller("stock-control/job-cards")
@UseGuards(StockControlAuthGuard)
export class JobCardsController {
  constructor(private readonly jobCardService: JobCardService) {}

  @Get()
  @ApiOperation({ summary: "List job cards with optional status filter" })
  async list(@Query("status") status?: string) {
    return this.jobCardService.findAll(status);
  }

  @Get(":id")
  @ApiOperation({ summary: "Job card by ID" })
  async findById(@Param("id") id: number) {
    return this.jobCardService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a job card" })
  async create(@Body() body: any, @Req() req: any) {
    return this.jobCardService.create({ ...body, createdBy: req.user.name });
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a job card" })
  async update(@Param("id") id: number, @Body() body: any) {
    return this.jobCardService.update(id, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a job card" })
  async remove(@Param("id") id: number) {
    return this.jobCardService.remove(id);
  }

  @Post(":id/allocate")
  @ApiOperation({ summary: "Allocate stock to a job card" })
  async allocateStock(@Param("id") id: number, @Body() body: any, @Req() req: any) {
    return this.jobCardService.allocateStock({
      ...body,
      jobCardId: id,
      allocatedBy: req.user.name,
    });
  }

  @Get(":id/allocations")
  @ApiOperation({ summary: "Allocations for a job card" })
  async allocations(@Param("id") id: number) {
    return this.jobCardService.allocationsByJobCard(id);
  }
}
