import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AnsiFittingService } from "./ansi-fitting.service";

@ApiTags("ANSI B16.9 Fittings")
@Controller("ansi-fittings")
export class AnsiFittingController {
  constructor(private readonly service: AnsiFittingService) {}

  @Get("types")
  @ApiOperation({ summary: "List ASME B16.9 fitting types" })
  fittingTypes() {
    return this.service.fittingTypes();
  }

  @Get("sizes")
  @ApiOperation({ summary: "Available NB sizes for a B16.9 fitting type and optional schedule" })
  @ApiQuery({ name: "fittingType", required: true })
  @ApiQuery({ name: "schedule", required: false })
  sizes(@Query("fittingType") fittingType: string, @Query("schedule") schedule?: string) {
    return this.service.sizes(fittingType, schedule);
  }

  @Get("schedules")
  @ApiOperation({ summary: "Available schedules for a B16.9 fitting type" })
  @ApiQuery({ name: "fittingType", required: true })
  schedules(@Query("fittingType") fittingType: string) {
    return this.service.schedules(fittingType);
  }

  @Get("dimensions")
  @ApiOperation({ summary: "Dimension data for a specific B16.9 fitting" })
  @ApiQuery({ name: "fittingType", required: true })
  @ApiQuery({ name: "nbMm", required: true })
  @ApiQuery({ name: "schedule", required: true })
  @ApiQuery({ name: "branchNbMm", required: false })
  dimensions(
    @Query("fittingType") fittingType: string,
    @Query("nbMm") nbMm: string,
    @Query("schedule") schedule: string,
    @Query("branchNbMm") branchNbMm?: string,
  ) {
    const branch = branchNbMm ? Number(branchNbMm) : undefined;
    return this.service.dimensions(fittingType, Number(nbMm), schedule, branch);
  }

  @Get("all-dimensions")
  @ApiOperation({ summary: "All dimensions for a B16.9 fitting type and schedule" })
  @ApiQuery({ name: "fittingType", required: true })
  @ApiQuery({ name: "schedule", required: true })
  allDimensions(@Query("fittingType") fittingType: string, @Query("schedule") schedule: string) {
    return this.service.allDimensions(fittingType, schedule);
  }
}
