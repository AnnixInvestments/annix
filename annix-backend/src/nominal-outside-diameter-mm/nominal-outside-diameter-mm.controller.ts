import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { NominalOutsideDiameterMmService } from './nominal-outside-diameter-mm.service';
import { CreateNominalOutsideDiameterMmDto } from './dto/create-nominal-outside-diameter-mm.dto';
import { UpdateNominalOutsideDiameterMmDto } from './dto/update-nominal-outside-diameter-mm.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('nominal-outside-diameter-mm')
export class NominalOutsideDiameterMmController {
  constructor(private readonly nominalOutsideDiameterMmService: NominalOutsideDiameterMmService) {}

  @Post()
  @ApiOperation({ summary: 'Create a nominal outside diameter' })
  @ApiResponse({ status: 201, description: 'Successfully created' })
  @ApiResponse({ status: 400, description: 'Duplicate or invalid data' })
  create(@Body() createNominalOutsideDiameterMmDto: CreateNominalOutsideDiameterMmDto) {
    return this.nominalOutsideDiameterMmService.create(createNominalOutsideDiameterMmDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all nominal outside diameters' })
  @ApiResponse({ status: 200, description: 'List of nominal outside diameter retrieved successfully' })
  findAll() {
    return this.nominalOutsideDiameterMmService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a nominal outside diameter by ID' })
  @ApiResponse({ status: 200, description: 'Nominal outside diameter retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Nominal outside diameter not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.nominalOutsideDiameterMmService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a nominal outside diameter' })
  @ApiResponse({ status: 200, description: 'Nominal outside diameter updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate nominal outside diameter' })
  @ApiResponse({ status: 404, description: 'Nominal outside diameter not found' })
  update(@Param('id', ParseIntPipe) id: string, @Body() updateNominalOutsideDiameterMmDto: UpdateNominalOutsideDiameterMmDto) {
    return this.nominalOutsideDiameterMmService.update(+id, updateNominalOutsideDiameterMmDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a nominal outside diameter' })
  @ApiResponse({ status: 200, description: 'Nominal outside diameter deleted successfully' })
  @ApiResponse({ status: 404, description: 'Nominal outside diameter not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID parameter' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.nominalOutsideDiameterMmService.remove(+id);
  }

  // nominal-outside-diameter-mm.controller.ts
  // @Get('full')
  // @ApiOperation({ summary: 'Get all nominal diameters with pipe dimensions and pressures' })
  // findAllFull() {
  //   return this.nominalOutsideDiameterMmService.findAllWithDimensionsAndPressures();
  // }

  // @Get('full/:id')
  // @ApiOperation({ summary: 'Get a nominal diameter by ID with pipe dimensions and pressures' })
  // findOneFull(@Param('id', ParseIntPipe) id: number) {
  //   return this.nominalOutsideDiameterMmService.findOneWithDimensionsAndPressures(id);
  // }
}
