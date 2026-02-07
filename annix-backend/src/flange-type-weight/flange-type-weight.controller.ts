import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { FlangeTypeWeightService } from "./flange-type-weight.service";

@ApiTags("flange-type-weight")
@Controller("flange-type-weight")
export class FlangeTypeWeightController {
  constructor(private readonly flangeTypeWeightService: FlangeTypeWeightService) {}

  @Get()
  @ApiOperation({ summary: "Get all flange type weights" })
  findAll() {
    return this.flangeTypeWeightService.findAll();
  }

  @Get("lookup")
  @ApiOperation({
    summary: "Get flange weight for specific type, standard, NB, and pressure class",
  })
  @ApiQuery({ name: "nominalBoreMm", description: "Nominal bore in mm" })
  @ApiQuery({
    name: "pressureClass",
    description: "Pressure class (e.g., PN16, Class 150, 1000/3)",
  })
  @ApiQuery({
    name: "flangeStandardCode",
    required: false,
    description: "Flange standard code (e.g., SANS 1123, BS 4504)",
  })
  @ApiQuery({
    name: "flangeTypeCode",
    description: "Flange type code (e.g., /1, /2, /3, WN, SO, BL)",
  })
  flangeTypeWeight(
    @Query("nominalBoreMm") nominalBoreMm: string,
    @Query("pressureClass") pressureClass: string,
    @Query("flangeStandardCode") flangeStandardCode: string | undefined,
    @Query("flangeTypeCode") flangeTypeCode: string,
  ) {
    const nbNum = parseInt(nominalBoreMm, 10);
    return this.flangeTypeWeightService.flangeTypeWeight(
      nbNum,
      pressureClass,
      flangeStandardCode || null,
      flangeTypeCode,
    );
  }

  @Get("blank")
  @ApiOperation({
    summary: "Get blank flange weight for specific NB and pressure class",
  })
  @ApiQuery({ name: "nominalBoreMm", description: "Nominal bore in mm" })
  @ApiQuery({
    name: "pressureClass",
    description: "Pressure class (e.g., PN16, Class 150)",
  })
  blankFlangeWeight(
    @Query("nominalBoreMm") nominalBoreMm: string,
    @Query("pressureClass") pressureClass: string,
  ) {
    const nbNum = parseInt(nominalBoreMm, 10);
    return this.flangeTypeWeightService.blankFlangeWeight(nbNum, pressureClass);
  }

  @Get("pressure-classes")
  @ApiOperation({ summary: "Get available pressure classes" })
  availablePressureClasses() {
    return this.flangeTypeWeightService.availablePressureClasses();
  }

  @Get("flange-types")
  @ApiOperation({ summary: "Get available flange types" })
  availableFlangeTypes() {
    return this.flangeTypeWeightService.availableFlangeTypes();
  }
}
