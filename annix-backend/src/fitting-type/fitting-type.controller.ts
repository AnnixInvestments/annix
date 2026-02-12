import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FittingTypeService } from './fitting-type.service';
import { CreateFittingTypeDto } from './dto/create-fitting-type.dto';
import { UpdateFittingTypeDto } from './dto/update-fitting-type.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Fitting Types')
@Controller('fitting-type')
export class FittingTypeController {
  constructor(private readonly fittingTypeService: FittingTypeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new fitting type' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createFittingTypeDto: CreateFittingTypeDto) {
    return this.fittingTypeService.create(createFittingTypeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fitting types' })
  @ApiResponse({ status: 200, description: 'List of fitting types retrieved successfully' })
  findAll() {
    return this.fittingTypeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fitting type by ID' })
  @ApiResponse({ status: 200, description: 'Fitting types retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Fitting types not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id') id: string) {
    return this.fittingTypeService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a fitting type' })
  @ApiResponse({ status: 200, description: 'Fitting type updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate fitting type' })
  @ApiResponse({ status: 404, description: 'Fitting type not found' })
  update(@Param('id') id: string, @Body() updateFittingTypeDto: UpdateFittingTypeDto) {
    return this.fittingTypeService.update(+id, updateFittingTypeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a fitting type' })
  @ApiResponse({ status: 200, description: 'Fitting type deleted successfully' })
  @ApiResponse({ status: 404, description: 'Fitting type not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id') id: string) {
    return this.fittingTypeService.remove(+id);
  }
}
