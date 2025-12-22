import { ApiProperty } from '@nestjs/swagger';

export class UpcomingRfqDto {
  @ApiProperty({ description: 'RFQ ID' })
  id: number;

  @ApiProperty({ description: 'RFQ number', example: 'RFQ-2025-0001' })
  rfqNumber: string;

  @ApiProperty({ description: 'Project name' })
  projectName: string;

  @ApiProperty({ description: 'Required/closing date' })
  requiredDate: Date;

  @ApiProperty({ description: 'Days remaining until closing' })
  daysRemaining: number;

  @ApiProperty({ description: 'RFQ status' })
  status: string;
}

export class PublicStatsDto {
  @ApiProperty({ description: 'Total number of RFQs posted' })
  totalRfqs: number;

  @ApiProperty({ description: 'Total number of registered suppliers' })
  totalSuppliers: number;

  @ApiProperty({ description: 'Total number of registered customers' })
  totalCustomers: number;

  @ApiProperty({ description: 'RFQs with upcoming closing dates', type: [UpcomingRfqDto] })
  upcomingRfqs: UpcomingRfqDto[];
}
