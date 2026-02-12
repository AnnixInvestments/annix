import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FlangeStandardService } from './flange-standard.service';
import { CreateFlangeStandardDto } from './dto/create-flange-standard.dto';
import { UpdateFlangeStandardDto } from './dto/update-flange-standard.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('flange-standard')
export class FlangeStandardController {
  constructor(private readonly flangeStandardService: FlangeStandardService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new flange standard' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createFlangeStandardDto: CreateFlangeStandardDto) {
    return this.flangeStandardService.create(createFlangeStandardDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all flange standards with relations' })
  @ApiResponse({ status: 200, description: 'List of flange standards retrieved successfully' })
  findAll() {
    return this.flangeStandardService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a flange standard by ID' })
  @ApiResponse({ status: 200, description: 'Flange standard retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Flange standard not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id') id: string) {
    return this.flangeStandardService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a flange standard' })
  @ApiResponse({ status: 200, description: 'Flange standard updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate flange standard' })
  @ApiResponse({ status: 404, description: 'Flange standard not found' })
  update(@Param('id') id: string, @Body() updateFlangeStandardDto: UpdateFlangeStandardDto) {
    return this.flangeStandardService.update(+id, updateFlangeStandardDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flange standard' })
  @ApiResponse({ status: 200, description: 'Flange standard deleted successfully' })
  @ApiResponse({ status: 404, description: 'Flange standard not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id') id: string) {
    return this.flangeStandardService.remove(+id);
  }
}
