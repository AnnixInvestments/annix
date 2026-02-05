import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RubberLiningController } from './rubber-lining.controller';
import { RubberLiningService } from './rubber-lining.service';
import { RubberType } from './entities/rubber-type.entity';
import { RubberSpecification } from './entities/rubber-specification.entity';
import {
  RubberApplicationRating,
  RubberThicknessRecommendation,
  RubberAdhesionRequirement,
} from './entities/rubber-application.entity';
import { RubberProductCoding } from './entities/rubber-product-coding.entity';
import { RubberPricingTier } from './entities/rubber-pricing-tier.entity';
import { RubberCompany } from './entities/rubber-company.entity';
import { RubberProduct } from './entities/rubber-product.entity';
import { RubberOrder } from './entities/rubber-order.entity';
import { RubberOrderItem } from './entities/rubber-order-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
  providers: [RubberLiningService],
  exports: [RubberLiningService],
})
export class RubberLiningModule {}
