import { PartialType } from '@nestjs/swagger';
import { CreateNutMassDto } from './create-nut-mass.dto';

export class UpdateNutMassDto extends PartialType(CreateNutMassDto) {}
