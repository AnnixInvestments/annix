import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { WeldTypeService } from './weld-type.service';
import { CreateWeldTypeDto } from './dto/create-weld-type.dto';
import { UpdateWeldTypeDto } from './dto/update-weld-type.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Weld Types')
@Controller('weld-type')
export class WeldTypeController {
  constructor(private readonly weldTypeService: WeldTypeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new weld type' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createWeldTypeDto: CreateWeldTypeDto) {
    return this.weldTypeService.create(createWeldTypeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all weld types' })
  @ApiResponse({ status: 200, description: 'List of weld types retrieved successfully' })
  findAll() {
    return this.weldTypeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a weld type by ID' })
  @ApiResponse({ status: 200, description: 'Weld type retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Weld type not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id') id: string) {
    return this.weldTypeService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a weld type' })
  @ApiResponse({ status: 200, description: 'Weld type updated successfully' })
  @ApiResponse({ status: 404, description: 'Weld type not found' })
  update(@Param('id') id: string, @Body() updateWeldTypeDto: UpdateWeldTypeDto) {
    return this.weldTypeService.update(+id, updateWeldTypeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a weld type' })
  @ApiResponse({ status: 200, description: 'Weld type deleted successfully' })
  @ApiResponse({ status: 404, description: 'Weld type not found' })
  remove(@Param('id') id: string) {
    return this.weldTypeService.remove(+id);
  }
}
