import { Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { CompanyService } from "./company.service";

@ApiTags("Companies (Unified)")
@Controller("platform/companies")
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get(":companyId")
  @ApiOperation({ summary: "Get company by ID" })
  @ApiParam({ name: "companyId", type: Number })
  findOne(@Param("companyId", ParseIntPipe) companyId: number) {
    return this.companyService.findById(companyId);
  }

  @Get(":companyId/modules")
  @ApiOperation({ summary: "Get active module codes for a company" })
  @ApiParam({ name: "companyId", type: Number })
  activeModules(@Param("companyId", ParseIntPipe) companyId: number) {
    return this.companyService.activeModules(companyId);
  }

  @Post(":companyId/modules/:moduleCode/enable")
  @ApiOperation({ summary: "Enable a module for a company" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "moduleCode", type: String })
  enableModule(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("moduleCode") moduleCode: string,
  ) {
    return this.companyService.enableModule(companyId, moduleCode);
  }

  @Post(":companyId/modules/:moduleCode/disable")
  @ApiOperation({ summary: "Disable a module for a company" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "moduleCode", type: String })
  disableModule(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("moduleCode") moduleCode: string,
  ) {
    return this.companyService.disableModule(companyId, moduleCode);
  }
}
