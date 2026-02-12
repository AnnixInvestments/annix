import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BoltService } from './bolt.service';
import { CreateBoltDto } from './dto/create-bolt.dto';
import { UpdateBoltDto } from './dto/update-bolt.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('bolt')
export class BoltController {
  constructor(private readonly boltService: BoltService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bolt' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createBoltDto: CreateBoltDto) {
    return this.boltService.create(createBoltDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bolts with relations' })
  @ApiResponse({ status: 200, description: 'List of fitting bolts retrieved successfully' })
  findAll() {
    return this.boltService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Bolts retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Bolts not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id') id: string) {
    return this.boltService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bolt' })
  @ApiResponse({ status: 200, description: 'Bolt updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate bolt' })
  @ApiResponse({ status: 404, description: 'Bolt not found' })
  update(@Param('id') id: string, @Body() updateBoltDto: UpdateBoltDto) {
    return this.boltService.update(+id, updateBoltDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bolt' })
  @ApiResponse({ status: 200, description: 'Bolt deleted successfully' })
  @ApiResponse({ status: 404, description: 'Bolt not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id') id: string) {
    return this.boltService.remove(+id);
  }
}
