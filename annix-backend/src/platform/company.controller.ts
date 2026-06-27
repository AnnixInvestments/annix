import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CompanyService } from "./company.service";

@ApiTags("Companies (Unified)")
@Controller("platform/companies")
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get(":companyId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  // TODO(#395): scope to the caller's own company once the JWT carries companyId — currently authenticated-only.
  @ApiOperation({ summary: "Get company by ID" })
  @ApiParam({ name: "companyId", type: Number })
  findOne(@Param("companyId", ParseIntPipe) companyId: number) {
    return this.companyService.findById(companyId);
  }

  @Get(":companyId/modules")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  // TODO(#395): scope to the caller's own company once the JWT carries companyId — currently authenticated-only.
  @ApiOperation({ summary: "Get active module codes for a company" })
  @ApiParam({ name: "companyId", type: Number })
  activeModules(@Param("companyId", ParseIntPipe) companyId: number) {
    return this.companyService.activeModules(companyId);
  }

  @Post(":companyId/modules/:moduleCode/enable")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "employee")
  @ApiBearerAuth()
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
