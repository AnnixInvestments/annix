import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../../stock-control/guards/stock-control-auth.guard";
import { StockManagementFeature } from "../guards/stock-management-feature.decorator";
import { StockManagementFeatureGuard } from "../guards/stock-management-feature.guard";
import {
  type LocationCandidate,
  LocationClassificationService,
} from "../services/location-classification.service";

interface ClassifyBody {
  locations: LocationCandidate[];
}

interface ApplyBody {
  decisions: Array<{ productId: number; locationId: number | null }>;
}

@ApiTags("stock-management/location-migration")
@Controller("stock-management/location-migration")
@UseGuards(StockControlAuthGuard, StockManagementFeatureGuard)
export class LocationMigrationController {
  constructor(private readonly classificationService: LocationClassificationService) {}

  @Post("classify")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({
    summary:
      "Run AI + rule-based classification of unassigned products against the provided location list",
  })
  async classify(@Req() req: any, @Body() body: ClassifyBody) {
    return this.classificationService.classifyUnassignedProducts(
      Number(req.user.companyId),
      body.locations,
    );
  }

  @Post("apply")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({
    summary: "Apply admin-approved location classifications to unassigned products",
  })
  async apply(@Req() req: any, @Body() body: ApplyBody) {
    return this.classificationService.applyClassifications(
      Number(req.user.companyId),
      body.decisions,
    );
  }
}
