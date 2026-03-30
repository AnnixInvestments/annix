import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { MalleableFittingService } from "./malleable-fitting.service";

@ApiTags("Malleable Iron Fittings")
@Controller("malleable-fittings")
export class MalleableFittingController {
  constructor(private readonly service: MalleableFittingService) {}

  @Get("types")
  @ApiOperation({ summary: "List distinct malleable iron fitting types" })
  fittingTypes() {
    return this.service.fittingTypes();
  }

  @Get("dimensions")
  @ApiOperation({ summary: "Dimensions filtered by fitting type and optional pressure class" })
  @ApiQuery({ name: "fittingType", required: true })
  @ApiQuery({ name: "pressureClass", required: false })
  dimensions(
    @Query("fittingType") fittingType: string,
    @Query("pressureClass") pressureClass?: string,
  ) {
    const pc = pressureClass ? Number(pressureClass) : undefined;
    return this.service.dimensions(fittingType, pc);
  }

  @Get("sizes")
  @ApiOperation({ summary: "Available NB sizes for a fitting type and pressure class" })
  @ApiQuery({ name: "fittingType", required: true })
  @ApiQuery({ name: "pressureClass", required: true })
  sizes(@Query("fittingType") fittingType: string, @Query("pressureClass") pressureClass: string) {
    return this.service.sizes(fittingType, Number(pressureClass));
  }
}
