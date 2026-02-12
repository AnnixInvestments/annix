import { PartialType } from '@nestjs/swagger';
import { CreateFittingDto } from './create-fitting.dto';

export class UpdateFittingDto extends PartialType(CreateFittingDto) {}
