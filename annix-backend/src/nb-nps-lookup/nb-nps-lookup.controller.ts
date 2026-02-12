import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NbNpsLookupService } from './nb-nps-lookup.service';
import { CreateNbNpsLookupDto } from './dto/create-nb-nps-lookup.dto';
import { UpdateNbNpsLookupDto } from './dto/update-nb-nps-lookup.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NbNpsLookup } from './entities/nb-nps-lookup.entity';

@Controller('nb-nps-lookup')
export class NbNpsLookupController {
  constructor(private readonly nbNpsLookupService: NbNpsLookupService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new NB/NPS lookup entry' })
  @ApiResponse({ status: 201, description: 'Lookup created', type: NbNpsLookup })
  @ApiResponse({ status: 400, description: 'Duplicate entry' })
  create(@Body() createNbNpsLookupDto: CreateNbNpsLookupDto) {
    return this.nbNpsLookupService.create(createNbNpsLookupDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all NB/NPS lookup entries' })
  @ApiResponse({ status: 200, description: 'All lookups returned', type: [NbNpsLookup] })
  findAll() {
    return this.nbNpsLookupService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a single NB/NPS lookup entry by ID' })
  @ApiResponse({ status: 200, description: 'Single lookup returned', type: NbNpsLookup })
  @ApiResponse({ status: 404, description: 'Lookup not found' })
  findOne(@Param('id') id: string) {
    return this.nbNpsLookupService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing NB/NPS lookup entry' })
  @ApiResponse({ status: 200, description: 'Lookup updated', type: NbNpsLookup })
  @ApiResponse({ status: 400, description: 'Duplicate entry' })
  @ApiResponse({ status: 404, description: 'Lookup not found' })
  update(@Param('id') id: string, @Body() updateNbNpsLookupDto: UpdateNbNpsLookupDto) {
    return this.nbNpsLookupService.update(+id, updateNbNpsLookupDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a NB/NPS lookup entry by ID' })
  @ApiResponse({ status: 204, description: 'Lookup deleted' })
  @ApiResponse({ status: 404, description: 'Lookup not found' })
  remove(@Param('id') id: string) {
    return this.nbNpsLookupService.remove(+id);
  }
}
