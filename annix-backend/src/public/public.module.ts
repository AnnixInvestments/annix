import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { Rfq } from "../rfq/entities/rfq.entity";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";

@Module({
  imports: [TypeOrmModule.forFeature([Rfq, CustomerProfile, SupplierProfile])],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}
