export interface PumpProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: "CENTRIFUGAL" | "POSITIVE_DISPLACEMENT" | "SPECIALTY";
  manufacturer?: string;
  status?: "ACTIVE" | "DISCONTINUED" | "OUT_OF_STOCK";
  minFlowRate?: number;
  maxFlowRate?: number;
  minHead?: number;
  maxHead?: number;
}

export interface PumpProduct {
  id: number;
  sku: string;
  title: string;
  description?: string;
  pumpType: string;
  category: "CENTRIFUGAL" | "POSITIVE_DISPLACEMENT" | "SPECIALTY";
  status: "ACTIVE" | "DISCONTINUED" | "OUT_OF_STOCK";
  manufacturer: string;
  modelNumber?: string;
  flowRateMin?: number;
  flowRateMax?: number;
  headMin?: number;
  headMax?: number;
  motorPowerKw?: number;
  listPrice?: number;
  stockQuantity?: number;
  certifications?: string[];
  applications?: string[];
  specifications?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PumpProductListResponse {
  items: PumpProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PumpCalculationParams {
  pumpType: string;
  flowRate?: number;
  totalHead?: number;
  specificGravity?: number;
  viscosity?: number;
  solidsContent?: number;
  npshAvailable?: number;
  isAbrasive?: boolean;
  isCorrosive?: boolean;
}

export interface PumpCalculationResult {
  hydraulicPowerKw: number;
  estimatedMotorPowerKw: number;
  estimatedEfficiency: number;
  specificSpeed: number;
  recommendedPumpType: string;
  npshRequired: number;
  bepFlowRate: number;
  bepHead: number;
  operatingPointPercentBep: number;
  warnings: string[];
  recommendations: string[];
}
