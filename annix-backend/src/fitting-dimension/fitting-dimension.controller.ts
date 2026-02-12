import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FittingDimensionService } from './fitting-dimension.service';
import { CreateFittingDimensionDto } from './dto/create-fitting-dimension.dto';
import { UpdateFittingDimensionDto } from './dto/update-fitting-dimension.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Fitting Dimensions')
@Controller('fitting-dimension')
export class FittingDimensionController {
  constructor(private readonly fittingDimensionService: FittingDimensionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new fitting dimension' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createFittingDimensionDto: CreateFittingDimensionDto) {
    return this.fittingDimensionService.create(createFittingDimensionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fitting dimensions with relations' })
  @ApiResponse({ status: 200, description: 'List of fitting dimensions retrieved successfully' })
  findAll() {
    return this.fittingDimensionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fitting dimension by ID' })
  @ApiResponse({ status: 200, description: 'Fitting dimension retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Fitting dimension not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id') id: string) {
    return this.fittingDimensionService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a fitting dimension' })
  @ApiResponse({ status: 200, description: 'Fitting dimension updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate fitting dimension' })
  @ApiResponse({ status: 404, description: 'Fitting dimension not found' })
  update(@Param('id') id: string, @Body() updateFittingDimensionDto: UpdateFittingDimensionDto) {
    return this.fittingDimensionService.update(+id, updateFittingDimensionDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a fitting dimension' })
  @ApiResponse({ status: 200, description: 'Fitting dimension deleted successfully' })
  @ApiResponse({ status: 404, description: 'Fitting dimension not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id') id: string) {
    return this.fittingDimensionService.remove(+id);
  }
}
