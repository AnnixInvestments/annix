import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NutMassService } from './nut-mass.service';
import { CreateNutMassDto } from './dto/create-nut-mass.dto';
import { UpdateNutMassDto } from './dto/update-nut-mass.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('nut-mass')
export class NutMassController {
  constructor(private readonly nutMassService: NutMassService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new nut mass' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createNutMassDto: CreateNutMassDto) {
    return this.nutMassService.create(createNutMassDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all nut masss with relations' })
  @ApiResponse({ status: 200, description: 'List of nut masss retrieved successfully' })
  findAll() {
    return this.nutMassService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a nut mass by ID' })
  @ApiResponse({ status: 200, description: 'Nut mass retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Nut mass not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id') id: string) {
    return this.nutMassService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a nut mass' })
  @ApiResponse({ status: 200, description: 'Nut mass updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate nut mass' })
  @ApiResponse({ status: 404, description: 'Nut mass not found' })
  update(@Param('id') id: string, @Body() updateNutMassDto: UpdateNutMassDto) {
    return this.nutMassService.update(+id, updateNutMassDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a nut mass' })
  @ApiResponse({ status: 200, description: 'Nut mass deleted successfully' })
  @ApiResponse({ status: 404, description: 'Nut mass not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id') id: string) {
    return this.nutMassService.remove(+id);
  }
}
