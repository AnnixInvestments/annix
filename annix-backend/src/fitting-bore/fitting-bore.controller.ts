import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FittingBoreService } from './fitting-bore.service';
import { CreateFittingBoreDto } from './dto/create-fitting-bore.dto';
import { UpdateFittingBoreDto } from './dto/update-fitting-bore.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Fitting Bores')
@Controller('fitting-bore')
export class FittingBoreController {
  constructor(private readonly fittingBoreService: FittingBoreService) {}

  @Post()
  @ApiOperation({ summary: 'Create a fitting bore' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createFittingBoreDto: CreateFittingBoreDto) {
    return this.fittingBoreService.create(createFittingBoreDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fitting bores' })
  @ApiResponse({ status: 200, description: 'List of fitting bores retrieved successfully' })
  findAll() {
    return this.fittingBoreService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a fitting bore by ID' })
  @ApiResponse({ status: 200, description: 'Fitting bore retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Fitting bore not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id') id: string) {
    return this.fittingBoreService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a fitting bore' })
  @ApiResponse({ status: 200, description: 'Fitting bore updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate fitting bore' })
  @ApiResponse({ status: 404, description: 'Fitting bore not found' })
  update(@Param('id') id: string, @Body() updateFittingBoreDto: UpdateFittingBoreDto) {
    return this.fittingBoreService.update(+id, updateFittingBoreDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a fitting bore' })
  @ApiResponse({ status: 200, description: 'Fitting bore deleted successfully' })
  @ApiResponse({ status: 404, description: 'Fitting bore not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id') id: string) {
    return this.fittingBoreService.remove(+id);
  }
}
