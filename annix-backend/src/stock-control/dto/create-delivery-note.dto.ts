import { Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class CreateDeliveryNoteItemDto {
  @IsNumber()
  stockItemId: number;

  @IsNumber()
  @Min(1)
  quantityReceived: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}

export class CreateDeliveryNoteDto {
  @IsString()
  deliveryNumber: string;

  @IsString()
  supplierName: string;

  @IsOptional()
  @IsString()
  receivedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  receivedBy?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryNoteItemDto)
  items: CreateDeliveryNoteItemDto[];
}
