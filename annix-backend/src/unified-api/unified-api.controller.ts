import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UnifiedApiService } from './unified-api.service';
import {
  CompleteFlangeSpecificationDto,
  MaterialSearchQueryDto,
  MaterialSearchResponseDto,
  AssemblyValidateDto,
  AssemblyValidationResultDto,
} from './dto/unified-api.dto';

@ApiTags('Unified API')
@Controller()
export class UnifiedApiController {
  constructor(private readonly unifiedApiService: UnifiedApiService) {}

  @Get('flanges/:id/complete-specification')
  @ApiOperation({
    summary: 'Get complete flange specification',
    description:
      'Returns comprehensive flange data including dimensions, weight, bolting, P-T ratings, and gasket information',
  })
  @ApiParam({ name: 'id', description: 'Flange dimension ID' })
  @ApiQuery({
    name: 'materialGroup',
    required: false,
    description: 'Material group for P-T ratings (default: Carbon Steel A105)',
  })
  @ApiResponse({
    status: 200,
    description: 'Complete flange specification',
    type: CompleteFlangeSpecificationDto,
  })
  @ApiResponse({ status: 404, description: 'Flange not found' })
  async completeFlangeSpecification(
    @Param('id', ParseIntPipe) id: number,
    @Query('materialGroup') materialGroup?: string,
  ): Promise<CompleteFlangeSpecificationDto> {
    return this.unifiedApiService.completeFlangeSpecification(
      id,
      materialGroup || 'Carbon Steel A105 (Group 1.1)',
    );
  }

  @Get('materials/search')
  @ApiOperation({
    summary: 'Search materials across all types',
    description:
      'Unified search across steel specifications, pipe materials, and flange materials',
  })
  @ApiQuery({ name: 'query', description: 'Search query string' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['steel', 'pipe', 'flange', 'all'],
    description: 'Filter by material type',
  })
  @ApiQuery({
    name: 'minTempC',
    required: false,
    description: 'Minimum temperature rating in °C',
  })
  @ApiQuery({
    name: 'maxTempC',
    required: false,
    description: 'Maximum temperature rating in °C',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: MaterialSearchResponseDto,
  })
  async materialSearch(
    @Query() query: MaterialSearchQueryDto,
  ): Promise<MaterialSearchResponseDto> {
    return this.unifiedApiService.materialSearch(query);
  }

  @Post('assemblies/validate')
  @ApiOperation({
    summary: 'Validate assembly compatibility',
    description:
      'Check material, pressure, temperature, and thread pitch compatibility for an assembly',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    type: AssemblyValidationResultDto,
  })
  async assemblyValidate(
    @Body() dto: AssemblyValidateDto,
  ): Promise<AssemblyValidationResultDto> {
    return this.unifiedApiService.assemblyValidate(dto);
  }
}
