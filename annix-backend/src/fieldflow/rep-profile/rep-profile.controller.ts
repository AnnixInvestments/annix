import { Body, Controller, Get, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { FieldFlowAuthGuard } from "../auth";
import {
  CreateRepProfileDto,
  RepProfileResponseDto,
  RepProfileStatusDto,
  UpdateRepProfileDto,
} from "./rep-profile.dto";
import { RepProfile } from "./rep-profile.entity";
import { RepProfileService } from "./rep-profile.service";

interface FieldFlowRequest extends Request {
  fieldflowUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("FieldFlow - Rep Profile")
@Controller("fieldflow/rep-profile")
@UseGuards(FieldFlowAuthGuard)
@ApiBearerAuth()
export class RepProfileController {
  constructor(private readonly repProfileService: RepProfileService) {}

  @Get("status")
  @ApiOperation({ summary: "Check if rep has completed initial setup" })
  @ApiResponse({ status: 200, type: RepProfileStatusDto })
  async setupStatus(@Req() req: FieldFlowRequest): Promise<RepProfileStatusDto> {
    const { setupCompleted, profile } = await this.repProfileService.setupStatus(
      req.fieldflowUser.userId,
    );
    return {
      setupCompleted,
      profile: profile ? this.toResponse(profile) : null,
    };
  }

  @Get()
  @ApiOperation({ summary: "Get current rep profile" })
  @ApiResponse({ status: 200, type: RepProfileResponseDto })
  async profile(@Req() req: FieldFlowRequest): Promise<RepProfileResponseDto | null> {
    const profile = await this.repProfileService.profileByUserId(req.fieldflowUser.userId);
    return profile ? this.toResponse(profile) : null;
  }

  @Post()
  @ApiOperation({ summary: "Create rep profile (initial setup)" })
  @ApiResponse({ status: 201, type: RepProfileResponseDto })
  async createProfile(
    @Req() req: FieldFlowRequest,
    @Body() dto: CreateRepProfileDto,
  ): Promise<RepProfileResponseDto> {
    const profile = await this.repProfileService.createProfile(req.fieldflowUser.userId, dto);
    return this.toResponse(profile);
  }

  @Patch()
  @ApiOperation({ summary: "Update rep profile" })
  @ApiResponse({ status: 200, type: RepProfileResponseDto })
  async updateProfile(
    @Req() req: FieldFlowRequest,
    @Body() dto: UpdateRepProfileDto,
  ): Promise<RepProfileResponseDto> {
    const profile = await this.repProfileService.updateProfile(req.fieldflowUser.userId, dto);
    return this.toResponse(profile);
  }

  @Post("complete-setup")
  @ApiOperation({ summary: "Mark setup as completed" })
  @ApiResponse({ status: 200, type: RepProfileResponseDto })
  async completeSetup(@Req() req: FieldFlowRequest): Promise<RepProfileResponseDto> {
    const profile = await this.repProfileService.completeSetup(req.fieldflowUser.userId);
    return this.toResponse(profile);
  }

  @Get("search-terms")
  @ApiOperation({ summary: "Get search terms for prospect discovery based on profile" })
  @ApiResponse({ status: 200, type: [String] })
  async searchTerms(@Req() req: FieldFlowRequest): Promise<string[]> {
    return this.repProfileService.searchTermsForUser(req.fieldflowUser.userId);
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
