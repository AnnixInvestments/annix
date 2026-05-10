import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  type HdpeFittingDimension,
  type HdpeFittingDimensionType,
} from "./entities/hdpe-fitting-dimension.entity";
import { HdpeFittingDimensionService } from "./hdpe-fitting-dimension.service";

const VALID_TYPES: HdpeFittingDimensionType[] = [
  "elbow_90",
  "elbow_45",
  "tee_equal",
  "tee_reducing",
  "reducer",
  "lateral_45",
  "end_cap",
];

@ApiTags("hdpe-fitting-dimensions")
@Controller("hdpe-fitting-dimensions")
export class HdpeFittingDimensionController {
  constructor(private readonly service: HdpeFittingDimensionService) {}

  @Get()
  @ApiOperation({
    summary: "List every HDPE fitting dimension row",
    description:
      "Returns the full hdpe_fitting_dimensions table (catalogue + estimated rows). Used by the admin overview page.",
  })
  async findAll(): Promise<HdpeFittingDimension[]> {
    return this.service.findAll();
  }

  @Get("by-type")
  @ApiOperation({
    summary: "List HDPE fitting dimensions for a single fitting type",
  })
  @ApiQuery({ name: "type", enum: VALID_TYPES })
  async findByType(
    @Query("type") fittingType: HdpeFittingDimensionType,
  ): Promise<HdpeFittingDimension[]> {
    if (!VALID_TYPES.includes(fittingType)) return [];
    return this.service.findByType(fittingType);
  }

  @Get("lookup")
  @ApiOperation({
    summary: "Look up a single HDPE fitting dimension row",
    description:
      "Returns the catalogue row matching (fittingType, mainDnMm, branchDnMm). branchDnMm is required only for reducer / tee_reducing rows; symmetric fittings (elbow / equal-tee / lateral / end-cap) match on mainDnMm alone with branch NULL.",
  })
  @ApiQuery({ name: "type", enum: VALID_TYPES })
  @ApiQuery({ name: "mainDn", type: "number" })
  @ApiQuery({ name: "branchDn", type: "number", required: false })
  async lookup(
    @Query("type") fittingType: HdpeFittingDimensionType,
    @Query("mainDn", ParseIntPipe) mainDnMm: number,
    @Query("branchDn", new DefaultValuePipe(0), ParseIntPipe) branchDnMm: number,
  ): Promise<HdpeFittingDimension | null> {
    if (!VALID_TYPES.includes(fittingType)) return null;
    return this.service.findByCriteria({
      fittingType,
      mainDnMm,
      branchDnMm: branchDnMm > 0 ? branchDnMm : null,
    });
  }
}
