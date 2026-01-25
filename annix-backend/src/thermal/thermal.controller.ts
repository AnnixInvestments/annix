import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseFloatPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ThermalService } from './thermal.service';
import {
  ExpansionRequirementDto,
  ExpansionRequirementResponseDto,
  BellowsSelectionDto,
  BellowsSelectionResponseDto,
  LoopSizingDto,
  LoopSizingResponseDto,
  ExpansionCoefficientDto,
  ThermalMaterial,
} from './dto/thermal.dto';

@ApiTags('Thermal Expansion')
@Controller('thermal')
export class ThermalController {
  constructor(private readonly thermalService: ThermalService) {}

  @Get('expansion-requirement/:length/:fromTemp/:toTemp/:material')
  @ApiOperation({
    summary: 'Calculate thermal expansion requirement',
    description:
      'Calculate the thermal expansion or contraction for a given pipe length, temperature range, and material. Returns expansion in mm, recommended joint capacity, and advisory notes.',
  })
  @ApiParam({
    name: 'length',
    description: 'Pipe length in meters',
    example: 100,
  })
  @ApiParam({
    name: 'fromTemp',
    description: 'Installation/ambient temperature in Celsius',
    example: 20,
  })
  @ApiParam({
    name: 'toTemp',
    description: 'Operating temperature in Celsius',
    example: 200,
  })
  @ApiParam({
    name: 'material',
    enum: ThermalMaterial,
    description: 'Pipe material',
  })
  @ApiQuery({
    name: 'nominalSizeMm',
    required: false,
    description: 'Nominal pipe size in mm (for loop sizing recommendation)',
  })
  @ApiQuery({
    name: 'schedule',
    required: false,
    description: 'Pipe schedule (default: Std)',
  })
  @ApiResponse({
    status: 200,
    description: 'Expansion calculation result',
    type: ExpansionRequirementResponseDto,
  })
  async expansionRequirement(
    @Param('length', ParseFloatPipe) length: number,
    @Param('fromTemp', ParseFloatPipe) fromTemp: number,
    @Param('toTemp', ParseFloatPipe) toTemp: number,
    @Param('material', new ParseEnumPipe(ThermalMaterial))
    material: ThermalMaterial,
    @Query('nominalSizeMm') nominalSizeMm?: string,
    @Query('schedule') schedule?: string,
  ): Promise<ExpansionRequirementResponseDto> {
    const dto: ExpansionRequirementDto = {
      lengthM: length,
      fromTempC: fromTemp,
      toTempC: toTemp,
      material,
      nominalSizeMm: nominalSizeMm ? parseFloat(nominalSizeMm) : undefined,
      schedule,
    };

    return this.thermalService.expansionRequirement(dto);
  }

  @Post('expansion-requirement')
  @ApiOperation({
    summary: 'Calculate thermal expansion requirement (POST)',
    description:
      'Alternative POST endpoint for expansion calculation with full request body',
  })
  @ApiResponse({
    status: 200,
    description: 'Expansion calculation result',
    type: ExpansionRequirementResponseDto,
  })
  async expansionRequirementPost(
    @Body() dto: ExpansionRequirementDto,
  ): Promise<ExpansionRequirementResponseDto> {
    return this.thermalService.expansionRequirement(dto);
  }

  @Post('bellows-selection')
  @ApiOperation({
    summary: 'Select suitable bellows expansion joints',
    description:
      'Find bellows expansion joints that meet the specified movement, pressure, and temperature requirements. Returns options sorted by suitability.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bellows selection results',
    type: BellowsSelectionResponseDto,
  })
  async bellowsSelection(
    @Body() dto: BellowsSelectionDto,
  ): Promise<BellowsSelectionResponseDto> {
    return this.thermalService.bellowsSelection(dto);
  }

  @Post('loop-sizing')
  @ApiOperation({
    summary: 'Calculate expansion loop dimensions',
    description:
      'Calculate recommended expansion loop dimensions for a given pipe size and expansion requirement.',
  })
  @ApiResponse({
    status: 200,
    description: 'Loop sizing result',
    type: LoopSizingResponseDto,
  })
  async loopSizing(@Body() dto: LoopSizingDto): Promise<LoopSizingResponseDto> {
    return this.thermalService.loopSizing(dto);
  }

  @Get('coefficients/:material')
  @ApiOperation({
    summary: 'Get expansion coefficients for a material',
    description:
      'Retrieve thermal expansion coefficients at various temperatures for a specified material.',
  })
  @ApiParam({
    name: 'material',
    enum: ThermalMaterial,
    description: 'Pipe material',
  })
  @ApiResponse({
    status: 200,
    description: 'Expansion coefficients by temperature',
    type: [ExpansionCoefficientDto],
  })
  async coefficients(
    @Param('material', new ParseEnumPipe(ThermalMaterial))
    material: ThermalMaterial,
  ): Promise<ExpansionCoefficientDto[]> {
    return this.thermalService.coefficientsForMaterial(material);
  }

  @Get('materials')
  @ApiOperation({
    summary: 'List available materials',
    description:
      'Get a list of all materials with thermal expansion data available.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available materials',
  })
  materials(): { code: string; name: string }[] {
    return [
      { code: 'carbon_steel', name: 'Carbon Steel (ASTM A106/A53)' },
      { code: 'stainless_304', name: 'Stainless Steel 304/304L' },
      { code: 'stainless_316', name: 'Stainless Steel 316/316L' },
      { code: 'duplex_2205', name: 'Duplex Stainless Steel 2205' },
      { code: 'inconel_625', name: 'Inconel 625' },
      { code: 'monel_400', name: 'Monel 400' },
      { code: 'hastelloy_c276', name: 'Hastelloy C-276' },
      { code: 'copper', name: 'Copper' },
      { code: 'aluminum_6061', name: 'Aluminum 6061' },
      { code: 'chrome_moly_p22', name: 'Chrome-Moly P22' },
    ];
  }
}
