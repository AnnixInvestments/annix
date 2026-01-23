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
import { BoltService } from './bolt.service';
import { CreateBoltDto } from './dto/create-bolt.dto';
import { UpdateBoltDto } from './dto/update-bolt.dto';
import { ApiOperation, ApiResponse, ApiQuery, ApiTags } from '@nestjs/swagger';

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
  @ApiOperation({ summary: 'Get all bolts with optional filtering' })
  @ApiResponse({
    status: 200,
    description: 'List of bolts retrieved successfully',
  })
  findAll(
    @Query('grade') grade?: string,
    @Query('material') material?: string,
    @Query('headStyle') headStyle?: string,
    @Query('size') size?: string,
  ) {
    return this.boltService.findAll({ grade, material, headStyle, size });
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
  @ApiResponse({
    status: 400,
    description: 'Invalid request or duplicate bolt',
  })
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

  @Get('u-bolts')
  @ApiOperation({ summary: 'Get U-bolts with optional filtering by pipe size' })
  @ApiQuery({ name: 'nbMm', required: false, description: 'Filter by nominal bore (mm)' })
  @ApiResponse({ status: 200, description: 'List of U-bolts' })
  uBolts(@Query('nbMm') nbMm?: number) {
    return this.boltService.uBolts(nbMm ? Number(nbMm) : undefined);
  }

  @Get('u-bolts/:nbMm')
  @ApiOperation({ summary: 'Get U-bolt for specific pipe size' })
  @ApiQuery({ name: 'threadSize', required: false, description: 'Filter by thread size' })
  @ApiResponse({ status: 200, description: 'U-bolt details' })
  uBolt(@Param('nbMm') nbMm: number, @Query('threadSize') threadSize?: string) {
    return this.boltService.uBolt(Number(nbMm), threadSize);
  }

  @Get('pipe-clamps')
  @ApiOperation({ summary: 'Get pipe clamps with optional filtering' })
  @ApiQuery({ name: 'clampType', required: false, description: 'Filter by clamp type code' })
  @ApiQuery({ name: 'nbMm', required: false, description: 'Filter by nominal bore (mm)' })
  @ApiResponse({ status: 200, description: 'List of pipe clamps' })
  pipeClamps(
    @Query('clampType') clampType?: string,
    @Query('nbMm') nbMm?: number,
  ) {
    return this.boltService.pipeClamps(clampType, nbMm ? Number(nbMm) : undefined);
  }

  @Get('pipe-clamps/types')
  @ApiOperation({ summary: 'Get available pipe clamp types' })
  @ApiResponse({ status: 200, description: 'List of clamp types' })
  pipeClampTypes() {
    return this.boltService.pipeClampTypes();
  }

  @Get('pipe-clamps/:clampType/:nbMm')
  @ApiOperation({ summary: 'Get specific pipe clamp by type and size' })
  @ApiResponse({ status: 200, description: 'Pipe clamp details' })
  pipeClamp(@Param('clampType') clampType: string, @Param('nbMm') nbMm: number) {
    return this.boltService.pipeClamp(clampType, Number(nbMm));
  }
}
