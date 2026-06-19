import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { MongoCustomerProfileRepository } from "../customer/customer-profile.repository.mongo";
import { CustomerProfileSchema } from "../customer/schemas/customer-profile.schema";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { RfqRepository } from "../rfq/rfq.repository";
import { MongoRfqRepository } from "../rfq/rfq.repository.mongo";
import { RfqSchema } from "../rfq/schemas/rfq.schema";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: "Rfq", schema: RfqSchema },
      { name: "CustomerProfile", schema: CustomerProfileSchema },
      { name: "SupplierProfile", schema: SupplierProfileSchema },
    ]),
  ],
  controllers: [PublicController],
  providers: [
    PublicService,
    repositoryProvider(RfqRepository, MongoRfqRepository),
    repositoryProvider(CustomerProfileRepository, MongoCustomerProfileRepository),
    repositoryProvider(SupplierProfileRepository, MongoSupplierProfileRepository),
  ],
  exports: [PublicService],
})
export class PublicModule {}
