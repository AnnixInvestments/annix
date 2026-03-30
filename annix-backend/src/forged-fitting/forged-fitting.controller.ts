import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ForgedFittingService } from "./forged-fitting.service";

@ApiTags("Forged Fittings (ASME B16.11)")
@Controller("forged-fittings")
export class ForgedFittingController {
  constructor(private readonly service: ForgedFittingService) {}

  @Get("types")
  @ApiOperation({ summary: "List forged fitting types" })
  fittingTypes() {
    return this.service.fittingTypes();
  }

  @Get("series")
  @ApiOperation({ summary: "List forged fitting series (pressure class + connection type)" })
  seriesList() {
    return this.service.seriesList();
  }

  @Get("sizes")
  @ApiOperation({ summary: "Available NB sizes for a forged fitting type and series" })
  @ApiQuery({ name: "fittingType", required: true })
  @ApiQuery({ name: "pressureClass", required: true })
  @ApiQuery({ name: "connectionType", required: true })
  sizes(
    @Query("fittingType") fittingType: string,
    @Query("pressureClass") pressureClass: string,
    @Query("connectionType") connectionType: string,
  ) {
    return this.service.sizes(fittingType, Number(pressureClass), connectionType);
  }

  @Get("dimensions")
  @ApiOperation({ summary: "Dimension data for a specific forged fitting" })
  @ApiQuery({ name: "fittingType", required: true })
  @ApiQuery({ name: "nominalBoreMm", required: true })
  @ApiQuery({ name: "pressureClass", required: true })
  @ApiQuery({ name: "connectionType", required: true })
  dimensions(
    @Query("fittingType") fittingType: string,
    @Query("nominalBoreMm") nominalBoreMm: string,
    @Query("pressureClass") pressureClass: string,
    @Query("connectionType") connectionType: string,
  ) {
    return this.service.dimensions(
      fittingType,
      Number(nominalBoreMm),
      Number(pressureClass),
      connectionType,
    );
  }

  @Get("all-dimensions")
  @ApiOperation({ summary: "All dimensions for a forged fitting type in a series" })
  @ApiQuery({ name: "fittingType", required: true })
  @ApiQuery({ name: "pressureClass", required: true })
  @ApiQuery({ name: "connectionType", required: true })
  allDimensions(
    @Query("fittingType") fittingType: string,
    @Query("pressureClass") pressureClass: string,
    @Query("connectionType") connectionType: string,
  ) {
    return this.service.allDimensions(fittingType, Number(pressureClass), connectionType);
  }
}
