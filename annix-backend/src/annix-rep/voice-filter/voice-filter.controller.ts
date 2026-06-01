import { Body, Controller, Delete, Get, Put, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AnnixRepAuthGuard } from "../auth";
import { UpsertVoiceProfileDto, VoiceProfileResponseDto } from "./voice-filter.dto";
import { VoiceProfile } from "./voice-filter.entity";
import { VoiceFilterService } from "./voice-filter.service";

interface AnnixRepRequest extends Request {
  annixRepUser: {
    userId: number;
    email: string;
    sessionToken: string;
  };
}

@ApiTags("Annix Pulse - Voice Filter")
@Controller("annix-rep/voice-filter")
@UseGuards(AnnixRepAuthGuard)
@ApiBearerAuth()
export class VoiceFilterController {
  constructor(private readonly voiceFilterService: VoiceFilterService) {}

  @Get("profile")
  @ApiOperation({ summary: "Get the current user's voice profile / enrollment status" })
  @ApiResponse({ status: 200, type: VoiceProfileResponseDto })
  async profile(@Req() req: AnnixRepRequest): Promise<VoiceProfileResponseDto | null> {
    const profile = await this.voiceFilterService.profileByUserId(req.annixRepUser.userId);
    return profile ? this.toResponse(profile) : null;
  }

  @Put("profile")
  @ApiOperation({ summary: "Create or update the current user's voice profile" })
  @ApiResponse({ status: 200, type: VoiceProfileResponseDto })
  async upsertProfile(
    @Req() req: AnnixRepRequest,
    @Body() dto: UpsertVoiceProfileDto,
  ): Promise<VoiceProfileResponseDto> {
    const profile = await this.voiceFilterService.upsertProfile(req.annixRepUser.userId, dto);
    return this.toResponse(profile);
  }

  @Delete("profile")
  @ApiOperation({ summary: "Reset the current user's voice enrollment" })
  @ApiResponse({ status: 200, type: VoiceProfileResponseDto })
  async resetProfile(@Req() req: AnnixRepRequest): Promise<VoiceProfileResponseDto | null> {
    const profile = await this.voiceFilterService.resetProfile(req.annixRepUser.userId);
    return profile ? this.toResponse(profile) : null;
  }

  private toResponse(profile: VoiceProfile): VoiceProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      enrolled: profile.enrolled,
      awsSpeakerId: profile.awsSpeakerId,
      awsDomainId: profile.awsDomainId,
      enrolledAt: profile.enrolledAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
