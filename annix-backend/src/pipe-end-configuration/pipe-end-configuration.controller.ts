import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import {
  PipeEndConfigurationService,
  ItemType,
  FlangeConfiguration,
  BoltSetCount,
  StubFlangeConfig,
} from './pipe-end-configuration.service';
import { PipeEndConfiguration } from './entities/pipe-end-configuration.entity';

@ApiTags('Pipe End Configurations')
@Controller('pipe-end-configurations')
export class PipeEndConfigurationController {
  constructor(
    private readonly pipeEndConfigurationService: PipeEndConfigurationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all pipe end configurations' })
  @ApiQuery({
    name: 'itemType',
    required: false,
    enum: ['pipe', 'bend', 'fitting'],
    description: 'Filter by item type',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all pipe end configurations',
    type: [PipeEndConfiguration],
  })
  async findAll(
    @Query('itemType') itemType?: ItemType,
  ): Promise<PipeEndConfiguration[]> {
    if (itemType) {
      return this.pipeEndConfigurationService.findByItemType(itemType);
    }
    return this.pipeEndConfigurationService.findAll();
  }

  @Get(':configCode')
  @ApiOperation({ summary: 'Get pipe end configuration by code' })
  @ApiResponse({
    status: 200,
    description: 'Pipe end configuration details',
    type: PipeEndConfiguration,
  })
  async findByCode(
    @Param('configCode') configCode: string,
  ): Promise<PipeEndConfiguration | null> {
    return this.pipeEndConfigurationService.findByCode(configCode);
  }

  @Get(':configCode/weld-count')
  @ApiOperation({
    summary: 'Get weld count for a specific pipe end configuration',
  })
  @ApiQuery({
    name: 'itemType',
    required: false,
    enum: ['pipe', 'bend', 'fitting'],
    description: 'Item type for validation',
  })
  @ApiResponse({
    status: 200,
    description: 'Number of welds required for the configuration',
  })
  async getWeldCount(
    @Param('configCode') configCode: string,
    @Query('itemType') itemType?: ItemType,
  ): Promise<{ weldCount: number }> {
    const weldCount =
      await this.pipeEndConfigurationService.getWeldCountForConfig(
        configCode,
        itemType,
      );
    return { weldCount };
  }

  @Get(':configCode/flange-configuration')
  @ApiOperation({
    summary: 'Get flange configuration details for a pipe end configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Flange configuration details',
  })
  async getFlangeConfiguration(
    @Param('configCode') configCode: string,
  ): Promise<FlangeConfiguration> {
    return this.pipeEndConfigurationService.getFlangeConfiguration(configCode);
  }

  @Get(':configCode/bolt-set-count')
  @ApiOperation({
    summary: 'Get bolt set count for a pipe end configuration',
  })
  @ApiQuery({
    name: 'hasEqualBranch',
    required: false,
    type: Boolean,
    description: 'Whether branch has same size as main pipe (for fittings)',
  })
  @ApiResponse({
    status: 200,
    description: 'Bolt set count',
  })
  async getBoltSetCount(
    @Param('configCode') configCode: string,
    @Query('hasEqualBranch') hasEqualBranch?: string,
  ): Promise<BoltSetCount> {
    const hasEqual = hasEqualBranch === 'true' || hasEqualBranch === undefined;
    return this.pipeEndConfigurationService.getBoltSetCount(
      configCode,
      hasEqual,
    );
  }

  @Get(':configCode/physical-flange-count')
  @ApiOperation({
    summary: 'Get total physical flange count',
  })
  @ApiResponse({
    status: 200,
    description: 'Total number of physical flanges',
  })
  async getPhysicalFlangeCount(
    @Param('configCode') configCode: string,
  ): Promise<{ count: number }> {
    const count =
      await this.pipeEndConfigurationService.getPhysicalFlangeCount(configCode);
    return { count };
  }

  @Get(':configCode/fixed-flange-count')
  @ApiOperation({
    summary: 'Get fixed flange count and positions',
  })
  @ApiResponse({
    status: 200,
    description: 'Fixed flange count and positions',
  })
  async getFixedFlangeCount(
    @Param('configCode') configCode: string,
  ): Promise<{
    count: number;
    positions: { inlet: boolean; outlet: boolean; branch: boolean };
  }> {
    return this.pipeEndConfigurationService.getFixedFlangeCount(configCode);
  }

  @Get(':configCode/has-loose-flange')
  @ApiOperation({
    summary: 'Check if configuration has loose flanges',
  })
  @ApiResponse({
    status: 200,
    description: 'Whether configuration has loose flanges',
  })
  async hasLooseFlange(
    @Param('configCode') configCode: string,
  ): Promise<{ hasLooseFlange: boolean }> {
    const hasLooseFlange =
      this.pipeEndConfigurationService.hasLooseFlange(configCode);
    return { hasLooseFlange };
  }

  @Post('format-combined-end-config')
  @ApiOperation({
    summary: 'Format combined end configuration string with stubs',
  })
  @ApiResponse({
    status: 200,
    description: 'Formatted end configuration string',
  })
  async formatCombinedEndConfig(
    @Body()
    body: {
      mainEndConfig: string;
      stubs: StubFlangeConfig[];
    },
  ): Promise<{ formatted: string }> {
    const formatted =
      this.pipeEndConfigurationService.formatCombinedEndConfig(
        body.mainEndConfig,
        body.stubs,
      );
    return { formatted };
  }

  @Post('format-end-config-description')
  @ApiOperation({
    summary: 'Format end configuration for description with stubs',
  })
  @ApiResponse({
    status: 200,
    description: 'Formatted end configuration description',
  })
  async formatEndConfigForDescription(
    @Body()
    body: {
      mainEndConfig: string;
      stubs: StubFlangeConfig[];
    },
  ): Promise<{ description: string }> {
    const description =
      await this.pipeEndConfigurationService.formatEndConfigForDescription(
        body.mainEndConfig,
        body.stubs,
      );
    return { description };
  }
}
