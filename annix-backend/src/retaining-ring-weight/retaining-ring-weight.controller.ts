import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { RetainingRingWeightService } from "./retaining-ring-weight.service";

@ApiTags("retaining-ring-weight")
@Controller("retaining-ring-weight")
export class RetainingRingWeightController {
  constructor(private readonly retainingRingWeightService: RetainingRingWeightService) {}

  @Get()
  @ApiOperation({ summary: "Get all retaining ring weights" })
  findAll() {
    return this.retainingRingWeightService.findAll();
  }

  @Get(":nominalBoreMm")
  @ApiOperation({ summary: "Get retaining ring weight for specific NB" })
  @ApiParam({ name: "nominalBoreMm", description: "Nominal bore in mm" })
  retainingRingWeight(@Param("nominalBoreMm") nominalBoreMm: string) {
    const nbNum = parseInt(nominalBoreMm, 10);
    return this.retainingRingWeightService.retainingRingWeight(nbNum);
  }
}
