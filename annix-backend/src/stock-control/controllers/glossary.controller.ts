import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { GlossaryService } from "../services/glossary.service";

@ApiTags("Stock Control - Glossary")
@Controller("stock-control/glossary")
export class GlossaryController {
  constructor(private readonly glossaryService: GlossaryService) {}

  @UseGuards(StockControlAuthGuard)
  @Get()
  @ApiOperation({ summary: "List all glossary terms for company" })
  async terms(@Req() req: any) {
    return this.glossaryService.termsForCompany(req.user.companyId);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Put(":abbreviation")
  @ApiOperation({ summary: "Create or update a glossary term" })
  async upsertTerm(
    @Req() req: any,
    @Param("abbreviation") abbreviation: string,
    @Body() body: { term: string; definition: string; category?: string | null },
  ) {
    return this.glossaryService.upsertTerm(req.user.companyId, {
      abbreviation,
      ...body,
    });
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Delete(":abbreviation")
  @ApiOperation({ summary: "Delete a custom glossary term (reverts to default)" })
  async removeTerm(@Req() req: any, @Param("abbreviation") abbreviation: string) {
    await this.glossaryService.removeTerm(req.user.companyId, abbreviation);
    return { deleted: true };
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Delete()
  @ApiOperation({ summary: "Reset all glossary terms to defaults" })
  async resetToDefaults(@Req() req: any) {
    await this.glossaryService.resetToDefaults(req.user.companyId);
    return { reset: true };
  }
}
