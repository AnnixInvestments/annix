import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AngleRangeService } from './angle-range.service';
import { CreateAngleRangeDto } from './dto/create-angle-range.dto';
import { UpdateAngleRangeDto } from './dto/update-angle-range.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Angle Ranges')
@Controller('angle-range')
export class AngleRangeController {
  constructor(private readonly angleRangeService: AngleRangeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new angle range' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createAngleRangeDto: CreateAngleRangeDto) {
    return this.angleRangeService.create(createAngleRangeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all angle ranges' })
  @ApiResponse({ status: 200, description: 'List of angle ranges retrieved successfully' })
  findAll() {
    return this.angleRangeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an angle range by ID' })
  @ApiResponse({ status: 200, description: 'Angle range retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Angle range not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id') id: string) {
    return this.angleRangeService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an angle range' })
  @ApiResponse({ status: 200, description: 'Angle range updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate angle range' })
  @ApiResponse({ status: 404, description: 'Angle range not found' })
  update(@Param('id') id: string, @Body() updateAngleRangeDto: UpdateAngleRangeDto) {
    return this.angleRangeService.update(+id, updateAngleRangeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an angle range' })
  @ApiResponse({ status: 200, description: 'Angle range deleted successfully' })
  @ApiResponse({ status: 404, description: 'Angle range not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id') id: string) {
    return this.angleRangeService.remove(+id);
  }
}
