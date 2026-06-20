import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CreateRubberBondingAgentDto,
  RubberBondingAgentCommitImportDto,
  UpdateRubberBondingAgentDto,
} from "../dto/rubber-bonding-agent.dto";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlOnboardingGuard } from "../guards/stock-control-onboarding.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { RubberBondingAgentService } from "../services/rubber-bonding-agent.service";
import { RubberPriceListExtractionService } from "../services/rubber-price-list-extraction.service";

@ApiTags("Stock Control - Rubber Bonding Agents")
@Controller("stock-control/rubber-bonding-agents")
@UseGuards(StockControlAuthGuard, StockControlOnboardingGuard, StockControlRoleGuard)
@StockControlRoles("admin", "manager")
export class RubberBondingAgentController {
  constructor(
    private readonly agentService: RubberBondingAgentService,
    private readonly extractionService: RubberPriceListExtractionService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List rubber bonding agents with computed per-m² pricing" })
  async list(@Req() req: any) {
    return this.agentService.list(req.user.companyId);
  }

  @Post()
  @ApiOperation({ summary: "Create a rubber bonding agent" })
  async create(@Req() req: any, @Body() dto: CreateRubberBondingAgentDto) {
    return this.agentService.create(req.user.companyId, dto);
  }

  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Extract a bonding-agent price list (PDF/image/sheet) into rows" })
  async importPreview(@UploadedFile() file: Express.Multer.File) {
    return this.extractionService.extractBondingAgents(file);
  }

  @Post("import/commit")
  @ApiOperation({ summary: "Save extracted bonding-agent rows (replace-by-supplier or append)" })
  async commitImport(@Req() req: any, @Body() dto: RubberBondingAgentCommitImportDto) {
    const imported = dto.replaceSupplier
      ? await this.agentService.replaceSupplier(req.user.companyId, dto.supplier, dto.rows)
      : await this.agentService.addMany(req.user.companyId, dto.rows);
    return { imported };
  }

  @Post("seed")
  @ApiOperation({ summary: "Seed bonding agents from product data when empty" })
  async seed(@Req() req: any) {
    return this.agentService.seedFromProductData(req.user.companyId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a rubber bonding agent" })
  async update(
    @Req() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateRubberBondingAgentDto,
  ) {
    return this.agentService.update(req.user.companyId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a rubber bonding agent" })
  async remove(@Req() req: any, @Param("id", ParseIntPipe) id: number) {
    await this.agentService.remove(req.user.companyId, id);
    return { success: true };
  }
}
