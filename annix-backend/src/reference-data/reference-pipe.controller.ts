import {
  ANSI_PRESSURE_CLASSES,
  B16_PRESSURE_CLASSES,
  type B16PressureClass,
  type ClassSelectionResult,
  DEFAULT_NOMINAL_BORES,
  FLANGE_OD,
  interpolatePTRating,
  MATERIAL_GROUP_MAPPINGS,
  PIPE_END_OPTIONS,
  PIPE_TOLERANCES,
  selectRequiredClass,
  WORKING_PRESSURE_BAR,
  WORKING_TEMPERATURE_CELSIUS,
} from "@annix/product-data/pipe";
import { Body, Controller, Get, Header, HttpStatus, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export class B16RatingRequestDto {
  @IsString()
  materialGroup!: string;

  @IsIn(["150", "300", "400", "600", "900", "1500", "2500"])
  pressureClass!: B16PressureClass;

  @IsNumber()
  temperatureC!: number;

  @IsOptional()
  @IsNumber()
  pressureBar?: number;
}

@ApiTags("Reference Data")
@Controller("public/reference")
export class ReferencePipeController {
  @Get("pipe-specs")
  @Header("Cache-Control", "public, max-age=31536000, immutable")
  @ApiOperation({
    summary: "Pipe engineering reference data",
    description:
      "Returns static pipe engineering reference data (nominal bores, schedules, end types, tolerances, material groups, flange ODs, working pressures/temperatures, ANSI classes). Safe for aggressive caching.",
  })
  @ApiResponse({ status: HttpStatus.OK, description: "Reference data retrieved successfully" })
  pipeSpecs(): {
    nominalBores: readonly number[];
    schedules: readonly B16PressureClass[];
    endTypes: typeof PIPE_END_OPTIONS;
    tolerances: typeof PIPE_TOLERANCES;
    materialGroups: typeof MATERIAL_GROUP_MAPPINGS;
    flangeOd: Record<number, number>;
    workingPressureBar: readonly number[];
    workingTemperatureCelsius: readonly number[];
    ansiPressureClasses: readonly number[];
  } {
    return {
      nominalBores: DEFAULT_NOMINAL_BORES,
      schedules: B16_PRESSURE_CLASSES,
      endTypes: PIPE_END_OPTIONS,
      tolerances: PIPE_TOLERANCES,
      materialGroups: MATERIAL_GROUP_MAPPINGS,
      flangeOd: FLANGE_OD,
      workingPressureBar: WORKING_PRESSURE_BAR,
      workingTemperatureCelsius: WORKING_TEMPERATURE_CELSIUS,
      ansiPressureClasses: ANSI_PRESSURE_CLASSES,
    };
  }

  @Post("b16-rating")
  @ApiOperation({
    summary: "ASME B16.5 pressure-temperature rating lookup",
    description:
      "Computes the ASME B16.5 pressure-temperature rating for a given material group, pressure class, and temperature. If pressureBar is supplied, also returns the minimum required class and margin.",
  })
  @ApiResponse({ status: HttpStatus.OK, description: "Rating computed successfully" })
  b16Rating(@Body() body: B16RatingRequestDto): {
    ratedPressureBar: number | null;
    margin: number | null;
    interpolationNotes: string | null;
    classSelection: ClassSelectionResult | null;
  } {
    const interpolation = interpolatePTRating(
      body.pressureClass,
      body.materialGroup,
      body.temperatureC,
    );

    const ratedPressureBar = interpolation ? interpolation.pressureBar : null;

    const designPressure = body.pressureBar;
    const classSelection =
      designPressure !== undefined && designPressure !== null
        ? selectRequiredClass(designPressure, body.temperatureC, body.materialGroup)
        : null;

    const margin =
      ratedPressureBar !== null && designPressure !== undefined && designPressure !== null
        ? Math.round(((ratedPressureBar - designPressure) / designPressure) * 1000) / 10
        : null;

    return {
      ratedPressureBar,
      margin,
      interpolationNotes: interpolation?.notes ?? null,
      classSelection,
    };
  }
}
