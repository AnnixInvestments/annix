import { Controller, Get, NotFoundException, Param, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { SageExportFilterDto } from "./dto/sage-export.dto";
import type { SageAdapterContext } from "./interfaces/sage-invoice-adapter.interface";
import { SageAdapterRegistry } from "./sage-adapter-registry.service";
import { SageExportService } from "./sage-export.service";

@ApiTags("Sage Export (Unified)")
@Controller("sage-export")
export class SageExportController {
  constructor(
    private readonly registry: SageAdapterRegistry,
    private readonly sageExportService: SageExportService,
  ) {}

  @Get("adapters")
  @ApiOperation({ summary: "List all registered Sage export adapters" })
  registeredAdapters() {
    return this.registry.allAdapters().map((reg) => ({
      moduleCode: reg.moduleCode,
      adapterKey: reg.adapterKey,
      label: reg.label,
    }));
  }

  @Get(":moduleCode/:adapterKey/preview")
  @ApiOperation({ summary: "Preview exportable invoices for a specific adapter" })
  @ApiParam({ name: "moduleCode", description: "Module code (e.g. stock-control, au-rubber)" })
  @ApiParam({ name: "adapterKey", description: "Adapter key (e.g. invoices, cocs)" })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "excludeExported", required: false })
  @ApiQuery({ name: "invoiceType", required: false })
  async preview(
    @Param("moduleCode") moduleCode: string,
    @Param("adapterKey") adapterKey: string,
    @Query() filters: SageExportFilterDto,
    @Query("companyId") companyId?: string,
  ) {
    const adapter = this.registry.adapterByKey(moduleCode, adapterKey);
    if (!adapter) {
      throw new NotFoundException(`No Sage adapter registered for ${moduleCode}:${adapterKey}`);
    }

    const context: SageAdapterContext = {
      companyId: companyId ? Number(companyId) : null,
      appKey: moduleCode,
    };

    return adapter.previewCount(filters, context);
  }

  @Get(":moduleCode/:adapterKey/csv")
  @ApiOperation({ summary: "Download Sage CSV export for a specific adapter" })
  @ApiParam({ name: "moduleCode", description: "Module code" })
  @ApiParam({ name: "adapterKey", description: "Adapter key" })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "excludeExported", required: false })
  @ApiQuery({ name: "invoiceType", required: false })
  async downloadCsv(
    @Param("moduleCode") moduleCode: string,
    @Param("adapterKey") adapterKey: string,
    @Query() filters: SageExportFilterDto,
    @Query("companyId") companyId: string | undefined,
    @Res() res: Response,
  ) {
    const adapter = this.registry.adapterByKey(moduleCode, adapterKey);
    if (!adapter) {
      throw new NotFoundException(`No Sage adapter registered for ${moduleCode}:${adapterKey}`);
    }

    const context: SageAdapterContext = {
      companyId: companyId ? Number(companyId) : null,
      appKey: moduleCode,
    };

    const { invoices, entityIds } = await adapter.exportableInvoices(filters, context);
    const csvBuffer = this.sageExportService.generateCsv(invoices);
    await adapter.markExported(entityIds, context);

    const filename = `sage-export-${moduleCode}-${adapterKey}.csv`;
    res.set({
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(csvBuffer.length),
    });
    res.send(csvBuffer);
  }
}
