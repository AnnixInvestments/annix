import { PartialType } from '@nestjs/swagger';
import { CreateFlangeStandardDto } from './create-flange-standard.dto';

export class UpdateFlangeStandardDto extends PartialType(CreateFlangeStandardDto) {}
