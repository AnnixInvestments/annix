import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PumpProduct } from "./entities/pump-product.entity";
import { PumpProductController } from "./pump-product.controller";
import { PumpProductService } from "./pump-product.service";

@Module({
  imports: [TypeOrmModule.forFeature([PumpProduct])],
  controllers: [PumpProductController],
  providers: [PumpProductService],
  exports: [PumpProductService],
})
export class PumpProductModule {}
