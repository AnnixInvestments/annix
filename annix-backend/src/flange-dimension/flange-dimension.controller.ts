import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FlangeDimensionService } from './flange-dimension.service';
import { CreateFlangeDimensionDto } from './dto/create-flange-dimension.dto';
import { UpdateFlangeDimensionDto } from './dto/update-flange-dimension.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('flange-dimension')
export class FlangeDimensionController {
  constructor(private readonly flangeDimensionService: FlangeDimensionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bolt mass' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createFlangeDimensionDto: CreateFlangeDimensionDto) {
    return this.flangeDimensionService.create(createFlangeDimensionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bolt masss with relations' })
  @ApiResponse({ status: 200, description: 'List of bolt masss retrieved successfully' })
  findAll() {
    return this.flangeDimensionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bolt mass by ID' })
  @ApiResponse({ status: 200, description: 'bolt mass retrieved successfully' })
  @ApiResponse({ status: 404, description: 'bolt mass not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id') id: string) {
    return this.flangeDimensionService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bolt mass' })
  @ApiResponse({ status: 200, description: 'Bolt mass updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate bolt mass' })
  @ApiResponse({ status: 404, description: 'Bolt mass not found' })
  update(@Param('id') id: string, @Body() updateFlangeDimensionDto: UpdateFlangeDimensionDto) {
    return this.flangeDimensionService.update(+id, updateFlangeDimensionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bolt mass' })
  @ApiResponse({ status: 200, description: 'Bolt mass deleted successfully' })
  @ApiResponse({ status: 404, description: 'Bolt mass not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id') id: string) {
    return this.flangeDimensionService.remove(+id);
  }
}
