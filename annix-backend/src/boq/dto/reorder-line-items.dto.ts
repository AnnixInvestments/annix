import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, ArrayMinSize } from 'class-validator';

export class ReorderLineItemsDto {
  @ApiProperty({ description: 'Array of line item IDs in the new order', type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  itemIds: number[];
}
