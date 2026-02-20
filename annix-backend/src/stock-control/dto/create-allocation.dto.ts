import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateAllocationDto {
  @IsNumber()
  stockItemId: number;

  @IsNumber()
  jobCardId: number;

  @IsNumber()
  @Min(1)
  quantityUsed: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  allocatedBy?: string;
}
