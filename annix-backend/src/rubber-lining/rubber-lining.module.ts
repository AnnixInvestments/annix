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
import { RubberCompoundMovement } from "./entities/rubber-compound-movement.entity";
import { RubberCompoundOrder } from "./entities/rubber-compound-order.entity";
import { RubberCompoundStock } from "./entities/rubber-compound-stock.entity";
import { RubberOrder } from "./entities/rubber-order.entity";
import { RubberOrderItem } from "./entities/rubber-order-item.entity";
import { RubberPricingTier } from "./entities/rubber-pricing-tier.entity";
import { RubberProduct } from "./entities/rubber-product.entity";
import { RubberProductCoding } from "./entities/rubber-product-coding.entity";
import { RubberProduction } from "./entities/rubber-production.entity";
import { RubberSpecification } from "./entities/rubber-specification.entity";
import { RubberType } from "./entities/rubber-type.entity";
import { AuRubberAccessGuard } from "./guards/au-rubber-access.guard";
import { RubberLiningController } from "./rubber-lining.controller";
import { RubberLiningService } from "./rubber-lining.service";
import { RubberStockService } from "./rubber-stock.service";

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
      RubberCompoundStock,
      RubberCompoundMovement,
      RubberProduction,
      RubberCompoundOrder,
    ]),
  ],
  controllers: [RubberLiningController],
  providers: [RubberLiningService, RubberStockService, AuRubberAccessGuard],
  exports: [RubberLiningService, RubberStockService],
})
export class RubberLiningModule {}
