import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { GasketWeightService } from "./gasket-weight.service";

@ApiTags("gasket-weight")
@Controller("gasket-weight")
export class GasketWeightController {
  constructor(private readonly gasketWeightService: GasketWeightService) {}

  @Get()
  @ApiOperation({ summary: "Get all gasket weights" })
  findAll() {
    return this.gasketWeightService.findAll();
  }

  @Get("gasket")
  @ApiOperation({ summary: "Get gasket weight for specific type and NB" })
  @ApiQuery({
    name: "gasketType",
    description: "Gasket type (ASBESTOS, GRAPHITE, PTFE, RUBBER)",
  })
  @ApiQuery({ name: "nb", description: "Nominal bore in mm" })
  getGasketWeight(@Query("gasketType") gasketType: string, @Query("nb") nb: string) {
    const nbNum = parseInt(nb, 10);
    return this.gasketWeightService.gasketWeight(gasketType, nbNum);
  }

  @Get("flange")
  @ApiOperation({
    summary: "Get flange weight for specific NB and pressure class",
  })
  @ApiQuery({ name: "nb", description: "Nominal bore in mm" })
  @ApiQuery({
    name: "pressureClass",
    description: "Pressure class (e.g., PN16, Class 150)",
  })
  @ApiQuery({
    name: "flangeStandard",
    required: false,
    description: "Flange standard code (optional)",
  })
  getFlangeWeight(
    @Query("nb") nb: string,
    @Query("pressureClass") pressureClass: string,
    @Query("flangeStandard") flangeStandard?: string,
  ) {
    const nbNum = parseInt(nb, 10);
    return this.gasketWeightService.flangeWeight(nbNum, pressureClass, flangeStandard);
  }

  @Get("blank-flange")
  @ApiOperation({
    summary: "Get blank flange weight for specific NB and pressure class",
  })
  @ApiQuery({ name: "nb", description: "Nominal bore in mm" })
  @ApiQuery({
    name: "pressureClass",
    description: "Pressure class (e.g., PN16, Class 150)",
  })
  getBlankFlangeWeight(@Query("nb") nb: string, @Query("pressureClass") pressureClass: string) {
    const nbNum = parseInt(nb, 10);
    return this.gasketWeightService.blankFlangeWeight(nbNum, pressureClass);
  }

  @Get("bolt-set")
  @ApiOperation({
    summary: "Get bolt set info and weight for specific NB and pressure class",
  })
  @ApiQuery({ name: "nb", description: "Nominal bore in mm" })
  @ApiQuery({
    name: "pressureClass",
    description: "Pressure class (e.g., PN16, Class 150)",
  })
  @ApiQuery({
    name: "flangeStandard",
    required: false,
    description: "Flange standard code (optional)",
  })
  getBoltSetInfo(
    @Query("nb") nb: string,
    @Query("pressureClass") pressureClass: string,
    @Query("flangeStandard") flangeStandard?: string,
  ) {
    const nbNum = parseInt(nb, 10);
    return this.gasketWeightService.boltSetInfo(nbNum, pressureClass, flangeStandard);
  }

  @Get("gasket-types")
  @ApiOperation({ summary: "Get available gasket types" })
  getAvailableGasketTypes() {
    return this.gasketWeightService.availableGasketTypes();
  }
}
