import { PartialType } from '@nestjs/swagger';
import { CreateAngleRangeDto } from './create-angle-range.dto';

export class UpdateAngleRangeDto extends PartialType(CreateAngleRangeDto) {}
