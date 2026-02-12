import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FlangePressureClassService } from './flange-pressure-class.service';
import { CreateFlangePressureClassDto } from './dto/create-flange-pressure-class.dto';
import { UpdateFlangePressureClassDto } from './dto/update-flange-pressure-class.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('flange-pressure-class')
export class FlangePressureClassController {
  constructor(private readonly flangePressureClassService: FlangePressureClassService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new flange pressure class' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createFlangePressureClassDto: CreateFlangePressureClassDto) {
    return this.flangePressureClassService.create(createFlangePressureClassDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all flange pressure classs with relations' })
  @ApiResponse({ status: 200, description: 'List of flange pressure classs retrieved successfully' })
  findAll() {
    return this.flangePressureClassService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a flange pressure class by ID' })
  @ApiResponse({ status: 200, description: 'Flange pressure class retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Flange pressure class not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id') id: string) {
    return this.flangePressureClassService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a flange pressure class' })
  @ApiResponse({ status: 200, description: 'Flange pressure class updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate flange pressure class' })
  @ApiResponse({ status: 404, description: 'Flange pressure class not found' })
  update(@Param('id') id: string, @Body() updateFlangePressureClassDto: UpdateFlangePressureClassDto) {
    return this.flangePressureClassService.update(+id, updateFlangePressureClassDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flange pressure class' })
  @ApiResponse({ status: 200, description: 'Flange pressure class deleted successfully' })
  @ApiResponse({ status: 404, description: 'Flange pressure class not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id') id: string) {
    return this.flangePressureClassService.remove(+id);
  }

  @Get('standard/:standardId')
  @ApiOperation({ summary: 'Get all flange pressure classes by standard ID' })
  @ApiResponse({ status: 200, description: 'List of flange pressure classes retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Flange standard not found' })
  @ApiResponse({ status: 400, description: 'Invalid standard ID parameter' })
  getAllByStandard(@Param('standardId') standardId: string) {
    return this.flangePressureClassService.getAllByStandard(+standardId);
  }
}
