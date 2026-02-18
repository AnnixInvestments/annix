import { Body, Controller, Get, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard } from "../auth";
import {
  CreateRepProfileDto,
  RepProfileResponseDto,
  RepProfileStatusDto,
  UpdateRepProfileDto,
} from "./rep-profile.dto";
import { RepProfile } from "./rep-profile.entity";
import { RepProfileService } from "./rep-profile.service";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Rep - Rep Profile")
@Controller("annix-rep/rep-profile")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class RepProfileController {
  constructor(private readonly repProfileService: RepProfileService) {}

  @Get("status")
  @ApiOperation({ summary: "Check if rep has completed initial setup" })
  @ApiResponse({ status: 200, type: RepProfileStatusDto })
  async setupStatus(@Req() req: AnnixRepRequest): Promise<RepProfileStatusDto> {
    const { setupCompleted, profile } = await this.repProfileService.setupStatus(
      req.annixRepUser.userId,
    );
    return {
      setupCompleted,
      profile: profile ? this.toResponse(profile) : null,
    };
  }

  @Get()
  @ApiOperation({ summary: "Get current rep profile" })
  @ApiResponse({ status: 200, type: RepProfileResponseDto })
  async profile(@Req() req: AnnixRepRequest): Promise<RepProfileResponseDto | null> {
    const profile = await this.repProfileService.profileByUserId(req.annixRepUser.userId);
    return profile ? this.toResponse(profile) : null;
  }

  @Post()
  @ApiOperation({ summary: "Create rep profile (initial setup)" })
  @ApiResponse({ status: 201, type: RepProfileResponseDto })
  async createProfile(
    @Req() req: AnnixRepRequest,
    @Body() dto: CreateRepProfileDto,
  ): Promise<RepProfileResponseDto> {
    const profile = await this.repProfileService.createProfile(req.annixRepUser.userId, dto);
    return this.toResponse(profile);
  }

  @Patch()
  @ApiOperation({ summary: "Update rep profile" })
  @ApiResponse({ status: 200, type: RepProfileResponseDto })
  async updateProfile(
    @Req() req: AnnixRepRequest,
    @Body() dto: UpdateRepProfileDto,
  ): Promise<RepProfileResponseDto> {
    const profile = await this.repProfileService.updateProfile(req.annixRepUser.userId, dto);
    return this.toResponse(profile);
  }

  @Post("complete-setup")
  @ApiOperation({ summary: "Mark setup as completed" })
  @ApiResponse({ status: 200, type: RepProfileResponseDto })
  async completeSetup(@Req() req: AnnixRepRequest): Promise<RepProfileResponseDto> {
    const profile = await this.repProfileService.completeSetup(req.annixRepUser.userId);
    return this.toResponse(profile);
  }

  @Get("search-terms")
  @ApiOperation({ summary: "Get search terms for prospect discovery based on profile" })
  @ApiResponse({ status: 200, type: [String] })
  async searchTerms(@Req() req: AnnixRepRequest): Promise<string[]> {
    return this.repProfileService.searchTermsForUser(req.annixRepUser.userId);
  }

  private toResponse(profile: RepProfile): RepProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      industry: profile.industry,
      subIndustries: profile.subIndustries,
      productCategories: profile.productCategories,
      companyName: profile.companyName,
      jobTitle: profile.jobTitle,
      territoryDescription: profile.territoryDescription,
      defaultSearchLatitude: profile.defaultSearchLatitude,
      defaultSearchLongitude: profile.defaultSearchLongitude,
      defaultSearchRadiusKm: profile.defaultSearchRadiusKm,
      targetCustomerProfile: profile.targetCustomerProfile,
      customSearchTerms: profile.customSearchTerms,
      setupCompleted: profile.setupCompleted,
      setupCompletedAt: profile.setupCompletedAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
