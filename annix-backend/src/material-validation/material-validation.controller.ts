import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MaterialValidationService } from './material-validation.service';

@ApiTags('material-validation')
@Controller('material-validation')
export class MaterialValidationController {
  constructor(
    private readonly materialValidationService: MaterialValidationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all material limits' })
  findAll() {
    return this.materialValidationService.findAll();
  }

  @Get('by-spec-name/:specName')
  @ApiOperation({ summary: 'Get material limits by steel specification name' })
  @ApiParam({
    name: 'specName',
    description: 'Steel specification name (e.g., ASTM A106, SABS 62)',
  })
  findBySpecName(@Param('specName') specName: string) {
    return this.materialValidationService.findBySpecName(specName);
  }

  @Get('by-spec-id/:id')
  @ApiOperation({ summary: 'Get material limits by steel specification ID' })
  @ApiParam({ name: 'id', description: 'Steel specification ID' })
  findBySpecId(@Param('id') id: string) {
    const specId = parseInt(id, 10);
    return this.materialValidationService.findBySpecId(specId);
  }

  @Get('check-suitability')
  @ApiOperation({
    summary: 'Check material suitability for given conditions',
    description:
      'Validates if a steel specification is suitable for the specified temperature and pressure conditions',
  })
  @ApiQuery({ name: 'specName', description: 'Steel specification name' })
  @ApiQuery({
    name: 'temperature',
    required: false,
    description: 'Operating temperature in Celsius',
  })
  @ApiQuery({
    name: 'pressure',
    required: false,
    description: 'Operating pressure in bar',
  })
  checkSuitability(
    @Query('specName') specName: string,
    @Query('temperature') temperature?: string,
    @Query('pressure') pressure?: string,
  ) {
    const tempC = temperature ? parseFloat(temperature) : undefined;
    const pressureBar = pressure ? parseFloat(pressure) : undefined;

    return this.materialValidationService.checkMaterialSuitability(
      specName,
      tempC,
      pressureBar,
    );
  }

  @Get('suitable-materials')
  @ApiOperation({
    summary: 'Get list of suitable materials for given conditions',
    description:
      'Returns all materials that meet the specified temperature and pressure requirements',
  })
  @ApiQuery({
    name: 'temperature',
    required: false,
    description: 'Operating temperature in Celsius',
  })
  @ApiQuery({
    name: 'pressure',
    required: false,
    description: 'Operating pressure in bar',
  })
  getSuitableMaterials(
    @Query('temperature') temperature?: string,
    @Query('pressure') pressure?: string,
  ) {
    const tempC = temperature ? parseFloat(temperature) : undefined;
    const pressureBar = pressure ? parseFloat(pressure) : undefined;

    return this.materialValidationService.getSuitableMaterials(
      tempC,
      pressureBar,
    );
  }
}
