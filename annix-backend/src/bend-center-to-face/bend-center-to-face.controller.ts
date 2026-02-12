import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, ParseFloatPipe } from '@nestjs/common';
import { BendCenterToFaceService } from './bend-center-to-face.service';
import { BendCenterToFace } from './entities/bend-center-to-face.entity';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';

@Controller('bend-center-to-face')
export class BendCenterToFaceController {
  constructor(private readonly bendCenterToFaceService: BendCenterToFaceService) {}

  @Get()
  findAll(): Promise<BendCenterToFace[]> {
    return this.bendCenterToFaceService.findAll();
  }

  @Get('bend-types')
  getBendTypes(): Promise<string[]> {
    return this.bendCenterToFaceService.getBendTypes();
  }

  @Get('by-bend-type/:bendType')
  findByBendType(@Param('bendType') bendType: string): Promise<BendCenterToFace[]> {
    return this.bendCenterToFaceService.findByBendType(bendType);
  }

  @Get('by-nominal-bore/:nominalBoreMm')
  findByNominalBore(
    @Param('nominalBoreMm', ParseIntPipe) nominalBoreMm: number
  ): Promise<BendCenterToFace[]> {
    return this.bendCenterToFaceService.findByNominalBore(nominalBoreMm);
  }

  @Get('nominal-bores/:bendType')
  getNominalBoresForBendType(@Param('bendType') bendType: string): Promise<number[]> {
    return this.bendCenterToFaceService.getNominalBoresForBendType(bendType);
  }

  @Get('degrees/:bendType')
  getDegreesForBendType(
    @Param('bendType') bendType: string,
    @Query('nominalBoreMm') nominalBoreMm?: string,
  ): Promise<number[]> {
    const nb = nominalBoreMm ? parseInt(nominalBoreMm, 10) : undefined;
    return this.bendCenterToFaceService.getDegreesForBendType(bendType, nb);
  }

  @Get('options/:bendType')
  getOptionsForBendType(@Param('bendType') bendType: string) {
    return this.bendCenterToFaceService.getOptionsForBendType(bendType);
  }

  @Get('lookup')
  findByCriteria(
    @Query('bendType') bendType: string,
    @Query('nominalBoreMm', ParseIntPipe) nominalBoreMm: number,
    @Query('degrees', ParseFloatPipe) degrees: number
  ): Promise<BendCenterToFace | null> {
    return this.bendCenterToFaceService.findByCriteria(bendType, nominalBoreMm, degrees);
  }

  @Get('nearest')
  findNearestBendDimension(
    @Query('bendType') bendType: string,
    @Query('nominalBoreMm', ParseIntPipe) nominalBoreMm: number,
    @Query('targetDegrees', ParseFloatPipe) targetDegrees: number
  ): Promise<BendCenterToFace | null> {
    return this.bendCenterToFaceService.findNearestBendDimension(
      bendType,
      nominalBoreMm,
      targetDegrees
    );
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate bend specifications including weight and weld requirements' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nominalBoreMm: { type: 'number', description: 'Nominal bore in mm' },
        wallThicknessMm: { type: 'number', description: 'Wall thickness in mm' },
        scheduleNumber: { type: 'string', description: 'Schedule number or designation' },
        bendType: { type: 'string', description: 'Bend type (1.5D, 2D, 3D, 5D)' },
        bendDegrees: { type: 'number', description: 'Bend angle in degrees' },
        numberOfTangents: { type: 'number', description: 'Number of tangent pipes', default: 0 },
        tangentLengths: { type: 'array', items: { type: 'number' }, description: 'Length of each tangent in mm' },
        quantity: { type: 'number', description: 'Number of bend assemblies', default: 1 },
        steelSpecificationId: { type: 'number', description: 'Steel specification ID' },
        flangeStandardId: { type: 'number', description: 'Flange standard ID' },
        flangePressureClassId: { type: 'number', description: 'Flange pressure class ID' }
      },
      required: ['nominalBoreMm', 'wallThicknessMm', 'bendType', 'bendDegrees']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Bend calculations including weight, dimensions, and weld requirements',
    schema: {
      type: 'object',
      properties: {
        centerToFaceDimension: { type: 'number', description: 'Center to face dimension in mm' },
        bendRadius: { type: 'number', description: 'Bend radius in mm' },
        totalBendWeight: { type: 'number', description: 'Total weight of bend components in kg' },
        totalTangentWeight: { type: 'number', description: 'Total weight of tangent pipes in kg' },
        totalSystemWeight: { type: 'number', description: 'Total system weight including flanges in kg' },
        numberOfFlanges: { type: 'number', description: 'Total number of flanges required' },
        numberOfFlangeWelds: { type: 'number', description: 'Number of flange welds' },
        numberOfButtWelds: { type: 'number', description: 'Number of butt welds' },
        totalFlangeWeldLength: { type: 'number', description: 'Total flange weld length in meters' },
        totalButtWeldLength: { type: 'number', description: 'Total butt weld length in meters' }
      }
    }
  })
  async calculateBendSpecifications(@Body() body: {
    nominalBoreMm: number;
    wallThicknessMm: number;
    scheduleNumber?: string;
    bendType: string;
    bendDegrees: number;
    numberOfTangents?: number;
    tangentLengths?: number[];
    quantity?: number;
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
  }) {
    return this.bendCenterToFaceService.calculateBendSpecifications(body);
  }
}