import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminModule } from "../admin/admin.module";
import { App } from "../rbac/entities/app.entity";
import { UserAppAccess } from "../rbac/entities/user-app-access.entity";
import {
  RubberAdhesionRequirement,
  RubberApplicationRating,
  RubberThicknessRecommendation,
} from "./entities/rubber-application.entity";
import { RubberCompany } from "./entities/rubber-company.entity";
import { RubberOrder } from "./entities/rubber-order.entity";
import { RubberOrderItem } from "./entities/rubber-order-item.entity";
import { RubberPricingTier } from "./entities/rubber-pricing-tier.entity";
import { RubberProduct } from "./entities/rubber-product.entity";
import { RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RubberSpecification } from "./entities/rubber-specification.entity";
import { RubberType } from "./entities/rubber-type.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";
import { RubberLiningController } from "./rubber-lining.controller";
import { RubberLiningService } from "./rubber-lining.service";

@Module({
  imports: [
    AdminModule,
    TypeOrmModule.forFeature([
      App,
      UserAppAccess,
      RubberType,
      RubberSpecification,
      RubberApplicationRating,
      RubberThicknessRecommendation,
      RubberAdhesionRequirement,
      RubberProductCoding,
      RubberPricingTier,
      RubberCompany,
      RubberProduct,
      RubberOrder,
      RubberOrderItem,
    ]),
  ],
  controllers: [RubberLiningController],
  providers: [RubberLiningService, AuRubberAccessGuard],
  exports: [RubberLiningService],
})
export class RubberLiningModule {}
