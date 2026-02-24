import { IsOptional, IsString } from "class-validator";

export class IdentifyItemDto {
  @IsOptional()
  @IsString()
  context?: string;
}

export interface IdentifiedItem {
  name: string;
  category: string;
  description: string;
  confidence: number;
  suggestedSku: string;
}

export interface IdentifyItemResponse {
  identifiedItems: IdentifiedItem[];
  matchingStockItems: {
    id: number;
    sku: string;
    name: string;
    category: string | null;
    similarity: number;
  }[];
  rawAnalysis: string;
}
