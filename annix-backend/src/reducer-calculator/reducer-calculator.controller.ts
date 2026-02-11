import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  CalculateReducerAreaDto,
  CalculateReducerMassDto,
  ReducerAreaResultDto,
  ReducerFullCalculationDto,
  ReducerFullResultDto,
  ReducerMassResultDto,
} from "./dto/calculate-reducer.dto";
import { ReducerCalculatorService } from "./reducer-calculator.service";

@ApiTags("Reducer Calculator")
@Controller("reducer-calculator")
export class ReducerCalculatorController {
  constructor(private readonly reducerCalculatorService: ReducerCalculatorService) {}

  @Post("mass")
  @ApiOperation({
    summary: "Calculate reducer mass/weight",
    description:
      "Calculates the mass of a reducer fitting using the frustum volume formula. " +
      "V = (π/12) × L × (D² + D×d + d²). Mass = (V_outer - V_inner) × density",
  })
  @ApiResponse({
    status: 200,
    description: "Mass calculation result",
    type: ReducerMassResultDto,
  })
  calculateMass(@Body() dto: CalculateReducerMassDto): ReducerMassResultDto {
    return this.reducerCalculatorService.calculateMass(dto);
  }

  @Post("area")
  @ApiOperation({
    summary: "Calculate reducer surface areas",
    description:
      "Calculates the internal and external surface areas of a reducer fitting " +
      "using the frustum lateral surface area formula: A = π × s × (R + r). " +
      "Also supports optional straight pipe extensions at each end.",
  })
  @ApiResponse({
    status: 200,
    description: "Area calculation result",
    type: ReducerAreaResultDto,
  })
  calculateArea(@Body() dto: CalculateReducerAreaDto): ReducerAreaResultDto {
    return this.reducerCalculatorService.calculateArea(dto);
  }

  @Post("full")
  @ApiOperation({
    summary: "Calculate reducer mass, area, and optional coating costs",
    description:
      "Performs a complete reducer calculation including mass, surface areas, " +
      "and optional coating cost estimates based on area and coating rate per m².",
  })
  @ApiResponse({
    status: 200,
    description: "Full calculation result",
    type: ReducerFullResultDto,
  })
  calculateFull(@Body() dto: ReducerFullCalculationDto): ReducerFullResultDto {
    return this.reducerCalculatorService.calculateFull(dto);
  }

  @Get("standard-length")
  @ApiOperation({
    summary: "Get standard reducer length",
    description:
      "Returns the standard centreline length for a reducer based on the large end " +
      "nominal bore size. Based on SABS/ASME standards.",
  })
  @ApiQuery({
    name: "largeNbMm",
    description: "Large end nominal bore in mm",
    example: 400,
  })
  @ApiQuery({
    name: "smallNbMm",
    description: "Small end nominal bore in mm",
    example: 300,
  })
  @ApiResponse({
    status: 200,
    description: "Standard reducer length in mm",
    schema: {
      type: "object",
      properties: {
        largeNbMm: { type: "number" },
        smallNbMm: { type: "number" },
        standardLengthMm: { type: "number" },
      },
    },
  })
  standardLength(
    @Query("largeNbMm") largeNbMm: number,
    @Query("smallNbMm") smallNbMm: number,
  ): { largeNbMm: number; smallNbMm: number; standardLengthMm: number } {
    const standardLengthMm = this.reducerCalculatorService.standardReducerLength(
      Number(largeNbMm),
      Number(smallNbMm),
    );
    return {
      largeNbMm: Number(largeNbMm),
      smallNbMm: Number(smallNbMm),
      standardLengthMm,
    };
  }
}
