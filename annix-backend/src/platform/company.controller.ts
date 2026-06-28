import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CompanyService } from "./company.service";
import { PlatformCompanyAuthGuard } from "./platform-company-auth.guard";

interface PlatformCompanyCaller {
  companyId: number;
}

type PlatformCompanyRequest = Request & {
  user?: PlatformCompanyCaller;
};

@ApiTags("Companies (Unified)")
@Controller("platform/companies")
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get(":companyId")
  @UseGuards(PlatformCompanyAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get company by ID" })
  @ApiParam({ name: "companyId", type: Number })
  findOne(@Param("companyId", ParseIntPipe) companyId: number, @Req() req: PlatformCompanyRequest) {
    this.assertCanReadCompany(companyId, req.user);
    return this.companyService.findById(companyId);
  }

  @Get(":companyId/modules")
  @UseGuards(PlatformCompanyAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get active module codes for a company" })
  @ApiParam({ name: "companyId", type: Number })
  activeModules(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Req() req: PlatformCompanyRequest,
  ) {
    this.assertCanReadCompany(companyId, req.user);
    return this.companyService.activeModules(companyId);
  }

  @Post(":companyId/modules/:moduleCode/enable")
  @UseGuards(AdminAuthGuard, RolesGuard)
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
  @UseGuards(AdminAuthGuard, RolesGuard)
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

  private assertCanReadCompany(companyId: number, caller?: PlatformCompanyCaller): void {
    if (caller?.companyId === companyId) {
      return;
    }

    throw new ForbiddenException("You do not have access to this company.");
  }
}
