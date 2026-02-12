import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { SteelSpecificationService } from './steel-specification.service';
import { CreateSteelSpecificationDto } from './dto/create-steel-specification.dto';
import { UpdateSteelSpecificationDto } from './dto/update-steel-specification.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('steel-specification')
export class SteelSpecificationController {
  constructor(private readonly steelSpecificationService: SteelSpecificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new steel specification' })
  @ApiResponse({ status: 201, description: 'Steel specification successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate steel specification' })
  create(@Body() createSteelSpecificationDto: CreateSteelSpecificationDto) {
    return this.steelSpecificationService.create(createSteelSpecificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all steel specifications' })
  @ApiResponse({ status: 200, description: 'List of steel specifications retrieved successfully' })
  findAll() {
    return this.steelSpecificationService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a steel specification by ID' })
  @ApiResponse({ status: 200, description: 'Steel specification retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Steel specification not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.steelSpecificationService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a steel specification by ID' })
  @ApiResponse({ status: 200, description: 'Steel specification updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate steel specification' })
  @ApiResponse({ status: 404, description: 'Steel specification not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateSteelSpecificationDto: UpdateSteelSpecificationDto) {
    return this.steelSpecificationService.update(+id, updateSteelSpecificationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a steel specification by ID' })
  @ApiResponse({ status: 200, description: 'Steel specification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Steel specification not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.steelSpecificationService.remove(+id);
  }
}
