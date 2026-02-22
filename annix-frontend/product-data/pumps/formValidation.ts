export type PumpServiceType = "new_pump" | "spare_parts" | "repair_service" | "rental";

export interface ValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface PumpFormData {
  serviceType?: PumpServiceType;
  pumpCategory?: string;
  pumpType?: string;
  quantity?: number;
  flowRate?: number;
  totalHead?: number;
  suctionHead?: number;
  npshAvailable?: number;
  dischargePressure?: number;
  operatingTemp?: number;
  fluidType?: string;
  specificGravity?: number;
  viscosity?: number;
  solidsContent?: number;
  ph?: number;
  isAbrasive?: boolean;
  isCorrosive?: boolean;
  casingMaterial?: string;
  impellerMaterial?: string;
  shaftMaterial?: string;
  sealType?: string;
  sealPlan?: string;
  suctionSize?: string;
  dischargeSize?: string;
  connectionType?: string;
  motorType?: string;
  motorPower?: number;
  voltage?: string;
  frequency?: string;
  hazardousArea?: string;
  certifications?: string[];
  spareParts?: string[];
  existingPumpModel?: string;
  existingPumpSerial?: string;
  rentalDurationDays?: number;
  unitCostFromSupplier?: number;
}

const REQUIRED_FIELDS_BY_SERVICE_TYPE: Record<PumpServiceType, (keyof PumpFormData)[]> = {
  new_pump: [
    "pumpCategory",
    "pumpType",
    "quantity",
    "flowRate",
    "totalHead",
    "fluidType",
    "casingMaterial",
    "impellerMaterial",
    "sealType",
    "motorType",
  ],
  spare_parts: ["existingPumpModel", "spareParts", "quantity"],
  repair_service: ["existingPumpModel", "existingPumpSerial", "quantity"],
  rental: ["pumpType", "quantity", "flowRate", "totalHead", "rentalDurationDays"],
};

const FIELD_LABELS: Record<string, string> = {
  serviceType: "Service Type",
  pumpCategory: "Pump Category",
  pumpType: "Pump Type",
  quantity: "Quantity",
  flowRate: "Flow Rate",
  totalHead: "Total Head",
  suctionHead: "Suction Head",
  npshAvailable: "NPSH Available",
  dischargePressure: "Discharge Pressure",
  operatingTemp: "Operating Temperature",
  fluidType: "Fluid Type",
  specificGravity: "Specific Gravity",
  viscosity: "Viscosity",
  solidsContent: "Solids Content",
  ph: "pH",
  casingMaterial: "Casing Material",
  impellerMaterial: "Impeller Material",
  shaftMaterial: "Shaft Material",
  sealType: "Seal Type",
  sealPlan: "Seal Plan",
  suctionSize: "Suction Size",
  dischargeSize: "Discharge Size",
  connectionType: "Connection Type",
  motorType: "Motor Type",
  motorPower: "Motor Power",
  voltage: "Voltage",
  frequency: "Frequency",
  hazardousArea: "Hazardous Area",
  certifications: "Certifications",
  spareParts: "Spare Parts",
  existingPumpModel: "Existing Pump Model",
  existingPumpSerial: "Existing Pump Serial",
  rentalDurationDays: "Rental Duration",
  unitCostFromSupplier: "Supplier Cost",
};

const isFieldEmpty = (value: any): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

export const validatePumpForm = (data: PumpFormData): ValidationResult => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const serviceType = data.serviceType ?? "new_pump";
  const requiredFields = REQUIRED_FIELDS_BY_SERVICE_TYPE[serviceType] ?? [];

  requiredFields.forEach((field) => {
    if (isFieldEmpty(data[field])) {
      errors.push({
        field,
        message: `${FIELD_LABELS[field] ?? field} is required`,
        severity: "error",
      });
    }
  });

  if (serviceType === "new_pump") {
    if (data.flowRate !== undefined && data.flowRate <= 0) {
      errors.push({
        field: "flowRate",
        message: "Flow rate must be greater than 0",
        severity: "error",
      });
    }

    if (data.totalHead !== undefined && data.totalHead <= 0) {
      errors.push({
        field: "totalHead",
        message: "Total head must be greater than 0",
        severity: "error",
      });
    }

    if (data.flowRate !== undefined && data.flowRate > 10000) {
      warnings.push({
        field: "flowRate",
        message: "Very high flow rate - verify this is correct",
        severity: "warning",
      });
    }

    if (data.totalHead !== undefined && data.totalHead > 500) {
      warnings.push({
        field: "totalHead",
        message: "Very high head - consider multistage pump",
        severity: "warning",
      });
    }

    if (data.specificGravity !== undefined) {
      if (data.specificGravity < 0.5 || data.specificGravity > 3) {
        warnings.push({
          field: "specificGravity",
          message: "Specific gravity outside typical range (0.5-3.0)",
          severity: "warning",
        });
      }
    }

    if (data.operatingTemp !== undefined) {
      if (data.operatingTemp > 200) {
        warnings.push({
          field: "operatingTemp",
          message: "High temperature - verify material compatibility",
          severity: "warning",
        });
      }
      if (data.operatingTemp < -20) {
        warnings.push({
          field: "operatingTemp",
          message: "Low temperature - verify material impact toughness",
          severity: "warning",
        });
      }
    }

    if (data.viscosity !== undefined && data.viscosity > 500) {
      warnings.push({
        field: "viscosity",
        message: "High viscosity - consider positive displacement pump",
        severity: "warning",
      });
    }

    if (data.solidsContent !== undefined && data.solidsContent > 20) {
      warnings.push({
        field: "solidsContent",
        message: "High solids content - verify pump type is suitable",
        severity: "warning",
      });
    }

    if (data.isCorrosive && data.casingMaterial === "cast_iron") {
      warnings.push({
        field: "casingMaterial",
        message: "Corrosive fluid with cast iron casing - consider upgrading material",
        severity: "warning",
      });
    }

    if (data.isAbrasive && data.impellerMaterial === "cast_iron") {
      warnings.push({
        field: "impellerMaterial",
        message: "Abrasive fluid with cast iron impeller - consider hardened materials",
        severity: "warning",
      });
    }

    if (data.hazardousArea && data.hazardousArea !== "none") {
      if (!data.certifications?.includes("atex") && !data.certifications?.includes("iecex")) {
        warnings.push({
          field: "certifications",
          message: "Hazardous area specified - ATEX/IECEx certification recommended",
          severity: "warning",
        });
      }
    }

    if (data.npshAvailable !== undefined && data.npshAvailable < 1) {
      warnings.push({
        field: "npshAvailable",
        message: "Low NPSHa - verify adequate suction conditions",
        severity: "warning",
      });
    }

    if (!isFieldEmpty(data.suctionSize) && !isFieldEmpty(data.dischargeSize)) {
      const suctionDN = parseInt(data.suctionSize?.replace(/\D/g, "") ?? "0", 10);
      const dischargeDN = parseInt(data.dischargeSize?.replace(/\D/g, "") ?? "0", 10);
      if (dischargeDN > suctionDN) {
        warnings.push({
          field: "dischargeSize",
          message: "Discharge larger than suction is unusual - verify sizing",
          severity: "warning",
        });
      }
    }
  }

  if (serviceType === "spare_parts") {
    if (data.spareParts?.length === 0) {
      errors.push({
        field: "spareParts",
        message: "At least one spare part must be selected",
        severity: "error",
      });
    }
  }

  if (serviceType === "rental") {
    if (data.rentalDurationDays !== undefined) {
      if (data.rentalDurationDays < 1) {
        errors.push({
          field: "rentalDurationDays",
          message: "Rental duration must be at least 1 day",
          severity: "error",
        });
      }
      if (data.rentalDurationDays > 365) {
        warnings.push({
          field: "rentalDurationDays",
          message: "Long rental period - consider purchase instead",
          severity: "warning",
        });
      }
    }
  }

  if (data.quantity !== undefined && data.quantity < 1) {
    errors.push({
      field: "quantity",
      message: "Quantity must be at least 1",
      severity: "error",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

export const requiredFieldsForServiceType = (serviceType: PumpServiceType): string[] => {
  return REQUIRED_FIELDS_BY_SERVICE_TYPE[serviceType] ?? [];
};

export const fieldLabel = (field: string): string => {
  return FIELD_LABELS[field] ?? field;
};

export const isFieldRequired = (
  field: keyof PumpFormData,
  serviceType: PumpServiceType,
): boolean => {
  const requiredFields = REQUIRED_FIELDS_BY_SERVICE_TYPE[serviceType] ?? [];
  return requiredFields.includes(field);
};
