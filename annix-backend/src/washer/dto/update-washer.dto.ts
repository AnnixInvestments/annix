import { PartialType } from '@nestjs/swagger';
import { CreateWasherDto } from './create-washer.dto';

export class UpdateWasherDto extends PartialType(CreateWasherDto) {}
