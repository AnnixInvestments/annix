import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { PumpOrderController } from "./pump-order.controller";
import { PumpOrderRepository } from "./pump-order.repository";
import { MongoPumpOrderRepository } from "./pump-order.repository.mongo";
import { PumpOrderService } from "./pump-order.service";
import { PumpOrderItemRepository } from "./pump-order-item.repository";
import { MongoPumpOrderItemRepository } from "./pump-order-item.repository.mongo";
import { PumpOrderSchema } from "./schemas/pump-order.schema";
import { PumpOrderItemSchema } from "./schemas/pump-order-item.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "PumpOrder", schema: PumpOrderSchema },
      { name: "PumpOrderItem", schema: PumpOrderItemSchema },
    ]),
  ],
  controllers: [PumpOrderController],
  providers: [
    PumpOrderService,
    repositoryProvider(PumpOrderRepository, MongoPumpOrderRepository),
    repositoryProvider(PumpOrderItemRepository, MongoPumpOrderItemRepository),
  ],
  exports: [PumpOrderService],
})
export class PumpOrderModule {}
