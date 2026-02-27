import { MaterialLimit } from "../entities/material-limit.entity";

export class MaterialLimitResponseDto {
  id: number;
  steelSpecificationId: number | null;
  steelSpecName: string;
  minTemperatureCelsius: number;
  maxTemperatureCelsius: number;
  maxPressureBar: number;
  materialType: string;
  recommendedForSourService: boolean;
  notes: string | null;
  asmePNumber: string | null;
  asmeGroupNumber: string | null;
  defaultGrade: string | null;
  isSeamless: boolean;
  isWelded: boolean;
  standardCode: string | null;

  static fromEntity(entity: MaterialLimit): MaterialLimitResponseDto {
    const dto = new MaterialLimitResponseDto();
    dto.id = entity.id;
    dto.steelSpecificationId = entity.steel_specification_id ?? null;
    dto.steelSpecName = entity.specification_pattern;
    dto.minTemperatureCelsius = Number(entity.min_temp_c);
    dto.maxTemperatureCelsius = Number(entity.max_temp_c);
    dto.maxPressureBar = Number(entity.max_pressure_bar);
    dto.materialType = entity.material_type;
    dto.recommendedForSourService = false;
    dto.notes = entity.notes ?? null;
    dto.asmePNumber = entity.asme_p_number ?? null;
    dto.asmeGroupNumber = entity.asme_group_number ?? null;
    dto.defaultGrade = entity.default_grade ?? null;
    dto.isSeamless = entity.is_seamless ?? false;
    dto.isWelded = entity.is_welded ?? false;
    dto.standardCode = entity.standard_code ?? null;
    return dto;
  }

  static fromEntities(entities: MaterialLimit[]): MaterialLimitResponseDto[] {
    return entities.map((e) => MaterialLimitResponseDto.fromEntity(e));
  }
}
