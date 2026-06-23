import { Module } from "@nestjs/common";
import { MovementsController } from "../controllers/movements.controller";
import { StockControlCoreModule } from "../core/stock-control-core.module";
import { RequisitionModule } from "../requisition/requisition.module";
import { MovementService } from "../services/movement.service";

@Module({
  imports: [StockControlCoreModule, RequisitionModule],
  controllers: [MovementsController],
  providers: [MovementService],
  exports: [MovementService],
})
export class MovementsModule {}
