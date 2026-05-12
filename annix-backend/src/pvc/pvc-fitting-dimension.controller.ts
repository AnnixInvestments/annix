import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  type PvcFittingDimension,
  type PvcFittingDimensionType,
} from "./entities/pvc-fitting-dimension.entity";
import { PvcFittingDimensionService } from "./pvc-fitting-dimension.service";

const VALID_TYPES: PvcFittingDimensionType[] = [
  "elbow_11_25",
  "elbow_22_5",
  "elbow_45",
  "elbow_90",
  "tee_equal",
  "tee_reducing",
  "reducer",
  "end_cap",
  "coupling_slip",
  "coupling_rrj",
  "coupling_compression",
  "saddle",
  "flange_adapter",
];

@ApiTags("pvc-fitting-dimensions")
@Controller("pvc-fitting-dimensions")
export class PvcFittingDimensionController {
  constructor(private readonly service: PvcFittingDimensionService) {}

  @Get()
  @ApiOperation({
    summary: "List every PVC fitting dimension row",
    description:
      "Returns the full pvc_fitting_dimensions table (catalogue + estimated rows). Mirrors the HDPE endpoint; used by the admin overview page.",
  })
  async findAll(): Promise<PvcFittingDimension[]> {
    return this.service.findAll();
  }

  @Get("by-type")
  @ApiOperation({
    summary: "List PVC fitting dimensions for a single fitting type",
  })
  @ApiQuery({ name: "type", enum: VALID_TYPES })
  async findByType(
    @Query("type") fittingType: PvcFittingDimensionType,
  ): Promise<PvcFittingDimension[]> {
    if (!VALID_TYPES.includes(fittingType)) return [];
    return this.service.findByType(fittingType);
  }

  @Get("lookup")
  @ApiOperation({
    summary: "Look up a single PVC fitting dimension row",
    description:
      "Returns the catalogue row matching (fittingType, mainDnMm, branchDnMm). branchDnMm is required only for reducer / tee_reducing / saddle rows; symmetric fittings (elbow / equal-tee / end-cap / coupling / flange-adapter) match on mainDnMm alone with branch NULL.",
  })
  @ApiQuery({ name: "type", enum: VALID_TYPES })
  @ApiQuery({ name: "mainDn", type: "number" })
  @ApiQuery({ name: "branchDn", type: "number", required: false })
  async lookup(
    @Query("type") fittingType: PvcFittingDimensionType,
    @Query("mainDn", ParseIntPipe) mainDnMm: number,
    @Query("branchDn", new DefaultValuePipe(0), ParseIntPipe) branchDnMm: number,
  ): Promise<PvcFittingDimension | null> {
    if (!VALID_TYPES.includes(fittingType)) return null;
    return this.service.findByCriteria({
      fittingType,
      mainDnMm,
      branchDnMm: branchDnMm > 0 ? branchDnMm : null,
    });
  }
}
