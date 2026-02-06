import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { FeatureFlagsService } from './feature-flags.service';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  AllFlagsResponseDto,
  FeatureFlagDetailDto,
  UpdateFeatureFlagDto,
  FeatureFlagDto,
} from './dto/feature-flags.dto';

@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags (public)' })
  @ApiResponse({
    status: 200,
    description: 'Feature flags returned',
    type: AllFlagsResponseDto,
  })
  async allFlags(): Promise<Record<string, boolean>> {
    return this.featureFlagsService.allFlags();
  }

  @Get('detailed')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all feature flags with details (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Detailed feature flags returned',
    type: FeatureFlagDetailDto,
  })
  async allFlagsDetailed(): Promise<{ flags: FeatureFlagDto[] }> {
    const flags = await this.featureFlagsService.allFlagsDetailed();
    return { flags };
  }

  @Put()
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a feature flag (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Feature flag updated',
    type: FeatureFlagDto,
  })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async updateFlag(@Body() dto: UpdateFeatureFlagDto): Promise<FeatureFlagDto> {
    return this.featureFlagsService.updateFlag(dto.flagKey, dto.enabled);
  }
}
