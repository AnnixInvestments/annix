import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerProfileRepository } from "../customer/customer-profile.repository";
import { MongoCustomerProfileRepository } from "../customer/customer-profile.repository.mongo";
import { PostgresCustomerProfileRepository } from "../customer/customer-profile.repository.postgres";
import { CustomerProfile } from "../customer/entities/customer-profile.entity";
import { CustomerProfileSchema } from "../customer/schemas/customer-profile.schema";
import { isMongoDriver } from "../lib/persistence/database-driver";
import { repositoryProvider } from "../lib/persistence/repository-provider";
import { Rfq } from "../rfq/entities/rfq.entity";
import { RfqRepository } from "../rfq/rfq.repository";
import { MongoRfqRepository } from "../rfq/rfq.repository.mongo";
import { PostgresRfqRepository } from "../rfq/rfq.repository.postgres";
import { RfqSchema } from "../rfq/schemas/rfq.schema";
import { SupplierProfile } from "../supplier/entities/supplier-profile.entity";
import { SupplierProfileSchema } from "../supplier/schemas/supplier-profile.schema";
import { SupplierProfileRepository } from "../supplier/supplier-profile.repository";
import { MongoSupplierProfileRepository } from "../supplier/supplier-profile.repository.mongo";
import { PostgresSupplierProfileRepository } from "../supplier/supplier-profile.repository.postgres";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";

@Module({
  imports: [
    ...(isMongoDriver()
      ? [
          MongooseModule.forFeature([
            { name: "Rfq", schema: RfqSchema },
            { name: "CustomerProfile", schema: CustomerProfileSchema },
            { name: "SupplierProfile", schema: SupplierProfileSchema },
          ]),
        ]
      : []),
    ...(isMongoDriver() ? [] : [TypeOrmModule.forFeature([Rfq, CustomerProfile, SupplierProfile])]),
  ],
  controllers: [PublicController],
  providers: [
    PublicService,
    repositoryProvider(RfqRepository, PostgresRfqRepository, MongoRfqRepository),
    repositoryProvider(
      CustomerProfileRepository,
      PostgresCustomerProfileRepository,
      MongoCustomerProfileRepository,
    ),
    repositoryProvider(
      SupplierProfileRepository,
      PostgresSupplierProfileRepository,
      MongoSupplierProfileRepository,
    ),
  ],
  exports: [PublicService],
})
export class PublicModule {}
