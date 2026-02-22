import { describe, expect, it } from "vitest";
import {
  fieldLabel,
  isFieldRequired,
  PumpFormData,
  requiredFieldsForServiceType,
  validatePumpForm,
} from "@product-data/pumps/formValidation";

describe("formValidation", () => {
  describe("validatePumpForm", () => {
    describe("new_pump service type", () => {
      it("returns errors for missing required fields", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some((e) => e.field === "pumpCategory")).toBe(true);
        expect(result.errors.some((e) => e.field === "pumpType")).toBe(true);
        expect(result.errors.some((e) => e.field === "flowRate")).toBe(true);
        expect(result.errors.some((e) => e.field === "totalHead")).toBe(true);
      });

      it("passes validation with all required fields", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 100,
          totalHead: 50,
          fluidType: "water",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it("returns error for flow rate <= 0", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 0,
          totalHead: 50,
          fluidType: "water",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.field === "flowRate")).toBe(true);
      });

      it("returns error for total head <= 0", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 100,
          totalHead: -5,
          fluidType: "water",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.field === "totalHead")).toBe(true);
      });

      it("returns warning for very high flow rate", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 15000,
          totalHead: 50,
          fluidType: "water",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(true);
        expect(result.warnings.some((w) => w.field === "flowRate")).toBe(true);
      });

      it("returns warning for very high head", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 100,
          totalHead: 600,
          fluidType: "water",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(true);
        expect(result.warnings.some((w) => w.field === "totalHead")).toBe(true);
      });

      it("returns warning for high temperature", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 100,
          totalHead: 50,
          operatingTemp: 250,
          fluidType: "water",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.warnings.some((w) => w.field === "operatingTemp")).toBe(true);
      });

      it("returns warning for low temperature", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 100,
          totalHead: 50,
          operatingTemp: -30,
          fluidType: "water",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.warnings.some((w) => w.field === "operatingTemp")).toBe(true);
      });

      it("returns warning for high viscosity", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 100,
          totalHead: 50,
          viscosity: 600,
          fluidType: "oil",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.warnings.some((w) => w.field === "viscosity")).toBe(true);
      });

      it("returns warning for high solids content", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "slurry",
          quantity: 1,
          flowRate: 100,
          totalHead: 50,
          solidsContent: 25,
          fluidType: "slurry",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.warnings.some((w) => w.field === "solidsContent")).toBe(true);
      });

      it("returns warning for corrosive fluid with cast iron casing", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 100,
          totalHead: 50,
          fluidType: "acid",
          isCorrosive: true,
          casingMaterial: "cast_iron",
          impellerMaterial: "ss_316",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.warnings.some((w) => w.field === "casingMaterial")).toBe(true);
      });

      it("returns warning for abrasive fluid with cast iron impeller", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "slurry",
          quantity: 1,
          flowRate: 100,
          totalHead: 50,
          fluidType: "slurry",
          isAbrasive: true,
          casingMaterial: "ss_316",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.warnings.some((w) => w.field === "impellerMaterial")).toBe(true);
      });

      it("returns warning for hazardous area without ATEX certification", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 100,
          totalHead: 50,
          fluidType: "hydrocarbon",
          hazardousArea: "zone_1",
          certifications: [],
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.warnings.some((w) => w.field === "certifications")).toBe(true);
      });

      it("does not warn for hazardous area with ATEX certification", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 100,
          totalHead: 50,
          fluidType: "hydrocarbon",
          hazardousArea: "zone_1",
          certifications: ["atex"],
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.warnings.some((w) => w.field === "certifications")).toBe(false);
      });

      it("returns warning for low NPSH available", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 100,
          totalHead: 50,
          npshAvailable: 0.5,
          fluidType: "water",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.warnings.some((w) => w.field === "npshAvailable")).toBe(true);
      });

      it("returns warning for unusual specific gravity", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 1,
          flowRate: 100,
          totalHead: 50,
          specificGravity: 0.3,
          fluidType: "gas",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.warnings.some((w) => w.field === "specificGravity")).toBe(true);
      });
    });

    describe("spare_parts service type", () => {
      it("returns errors for missing required fields", () => {
        const data: PumpFormData = {
          serviceType: "spare_parts",
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.field === "existingPumpModel")).toBe(true);
        expect(result.errors.some((e) => e.field === "spareParts")).toBe(true);
      });

      it("passes validation with all required fields", () => {
        const data: PumpFormData = {
          serviceType: "spare_parts",
          existingPumpModel: "KSB Etanorm 50-200",
          spareParts: ["impeller", "mechanical_seal"],
          quantity: 1,
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(true);
      });

      it("returns error for empty spare parts array", () => {
        const data: PumpFormData = {
          serviceType: "spare_parts",
          existingPumpModel: "KSB Etanorm 50-200",
          spareParts: [],
          quantity: 1,
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.field === "spareParts")).toBe(true);
      });
    });

    describe("repair_service service type", () => {
      it("returns errors for missing required fields", () => {
        const data: PumpFormData = {
          serviceType: "repair_service",
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.field === "existingPumpModel")).toBe(true);
        expect(result.errors.some((e) => e.field === "existingPumpSerial")).toBe(true);
      });

      it("passes validation with all required fields", () => {
        const data: PumpFormData = {
          serviceType: "repair_service",
          existingPumpModel: "KSB Etanorm 50-200",
          existingPumpSerial: "SN-12345",
          quantity: 1,
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(true);
      });
    });

    describe("rental service type", () => {
      it("returns errors for missing required fields", () => {
        const data: PumpFormData = {
          serviceType: "rental",
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.field === "pumpType")).toBe(true);
        expect(result.errors.some((e) => e.field === "flowRate")).toBe(true);
        expect(result.errors.some((e) => e.field === "rentalDurationDays")).toBe(true);
      });

      it("passes validation with all required fields", () => {
        const data: PumpFormData = {
          serviceType: "rental",
          pumpType: "submersible",
          quantity: 1,
          flowRate: 50,
          totalHead: 20,
          rentalDurationDays: 7,
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(true);
      });

      it("returns error for rental duration < 1 day", () => {
        const data: PumpFormData = {
          serviceType: "rental",
          pumpType: "submersible",
          quantity: 1,
          flowRate: 50,
          totalHead: 20,
          rentalDurationDays: 0,
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.field === "rentalDurationDays")).toBe(true);
      });

      it("returns warning for very long rental period", () => {
        const data: PumpFormData = {
          serviceType: "rental",
          pumpType: "submersible",
          quantity: 1,
          flowRate: 50,
          totalHead: 20,
          rentalDurationDays: 400,
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(true);
        expect(result.warnings.some((w) => w.field === "rentalDurationDays")).toBe(true);
      });
    });

    describe("common validations", () => {
      it("returns error for quantity < 1", () => {
        const data: PumpFormData = {
          serviceType: "new_pump",
          pumpCategory: "centrifugal",
          pumpType: "end_suction",
          quantity: 0,
          flowRate: 100,
          totalHead: 50,
          fluidType: "water",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          sealType: "mechanical_single",
          motorType: "electric_ac",
        };

        const result = validatePumpForm(data);

        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.field === "quantity")).toBe(true);
      });
    });
  });

  describe("requiredFieldsForServiceType", () => {
    it("returns correct fields for new_pump", () => {
      const fields = requiredFieldsForServiceType("new_pump");
      expect(fields).toContain("pumpCategory");
      expect(fields).toContain("pumpType");
      expect(fields).toContain("flowRate");
      expect(fields).toContain("totalHead");
    });

    it("returns correct fields for spare_parts", () => {
      const fields = requiredFieldsForServiceType("spare_parts");
      expect(fields).toContain("existingPumpModel");
      expect(fields).toContain("spareParts");
    });

    it("returns correct fields for repair_service", () => {
      const fields = requiredFieldsForServiceType("repair_service");
      expect(fields).toContain("existingPumpModel");
      expect(fields).toContain("existingPumpSerial");
    });

    it("returns correct fields for rental", () => {
      const fields = requiredFieldsForServiceType("rental");
      expect(fields).toContain("pumpType");
      expect(fields).toContain("flowRate");
      expect(fields).toContain("rentalDurationDays");
    });
  });

  describe("isFieldRequired", () => {
    it("returns true for required fields", () => {
      expect(isFieldRequired("pumpType", "new_pump")).toBe(true);
      expect(isFieldRequired("flowRate", "new_pump")).toBe(true);
    });

    it("returns false for optional fields", () => {
      expect(isFieldRequired("viscosity", "new_pump")).toBe(false);
      expect(isFieldRequired("operatingTemp", "spare_parts")).toBe(false);
    });

    it("returns different results for different service types", () => {
      expect(isFieldRequired("existingPumpModel", "new_pump")).toBe(false);
      expect(isFieldRequired("existingPumpModel", "spare_parts")).toBe(true);
      expect(isFieldRequired("existingPumpModel", "repair_service")).toBe(true);
    });
  });

  describe("fieldLabel", () => {
    it("returns correct labels for known fields", () => {
      expect(fieldLabel("flowRate")).toBe("Flow Rate");
      expect(fieldLabel("totalHead")).toBe("Total Head");
      expect(fieldLabel("casingMaterial")).toBe("Casing Material");
    });

    it("returns field name for unknown fields", () => {
      expect(fieldLabel("unknownField")).toBe("unknownField");
    });
  });
});
