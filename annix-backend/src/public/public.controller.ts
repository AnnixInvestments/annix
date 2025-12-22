import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { PublicStatsDto } from './dto/public-stats.dto';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get public dashboard statistics',
    description: 'Returns public statistics for the home page dashboard including RFQ count, supplier count, and upcoming RFQ closing dates. No authentication required.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: PublicStatsDto,
  })
  async getPublicStats(): Promise<PublicStatsDto> {
    return this.publicService.getPublicStats();
  }

  @Get('stats/rfq-count')
  @ApiOperation({
    summary: 'Get total RFQ count',
    description: 'Returns the total number of RFQs in the system',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQ count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 150 },
      },
    },
  })
  async getRfqCount(): Promise<{ count: number }> {
    const count = await this.publicService.getRfqCount();
    return { count };
  }

  @Get('stats/customer-count')
  @ApiOperation({
    summary: 'Get total customer count',
    description: 'Returns the total number of registered customers',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Customer count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 50 },
      },
    },
  })
  async getCustomerCount(): Promise<{ count: number }> {
    const count = await this.publicService.getCustomerCount();
    return { count };
  }

  @Get('stats/supplier-count')
  @ApiOperation({
    summary: 'Get total supplier count',
    description: 'Returns the total number of registered suppliers',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 25 },
      },
    },
  })
  async getSupplierCount(): Promise<{ count: number }> {
    const count = await this.publicService.getSupplierCount();
    return { count };
  }
}
