import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { PumpOrder } from "./entities/pump-order.entity";
import { PumpOrderItem } from "./entities/pump-order-item.entity";
import { PumpOrderController } from "./pump-order.controller";
import { PumpOrderRepository } from "./pump-order.repository";
import { MongoPumpOrderRepository } from "./pump-order.repository.mongo";
import { PostgresPumpOrderRepository } from "./pump-order.repository.postgres";
import { PumpOrderService } from "./pump-order.service";
import { PumpOrderItemRepository } from "./pump-order-item.repository";
import { MongoPumpOrderItemRepository } from "./pump-order-item.repository.mongo";
import { PostgresPumpOrderItemRepository } from "./pump-order-item.repository.postgres";
import { PumpOrderSchema } from "./schemas/pump-order.schema";
import { PumpOrderItemSchema } from "./schemas/pump-order-item.schema";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "PumpOrder", schema: PumpOrderSchema },
            { name: "PumpOrderItem", schema: PumpOrderItemSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([PumpOrder, PumpOrderItem])]),
  ],
  controllers: [PumpOrderController],
  providers: [
    PumpOrderService,
    repositoryProvider(PumpOrderRepository, PostgresPumpOrderRepository, MongoPumpOrderRepository),
    repositoryProvider(
      PumpOrderItemRepository,
      PostgresPumpOrderItemRepository,
      MongoPumpOrderItemRepository,
    ),
  ],
  exports: [PumpOrderService],
})
export class PumpOrderModule {}
