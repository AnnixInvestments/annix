import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRfqDto } from './create-rfq.dto';
import { CreateStraightPipeRfqDto } from './create-straight-pipe-rfq.dto';
import { RfqItemType } from '../entities/rfq-item.entity';

export class CreateRfqItemDto {
  @ApiProperty({ description: 'Item description', example: '500NB Sch20 Straight Pipe for 10 Bar Pipeline' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Type of RFQ item', enum: RfqItemType })
  @IsEnum(RfqItemType)
  itemType: RfqItemType;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateStraightPipeRfqWithItemDto {
  @ApiProperty({ description: 'RFQ details' })
  @ValidateNested()
  @Type(() => CreateRfqDto)
  rfq: CreateRfqDto;

  @ApiProperty({ description: 'Straight pipe specifications' })
  @ValidateNested()
  @Type(() => CreateStraightPipeRfqDto)
  straightPipe: CreateStraightPipeRfqDto;

  @ApiProperty({ description: 'Item description', example: '500NB Sch20 Straight Pipe for 10 Bar Pipeline' })
  @IsString()
  itemDescription: string;

  @ApiProperty({ description: 'Additional item notes', required: false })
  @IsOptional()
  @IsString()
  itemNotes?: string;
}