import { PartialType } from '@nestjs/swagger';
import { CreateBoltDto } from './create-bolt.dto';

export class UpdateBoltDto extends PartialType(CreateBoltDto) {}
