import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BoltMassService } from './bolt-mass.service';
import { CreateBoltMassDto } from './dto/create-bolt-mass.dto';
import { UpdateBoltMassDto } from './dto/update-bolt-mass.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('bolt-mass')
export class BoltMassController {
  constructor(private readonly boltMassService: BoltMassService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bolt mass' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createBoltMassDto: CreateBoltMassDto) {
    return this.boltMassService.create(createBoltMassDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bolt masses with relations' })
  @ApiResponse({ status: 200, description: 'List of bolt masses retrieved successfully' })
  findAll() {
    return this.boltMassService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bolt mass by ID' })
  @ApiResponse({ status: 200, description: 'Bolt mass retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Bolt mass not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id') id: string) {
    return this.boltMassService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bolt mass' })
  @ApiResponse({ status: 200, description: 'Bolt mass updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate bolt mass' })
  @ApiResponse({ status: 404, description: 'Bolt mass not found' })
  update(@Param('id') id: string, @Body() updateBoltMassDto: UpdateBoltMassDto) {
    return this.boltMassService.update(+id, updateBoltMassDto);
  }

  @Delete(':id')
    @ApiOperation({ summary: 'Delete a bolt mass' })
  @ApiResponse({ status: 200, description: 'bolt mass deleted successfully' })
  @ApiResponse({ status: 404, description: 'bolt mass not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id') id: string) {
    return this.boltMassService.remove(+id);
  }
}
