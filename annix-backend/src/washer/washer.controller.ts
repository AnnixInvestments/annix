import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { WasherService } from './washer.service';
import { CreateWasherDto } from './dto/create-washer.dto';
import { UpdateWasherDto } from './dto/update-washer.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('washer')
export class WasherController {
  constructor(private readonly washerService: WasherService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new washer' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  create(@Body() createWasherDto: CreateWasherDto) {
    return this.washerService.create(createWasherDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all washers with optional filtering' })
  @ApiResponse({ status: 200, description: 'List of washers retrieved successfully' })
  findAll(
    @Query('boltId') boltId?: string,
    @Query('type') type?: string,
    @Query('material') material?: string,
  ) {
    return this.washerService.findAll({
      boltId: boltId ? parseInt(boltId, 10) : undefined,
      type,
      material,
    });
  }

  @Get('by-bolt/:designation')
  @ApiOperation({ summary: 'Get washers by bolt designation' })
  @ApiResponse({ status: 200, description: 'Washers retrieved successfully' })
  findByBoltDesignation(
    @Param('designation') designation: string,
    @Query('type') type?: string,
  ) {
    return this.washerService.findByBoltDesignation(designation, type);
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Washer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Washer not found' })
  findOne(@Param('id') id: string) {
    return this.washerService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a washer' })
  @ApiResponse({ status: 200, description: 'Washer updated successfully' })
  @ApiResponse({ status: 404, description: 'Washer not found' })
  update(@Param('id') id: string, @Body() updateWasherDto: UpdateWasherDto) {
    return this.washerService.update(+id, updateWasherDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a washer' })
  @ApiResponse({ status: 200, description: 'Washer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Washer not found' })
  remove(@Param('id') id: string) {
    return this.washerService.remove(+id);
  }
}
