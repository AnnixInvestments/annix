import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FittingVariantService } from './fitting-variant.service';
import { CreateFittingVariantDto } from './dto/create-fitting-variant.dto';
import { UpdateFittingVariantDto } from './dto/update-fitting-variant.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Fitting Variant')
@Controller('fitting-variant')
export class FittingVariantController {
  constructor(private readonly fittingVariantService: FittingVariantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a fitting variant' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createFittingVariantDto: CreateFittingVariantDto) {
    return this.fittingVariantService.create(createFittingVariantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fitting variant' })
  @ApiResponse({ status: 200, description: 'List of fitting variants retrieved successfully' })
  findAll() {
    return this.fittingVariantService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fitting variant by ID' })
  @ApiResponse({ status: 200, description: 'Fitting variant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Fitting variant not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id') id: string) {
    return this.fittingVariantService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a fitting variant' })
  @ApiResponse({ status: 200, description: 'Fitting variant updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate fitting variant' })
  @ApiResponse({ status: 404, description: 'Fitting variant not found' })
  update(@Param('id') id: string, @Body() updateFittingVariantDto: UpdateFittingVariantDto) {
    return this.fittingVariantService.update(+id, updateFittingVariantDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a fitting variant' })
  @ApiResponse({ status: 200, description: 'Fitting variant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Fitting variant not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id') id: string) {
    return this.fittingVariantService.remove(+id);
  }
}
