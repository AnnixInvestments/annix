import { Controller, Get, Post, Body, Param, Delete, Patch, ParseIntPipe, Query } from '@nestjs/common';
import { PipeDimensionService } from './pipe-dimension.service';
import { PipeDimension } from './entities/pipe-dimension.entity';
import { CreatePipeDimensionDto } from './dto/create-pipe-dimension.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UpdatePipeDimensionDto } from './dto/update-pipe-dimension.dto';
import { RecommendPipeSpecsDto } from './dto/recommend-pipe-specs.dto';

@Controller('pipe-dimensions')
export class PipeDimensionController {
  constructor(private readonly pipeDimensionService: PipeDimensionService) {}

  @Post(':nominalId')
  @ApiOperation({ summary: 'Create a pipe dimension for a certain nominalId' })
  @ApiBody({ type: CreatePipeDimensionDto})
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  async create(/*@Param('nominalId', ParseIntPipe) nominalId: number,*/ @Body() createPipeDimensionDto: CreatePipeDimensionDto,) {
    return this.pipeDimensionService.create(/*nominalId,*/ createPipeDimensionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all pipe dimensions' })
  @ApiResponse({ status: 200, description: 'List of pipe dimensions', type: [PipeDimension] })
  async findAll() {
    return this.pipeDimensionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get all pipe dimensions by ID' })
  @ApiResponse({ status: 200, description: 'User found', type: PipeDimension })
  @ApiResponse({ status: 404, description: 'Pipe dimension not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pipeDimensionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a pipe dimension' })
  @ApiResponse({ status: 200, description: 'Pipe dimension updated', type: PipeDimension })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  @ApiResponse({ status: 404, description: 'Pipe dimension not found' })
  // @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updatePipeDimensionDto: UpdatePipeDimensionDto,) {
    return this.pipeDimensionService.update(id, updatePipeDimensionDto);
  }

  @Post('recommend')
  @ApiOperation({ summary: 'Get recommended pipe specifications based on working conditions' })
  @ApiBody({ type: RecommendPipeSpecsDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Recommended pipe specifications',
    schema: {
      type: 'object',
      properties: {
        pipeDimension: { $ref: '#/components/schemas/PipeDimension' },
        schedule: { type: 'string' },
        wallThickness: { type: 'number' },
        maxPressure: { type: 'number' }
      }
    }
  })
  async getRecommendations(@Body() dto: RecommendPipeSpecsDto) {
    return this.pipeDimensionService.getRecommendedSpecs(
      dto.nominalBore,
      dto.workingPressure,
      dto.temperature || 20,
      dto.steelSpecId
    );
  }

  @Get('higher-schedules')
  @ApiOperation({ summary: 'Get higher schedule options than recommended minimum' })
  @ApiQuery({ name: 'nominalBore', type: Number, description: 'Nominal bore in mm', required: true })
  @ApiQuery({ name: 'currentWallThickness', type: Number, description: 'Current wall thickness in mm', required: true })
  @ApiQuery({ name: 'workingPressure', type: Number, description: 'Working pressure in bar', required: true })
  @ApiQuery({ name: 'temperature', type: Number, required: false, description: 'Temperature in °C (default: 20)' })
  @ApiQuery({ name: 'steelSpecId', type: Number, required: false, description: 'Steel specification ID' })
  @ApiResponse({ status: 200, description: 'List of higher schedule options', type: [PipeDimension] })
  async getHigherSchedules(
    @Query('nominalBore') nominalBore: string,
    @Query('currentWallThickness') currentWallThickness: string,
    @Query('workingPressure') workingPressure: string,
    @Query('temperature') temperature?: string,
    @Query('steelSpecId') steelSpecId?: string,
  ) {
    return this.pipeDimensionService.getHigherSchedules(
      parseFloat(nominalBore),
      parseFloat(currentWallThickness),
      parseFloat(workingPressure),
      temperature ? parseFloat(temperature) : 20,
      steelSpecId ? parseInt(steelSpecId) : undefined
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pipe dimension' })
  @ApiResponse({ status: 200, description: 'Pipe dimension deleted successfully' })
  @ApiResponse({ status: 404, description: 'Pipe dimension not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.pipeDimensionService.remove(id);
  }

  @Get('all/:steelSpecId/:nominalId')
  @ApiOperation({ summary: 'Get all possible schedule numbers and wall thickness for a given steel specification and nominal bore' })
  @ApiResponse({ status: 200, description: 'List of pipe dimensions with schedules and wall thicknesses' })
  @ApiResponse({ status: 404, description: 'No pipe dimensions found for the given steel specification and nominal bore' })
  @ApiResponse({ status: 400, description: 'Invalid Steel Specification ID or Nominal Bore ID' })
  async findAllBySpecAndNominal(
    @Param('steelSpecId', ParseIntPipe) steelSpecId: number,
    @Param('nominalId', ParseIntPipe) nominalId: number,
  ) {
    return this.pipeDimensionService.findAllBySpecAndNominal(steelSpecId, nominalId);
  }
}

