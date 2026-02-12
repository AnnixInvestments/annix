import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { PipePressureService } from './pipe-pressure.service';
import { CreatePipePressureDto } from './dto/create-pipe-pressure.dto';
import { UpdatePipePressureDto } from './dto/update-pipe-pressure.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PipePressure } from './entities/pipe-pressure.entity';

@ApiTags('Pipe Pressures')
@Controller('pipe-pressures')
export class PipePressureController {
  constructor(private readonly pipePressureService: PipePressureService) {}

  @Post()
  @ApiOperation({ summary: 'Create a pipe pressure entry' })
  @ApiResponse({ status: 201, description: 'Successfully created', type: PipePressure })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate pipe pressure' })
  create(@Param('pipeDimensionId', ParseIntPipe) pipeDimensionId: number, @Body() dto: CreatePipePressureDto) {
    return this.pipePressureService.create(pipeDimensionId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all pipe pressures' })
  @ApiResponse({ status: 200, description: 'List of pipe pressures', type: [PipePressure] })
  findAll() {
    return this.pipePressureService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pipe pressure by ID' })
  @ApiResponse({ status: 200, description: 'Pipe Pressure found', type: PipePressure })
  @ApiResponse({ status: 404, description: 'Pipe pressure not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pipePressureService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a pipe pressure entry' })
  @ApiResponse({ status: 200, description: 'Pipe Pressure updated', type: PipePressure })
  @ApiResponse({ status: 404, description: 'Pipe pressure not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePipePressureDto) {
    return this.pipePressureService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pipe pressure entry' })
  @ApiResponse({ status: 200, description: 'Pipe Pressure deleted successfully', type: PipePressure })
    @ApiResponse({ status: 404, description: 'Pipe pressure not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pipePressureService.remove(id);
  }
}
