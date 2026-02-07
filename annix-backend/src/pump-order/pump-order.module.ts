import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PumpOrder } from "./entities/pump-order.entity";
import { PumpOrderItem } from "./entities/pump-order-item.entity";
import { PumpOrderController } from "./pump-order.controller";
import { PumpOrderService } from "./pump-order.service";

@Module({
  imports: [TypeOrmModule.forFeature([PumpOrder, PumpOrderItem])],
  controllers: [PumpOrderController],
  providers: [PumpOrderService],
  exports: [PumpOrderService],
})
export class PumpOrderModule {}
