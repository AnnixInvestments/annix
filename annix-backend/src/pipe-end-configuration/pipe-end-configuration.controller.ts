import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PipeEndConfigurationService } from './pipe-end-configuration.service';
import { PipeEndConfiguration } from './entities/pipe-end-configuration.entity';

@ApiTags('Pipe End Configurations')
@Controller('pipe-end-configurations')
export class PipeEndConfigurationController {
  constructor(private readonly pipeEndConfigurationService: PipeEndConfigurationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all pipe end configurations' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all pipe end configurations',
    type: [PipeEndConfiguration]
  })
  async findAll(): Promise<PipeEndConfiguration[]> {
    return this.pipeEndConfigurationService.findAll();
  }

  @Get(':configCode/weld-count')
  @ApiOperation({ summary: 'Get weld count for a specific pipe end configuration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Number of welds required for the configuration'
  })
  async getWeldCount(@Param('configCode') configCode: string): Promise<{ weldCount: number }> {
    const weldCount = await this.pipeEndConfigurationService.getWeldCountForConfig(configCode);
    return { weldCount };
  }

  @Get(':configCode')
  @ApiOperation({ summary: 'Get pipe end configuration by code' })
  @ApiResponse({ 
    status: 200, 
    description: 'Pipe end configuration details',
    type: PipeEndConfiguration
  })
  async findByCode(@Param('configCode') configCode: string): Promise<PipeEndConfiguration | null> {
    return this.pipeEndConfigurationService.findByCode(configCode);
  }
}