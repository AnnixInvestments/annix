import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import { RubberLiningCoreModule } from "../rubber-lining/core/rubber-lining-core.module";
import { StockControlCoreModule } from "../stock-control/core/stock-control-core.module";

@Module({
  imports: [AuthModule, RbacModule, StockControlCoreModule, RubberLiningCoreModule],
  exports: [AuthModule, RbacModule, StockControlCoreModule, RubberLiningCoreModule],
})
export class CoreModule {}
