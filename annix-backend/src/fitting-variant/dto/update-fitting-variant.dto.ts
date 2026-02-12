import { PartialType } from '@nestjs/swagger';
import { CreateFittingVariantDto } from './create-fitting-variant.dto';

export class UpdateFittingVariantDto extends PartialType(CreateFittingVariantDto) {}
