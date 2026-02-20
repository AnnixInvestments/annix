import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard } from "../auth";
import { DiscoveryService } from "./discovery.service";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

import {
  DiscoveredBusiness,
  DiscoverProspectsDto,
  DiscoveryImportResult,
  DiscoveryQuota,
  DiscoverySearchResult,
} from "./dto";

@ApiTags("Discovery")
@Controller("annix-rep/discovery")
@UseGuards(AnnixRepAuthGuard)
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post("search")
  @ApiOperation({ summary: "Search for businesses to discover as prospects" })
  @ApiResponse({ status: 200, type: DiscoverySearchResult })
  async search(
    @Req() req: AnnixRepRequest,
    @Body() dto: DiscoverProspectsDto,
  ): Promise<DiscoverySearchResult> {
    return this.discoveryService.search(req.annixRepUser.userId, dto);
  }

  @Post("import")
  @ApiOperation({ summary: "Import discovered businesses as prospects" })
  @ApiResponse({ status: 201, type: DiscoveryImportResult })
  async importBusinesses(
    @Req() req: AnnixRepRequest,
    @Body() businesses: DiscoveredBusiness[],
  ): Promise<DiscoveryImportResult> {
    return this.discoveryService.importBusinesses(req.annixRepUser.userId, businesses);
  }

  @Get("quota")
  @ApiOperation({ summary: "Get discovery API quota status" })
  @ApiResponse({ status: 200, type: DiscoveryQuota })
  quota(): DiscoveryQuota {
    return this.discoveryService.quota();
  }
}
