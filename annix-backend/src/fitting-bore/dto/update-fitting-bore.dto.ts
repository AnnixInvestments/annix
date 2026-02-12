import { PartialType } from '@nestjs/swagger';
import { CreateFittingBoreDto } from './create-fitting-bore.dto';

export class UpdateFittingBoreDto extends PartialType(CreateFittingBoreDto) {}
