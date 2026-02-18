export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "select"
  | "multiselect"
  | "date"
  | "number"
  | "checkbox"
  | "location"
  | "textarea";

export interface FieldDefinition {
  fieldId: string;
  label: string;
  helpText: string;
  required: boolean;
  fieldType: FieldType;
  step: number;
  order: number;
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    min?: number;
    max?: number;
  };
  options?: Array<{ value: string; label: string }>;
  dependsOn?: string;
}

export const RFQ_FIELD_REGISTRY: Record<string, FieldDefinition> = {
  customerName: {
    fieldId: "customerName",
    label: "Customer Name",
    helpText:
      "Enter the name of the company or individual requesting the quote. This will appear on all documentation.",
    required: true,
    fieldType: "text",
    step: 1,
    order: 1,
    validationRules: {
      minLength: 2,
      maxLength: 200,
    },
  },
  customerEmail: {
    fieldId: "customerEmail",
    label: "Customer Email",
    helpText:
      "The email address where quote updates and confirmations will be sent. Make sure this is accurate.",
    required: true,
    fieldType: "email",
    step: 1,
    order: 2,
    validationRules: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  },
  customerPhone: {
    fieldId: "customerPhone",
    label: "Customer Phone",
    helpText:
      "A contact number for urgent communications about the quote. Include country code for international numbers.",
    required: false,
    fieldType: "phone",
    step: 1,
    order: 3,
  },
  projectName: {
    fieldId: "projectName",
    label: "Project Name",
    helpText:
      "A descriptive name for this project that helps you identify it later. For example: 'Slurry Line Replacement Phase 2'.",
    required: false,
    fieldType: "text",
    step: 1,
    order: 4,
    validationRules: {
      maxLength: 200,
    },
  },
  projectType: {
    fieldId: "projectType",
    label: "Project Type",
    helpText:
      "Select the category that best describes this project. This helps us route your RFQ to the right specialists.",
    required: true,
    fieldType: "select",
    step: 1,
    order: 5,
  },
  requiredProducts: {
    fieldId: "requiredProducts",
    label: "Required Products",
    helpText:
      "Select all the product categories you need for this project. You can select multiple options.",
    required: true,
    fieldType: "multiselect",
    step: 1,
    order: 6,
  },
  requiredDate: {
    fieldId: "requiredDate",
    label: "Required By Date",
    helpText:
      "The date by which you need the quoted items delivered. This helps suppliers plan capacity.",
    required: true,
    fieldType: "date",
    step: 1,
    order: 7,
  },
  description: {
    fieldId: "description",
    label: "Project Description",
    helpText:
      "Provide additional context about the project. Include any special requirements, site conditions, or constraints.",
    required: false,
    fieldType: "textarea",
    step: 1,
    order: 8,
  },
  siteAddress: {
    fieldId: "siteAddress",
    label: "Site Address",
    helpText:
      "The physical location where items will be delivered or installed. Use the map picker for precise coordinates.",
    required: false,
    fieldType: "location",
    step: 1,
    order: 9,
  },
  latitude: {
    fieldId: "latitude",
    label: "Latitude",
    helpText: "GPS latitude coordinate for the site location.",
    required: false,
    fieldType: "number",
    step: 1,
    order: 10,
  },
  longitude: {
    fieldId: "longitude",
    label: "Longitude",
    helpText: "GPS longitude coordinate for the site location.",
    required: false,
    fieldType: "number",
    step: 1,
    order: 11,
  },
  region: {
    fieldId: "region",
    label: "Region/Province",
    helpText: "The province or region where the site is located.",
    required: false,
    fieldType: "text",
    step: 1,
    order: 12,
  },
  country: {
    fieldId: "country",
    label: "Country",
    helpText: "The country where the site is located.",
    required: false,
    fieldType: "text",
    step: 1,
    order: 13,
  },
  notes: {
    fieldId: "notes",
    label: "Additional Notes",
    helpText:
      "Any other information that might be helpful for the quote. Include special handling requirements or constraints.",
    required: false,
    fieldType: "textarea",
    step: 1,
    order: 14,
  },
  steelSpecificationId: {
    fieldId: "steelSpecificationId",
    label: "Steel Specification",
    helpText:
      "The material standard for the steel. Common options include API 5L Grade B for line pipe or ASTM A106 Grade B for seamless carbon steel.",
    required: true,
    fieldType: "select",
    step: 2,
    order: 1,
  },
  workingPressureBar: {
    fieldId: "workingPressureBar",
    label: "Working Pressure (bar)",
    helpText:
      "The maximum operating pressure of the piping system in bar. This determines wall thickness and flange rating requirements.",
    required: true,
    fieldType: "number",
    step: 2,
    order: 2,
    validationRules: {
      min: 0,
      max: 500,
    },
  },
  workingTemperatureC: {
    fieldId: "workingTemperatureC",
    label: "Working Temperature (°C)",
    helpText:
      "The operating temperature of the piping system. Extreme temperatures may require special materials or heat treatment.",
    required: true,
    fieldType: "number",
    step: 2,
    order: 3,
    validationRules: {
      min: -200,
      max: 1000,
    },
  },
  flangeStandardId: {
    fieldId: "flangeStandardId",
    label: "Flange Standard",
    helpText:
      "The flange drilling pattern standard. SANS 1123 Table 1000/3 is common in South Africa, while ANSI is used internationally.",
    required: false,
    fieldType: "select",
    step: 2,
    order: 4,
  },
  pressureClassId: {
    fieldId: "pressureClassId",
    label: "Pressure Class",
    helpText:
      "The flange pressure rating. PN16 is common for most applications. Higher classes like PN40 are used for high-pressure systems.",
    required: false,
    fieldType: "select",
    step: 2,
    order: 5,
    dependsOn: "flangeStandardId",
  },
  flangeTypeId: {
    fieldId: "flangeTypeId",
    label: "Flange Type",
    helpText:
      "The flange face type. Slip-on flanges are easier to install, while weld-neck flanges are stronger for high-pressure applications.",
    required: false,
    fieldType: "select",
    step: 2,
    order: 6,
  },
  coatingLining: {
    fieldId: "coatingLining",
    label: "Coating/Lining",
    helpText:
      "Protective coating or lining for corrosion resistance. Common options include epoxy coating, galvanizing, or rubber lining for slurry applications.",
    required: false,
    fieldType: "select",
    step: 2,
    order: 7,
  },
};

export const fieldsByStep = (step: number): FieldDefinition[] =>
  Object.values(RFQ_FIELD_REGISTRY)
    .filter((field) => field.step === step)
    .sort((a, b) => a.order - b.order);

export const requiredFieldsByStep = (step: number): FieldDefinition[] =>
  fieldsByStep(step).filter((field) => field.required);

export const fieldById = (fieldId: string): FieldDefinition | null =>
  RFQ_FIELD_REGISTRY[fieldId] ?? null;

export const nextRequiredField = (
  currentFieldId: string | null,
  completedFields: string[],
  step: number,
): FieldDefinition | null => {
  const stepFields = requiredFieldsByStep(step);
  const incomplete = stepFields.filter((f) => !completedFields.includes(f.fieldId));

  if (!currentFieldId) {
    return incomplete[0] ?? null;
  }

  const currentIndex = stepFields.findIndex((f) => f.fieldId === currentFieldId);
  const remaining = incomplete.filter((f) => {
    const fIndex = stepFields.findIndex((sf) => sf.fieldId === f.fieldId);
    return fIndex > currentIndex;
  });

  return remaining[0] ?? incomplete[0] ?? null;
};

export const nextField = (
  currentFieldId: string | null,
  completedFields: string[],
  step: number,
): FieldDefinition | null => {
  const stepFields = fieldsByStep(step);
  const incomplete = stepFields.filter((f) => !completedFields.includes(f.fieldId));

  if (!currentFieldId) {
    return incomplete[0] ?? null;
  }

  const currentIndex = stepFields.findIndex((f) => f.fieldId === currentFieldId);
  const remaining = incomplete.filter((f) => {
    const fIndex = stepFields.findIndex((sf) => sf.fieldId === f.fieldId);
    return fIndex > currentIndex;
  });

  return remaining[0] ?? null;
};

export const progressForStep = (step: number, completedFields: string[]): number => {
  const required = requiredFieldsByStep(step);
  if (required.length === 0) return 100;
  const completed = required.filter((f) => completedFields.includes(f.fieldId)).length;
  return Math.round((completed / required.length) * 100);
};
