export class TransportItemWeightDto {
  type: string;
  nominalBore: number;
  sdr?: number;
  length?: number;
  weightKg: number;
}

export class TransportWeightResponseDto {
  items: TransportItemWeightDto[];
  totalWeight: number;
  itemCount: number;
}
