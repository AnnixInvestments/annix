import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PipeSteelWorkService } from './pipe-steel-work.service';
import {
  CalculateSupportSpacingDto,
  CalculateReinforcementPadDto,
  SupportSpacingResponseDto,
  ReinforcementPadResponseDto,
  BracketTypeResponseDto,
  PipeSteelWorkCalculationDto,
  PipeSteelWorkCalculationResponseDto,
} from './dto/pipe-steel-work.dto';

@ApiTags('Pipe Steel Work')
@Controller('pipe-steel-work')
export class PipeSteelWorkController {
  constructor(private readonly pipeSteelWorkService: PipeSteelWorkService) {}

  @Post('support-spacing')
  @ApiOperation({ summary: 'Calculate recommended pipe support spacing' })
  @ApiResponse({
    status: 200,
    description: 'Support spacing calculated successfully',
    type: SupportSpacingResponseDto,
  })
  supportSpacing(
    @Body() dto: CalculateSupportSpacingDto,
  ): SupportSpacingResponseDto {
    return this.pipeSteelWorkService.supportSpacing(dto);
  }

  @Post('reinforcement-pad')
  @ApiOperation({ summary: 'Calculate reinforcement pad requirements' })
  @ApiResponse({
    status: 200,
    description: 'Reinforcement pad calculation completed',
    type: ReinforcementPadResponseDto,
  })
  reinforcementPad(
    @Body() dto: CalculateReinforcementPadDto,
  ): ReinforcementPadResponseDto {
    return this.pipeSteelWorkService.reinforcementPad(dto);
  }

  @Get('bracket-types')
  @ApiOperation({ summary: 'Get available bracket types' })
  @ApiQuery({
    name: 'nominalDiameterMm',
    required: false,
    description: 'Filter by pipe nominal diameter',
  })
  @ApiResponse({
    status: 200,
    description: 'List of bracket types',
    type: [BracketTypeResponseDto],
  })
  async bracketTypes(
    @Query('nominalDiameterMm') nominalDiameterMm?: number,
  ): Promise<BracketTypeResponseDto[]> {
    return this.pipeSteelWorkService.bracketTypes(
      nominalDiameterMm ? Number(nominalDiameterMm) : undefined,
    );
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Perform comprehensive pipe steel work calculation' })
  @ApiResponse({
    status: 200,
    description: 'Calculation completed successfully',
    type: PipeSteelWorkCalculationResponseDto,
  })
  calculate(
    @Body() dto: PipeSteelWorkCalculationDto,
  ): PipeSteelWorkCalculationResponseDto {
    return this.pipeSteelWorkService.calculate(dto);
  }
}
