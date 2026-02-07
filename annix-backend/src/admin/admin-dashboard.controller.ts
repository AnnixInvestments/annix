import { Controller, Get, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminDashboardService } from "./admin-dashboard.service";
import {
  CustomerStatsDto,
  DashboardStatsDto,
  RecentActivityItemDto,
  SupplierStatsDto,
} from "./dto/admin-dashboard.dto";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@ApiTags("Admin Dashboard")
@Controller("admin/dashboard")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get("stats")
  @ApiOperation({ summary: "Get dashboard statistics" })
  @ApiResponse({
    status: 200,
    description: "Dashboard statistics retrieved successfully",
    type: DashboardStatsDto,
  })
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.dashboardService.getDashboardStats();
  }

  @Get("recent-activity")
  @ApiOperation({ summary: "Get recent activity feed" })
  @ApiResponse({
    status: 200,
    description: "Recent activity retrieved successfully",
    type: [RecentActivityItemDto],
  })
  async getRecentActivity(
    @Query("limit", ParseIntPipe) limit: number = 20,
  ): Promise<RecentActivityItemDto[]> {
    return this.dashboardService.getRecentActivity(limit);
  }

  @Get("customers/stats")
  @ApiOperation({ summary: "Get customer statistics" })
  @ApiResponse({
    status: 200,
    description: "Customer statistics retrieved successfully",
    type: CustomerStatsDto,
  })
  async getCustomerStats(): Promise<CustomerStatsDto> {
    return this.dashboardService.getCustomerStats();
  }

  @Get("suppliers/stats")
  @ApiOperation({ summary: "Get supplier statistics" })
  @ApiResponse({
    status: 200,
    description: "Supplier statistics retrieved successfully",
    type: SupplierStatsDto,
  })
  async getSupplierStats(): Promise<SupplierStatsDto> {
    return this.dashboardService.getSupplierStats();
  }
}
