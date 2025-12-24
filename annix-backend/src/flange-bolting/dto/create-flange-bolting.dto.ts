import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateFlangeBoltingMaterialDto {
  @IsString()
  materialGroup: string;

  @IsString()
  studSpec: string;

  @IsString()
  machineBoltSpec: string;

  @IsString()
  nutSpec: string;

  @IsString()
  washerSpec: string;
}

export class CreateFlangeBoltingDto {
  @IsNumber()
  standardId: number;

  @IsString()
  pressureClass: string;

  @IsString()
  nps: string;

  @IsNumber()
  numBolts: number;

  @IsNumber()
  boltDia: number;

  @IsOptional()
  @IsNumber()
  boltLengthDefault?: number;

  @IsOptional()
  @IsNumber()
  boltLengthSoSwTh?: number;

  @IsOptional()
  @IsNumber()
  boltLengthLj?: number;
}

export class BulkCreateFlangeBoltingDto {
  @IsNumber()
  standardId: number;

  @IsString()
  pressureClass: string;

  boltingData: Array<{
    nps: string;
    numBolts: number;
    boltDia: number;
    boltLengthDefault?: number;
    boltLengthSoSwTh?: number;
    boltLengthLj?: number;
  }>;
}
