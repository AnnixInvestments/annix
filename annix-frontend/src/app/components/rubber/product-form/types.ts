import type { RubberSpecificationDto } from "@/app/lib/api/auRubberApi";
import type {
  CreateRubberProductDto,
  RubberCompanyDto,
  RubberProductCodingDto,
  RubberProductDto,
} from "@/app/lib/api/rubberPortalApi";

export type ProductColorVariant = "blue" | "yellow";

export interface BaseProductFormData {
  title: string;
  description: string;
  specificGravity: string;
  compoundOwnerFirebaseUid: string;
  compoundFirebaseUid: string;
  typeFirebaseUid: string;
  costPerKg: string;
  colourFirebaseUid: string;
  hardnessFirebaseUid: string;
  curingMethodFirebaseUid: string;
  gradeFirebaseUid: string;
  tensileStrengthMpa: string;
  elongationAtBreak: string;
  markup: string;
}

export const BASE_INITIAL_FORM_DATA: BaseProductFormData = {
  title: "",
  description: "",
  specificGravity: "",
  compoundOwnerFirebaseUid: "",
  compoundFirebaseUid: "",
  typeFirebaseUid: "",
  costPerKg: "",
  colourFirebaseUid: "",
  hardnessFirebaseUid: "",
  curingMethodFirebaseUid: "",
  gradeFirebaseUid: "",
  tensileStrengthMpa: "",
  elongationAtBreak: "",
  markup: "",
};

export function baseFormDataFromProduct(product: RubberProductDto): BaseProductFormData {
  const rawTitle = product.title;
  const rawDescription = product.description;
  const rawCompoundOwnerFirebaseUid = product.compoundOwnerFirebaseUid;
  const rawCompoundFirebaseUid = product.compoundFirebaseUid;
  const rawTypeFirebaseUid = product.typeFirebaseUid;
  const rawColourFirebaseUid = product.colourFirebaseUid;
  const rawHardnessFirebaseUid = product.hardnessFirebaseUid;
  const rawCuringMethodFirebaseUid = product.curingMethodFirebaseUid;
  const rawGradeFirebaseUid = product.gradeFirebaseUid;
  return {
    title: rawTitle || "",
    description: rawDescription || "",
    specificGravity: product.specificGravity?.toString() || "",
    compoundOwnerFirebaseUid: rawCompoundOwnerFirebaseUid || "",
    compoundFirebaseUid: rawCompoundFirebaseUid || "",
    typeFirebaseUid: rawTypeFirebaseUid || "",
    costPerKg: product.costPerKg?.toString() || "",
    colourFirebaseUid: rawColourFirebaseUid || "",
    hardnessFirebaseUid: rawHardnessFirebaseUid || "",
    curingMethodFirebaseUid: rawCuringMethodFirebaseUid || "",
    gradeFirebaseUid: rawGradeFirebaseUid || "",
    tensileStrengthMpa: product.tensileStrengthMpa?.toString() || "",
    elongationAtBreak: product.elongationAtBreak?.toString() || "",
    markup: product.markup?.toString() || "",
  };
}

export function baseFormDataToDto(formData: BaseProductFormData): CreateRubberProductDto {
  const rawCompoundOwnerFirebaseUid2 = formData.compoundOwnerFirebaseUid;
  const rawCompoundFirebaseUid2 = formData.compoundFirebaseUid;
  const rawColourFirebaseUid2 = formData.colourFirebaseUid;
  const rawHardnessFirebaseUid2 = formData.hardnessFirebaseUid;
  const rawCuringMethodFirebaseUid2 = formData.curingMethodFirebaseUid;
  const rawGradeFirebaseUid2 = formData.gradeFirebaseUid;
  return {
    title: formData.title.trim() || null,
    description: formData.description.trim() || null,
    specificGravity: formData.specificGravity ? parseFloat(formData.specificGravity) : null,
    compoundOwnerFirebaseUid: rawCompoundOwnerFirebaseUid2 || null,
    compoundFirebaseUid: rawCompoundFirebaseUid2 || null,
    typeFirebaseUid:
      formData.typeFirebaseUid && formData.typeFirebaseUid !== "NONE"
        ? formData.typeFirebaseUid
        : null,
    costPerKg: formData.costPerKg ? parseFloat(formData.costPerKg) : null,
    colourFirebaseUid: rawColourFirebaseUid2 || null,
    hardnessFirebaseUid: rawHardnessFirebaseUid2 || null,
    curingMethodFirebaseUid: rawCuringMethodFirebaseUid2 || null,
    gradeFirebaseUid: rawGradeFirebaseUid2 || null,
    tensileStrengthMpa: formData.tensileStrengthMpa
      ? parseFloat(formData.tensileStrengthMpa)
      : null,
    elongationAtBreak: formData.elongationAtBreak ? parseInt(formData.elongationAtBreak, 10) : null,
    markup: formData.markup ? parseFloat(formData.markup) : null,
  };
}

export interface ProductColorClasses {
  focusRing: string;
  submitBg: string;
  spinnerBorder: string;
}

export const COLOR_CLASSES: Record<ProductColorVariant, ProductColorClasses> = {
  blue: {
    focusRing: "focus:ring-blue-500 focus:border-blue-500",
    submitBg: "bg-blue-600 hover:bg-blue-700",
    spinnerBorder: "border-blue-600",
  },
  yellow: {
    focusRing: "focus:ring-yellow-500 focus:border-yellow-500",
    submitBg: "bg-yellow-600 hover:bg-yellow-700",
    spinnerBorder: "border-yellow-600",
  },
};

export interface BaseProductFormProps {
  initialData: BaseProductFormData;
  onSubmit: (dto: CreateRubberProductDto) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  isSaving: boolean;
  colorVariant: ProductColorVariant;
  codings: RubberProductCodingDto[];
  companies: RubberCompanyDto[];
  specifications: RubberSpecificationDto[] | null;
  isLoadingData: boolean;
  loadError: Error | null;
  sansMode: boolean;
}
