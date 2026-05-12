import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Roles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { INSIGHTS_ROLE } from "../insights.constants";

@ApiTags("insights")
@Controller("insights")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(INSIGHTS_ROLE)
export class InsightsHealthController {
  @Get("health")
  @ApiOperation({ summary: "Annix Insights portal health probe (insights role required)" })
  health(): { status: "ok"; portal: "insights" } {
    return { status: "ok", portal: "insights" };
  }
}
