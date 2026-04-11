import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
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

interface AssignUnassignedBody {
  productIds: number[];
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

  @Get("unassigned-location")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({
    summary:
      "Find or create the company's fallback Unassigned location for low-confidence classifications",
  })
  async unassignedLocation(@Req() req: any) {
    return this.classificationService.ensureUnassignedLocation(Number(req.user.companyId));
  }

  @Post("assign-unassigned")
  @StockManagementFeature("BASIC_ISSUING")
  @ApiOperation({
    summary:
      "Bulk-assign the given products to the company's fallback Unassigned location (creates it if needed)",
  })
  async assignUnassigned(@Req() req: any, @Body() body: AssignUnassignedBody) {
    return this.classificationService.assignToUnassigned(
      Number(req.user.companyId),
      body.productIds,
    );
  }
}
