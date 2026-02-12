import { PartialType } from '@nestjs/swagger';
import { CreateSteelSpecificationDto } from './create-steel-specification.dto';

export class UpdateSteelSpecificationDto extends PartialType(CreateSteelSpecificationDto) {}
