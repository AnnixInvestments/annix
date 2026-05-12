import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { InsightsHealthController } from "./controllers/insights-health.controller";

@Module({
  imports: [AuthModule],
  controllers: [InsightsHealthController],
  providers: [JwtAuthGuard, RolesGuard],
  exports: [],
})
export class InsightsModule {}
