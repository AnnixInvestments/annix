import { PartialType } from '@nestjs/swagger';
import { CreateWeldTypeDto } from './create-weld-type.dto';

export class UpdateWeldTypeDto extends PartialType(CreateWeldTypeDto) {}
