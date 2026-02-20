import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { MovementType, ReferenceType } from "../entities/stock-movement.entity";

export class CreateStockMovementDto {
  @IsNumber()
  stockItemId: number;

  @IsEnum(MovementType)
  movementType: MovementType;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType?: ReferenceType;

  @IsOptional()
  @IsNumber()
  referenceId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;
}
