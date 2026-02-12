import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRfqDto } from './create-rfq.dto';
import { CreateBendRfqDto } from './create-bend-rfq.dto';

export class CreateBendRfqWithItemDto {
  @ApiProperty({ description: 'RFQ details' })
  @ValidateNested()
  @Type(() => CreateRfqDto)
  rfq: CreateRfqDto;

  @ApiProperty({ description: 'Bend specifications' })
  @ValidateNested()
  @Type(() => CreateBendRfqDto)
  bend: CreateBendRfqDto;

  @ApiProperty({ 
    description: 'Item description', 
    example: '350NB 3D 45° Pulled Bend, Sch30 with 1 tangent of 400mm for 16 Bar Line'
  })
  @IsString()
  itemDescription: string;

  @ApiProperty({ 
    description: 'Additional item notes', 
    required: false,
    example: 'Special coating requirements or installation notes'
  })
  @IsOptional()
  @IsString()
  itemNotes?: string;
}