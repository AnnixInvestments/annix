import { PartialType } from '@nestjs/swagger';
import { CreateBoltMassDto } from './create-bolt-mass.dto';

export class UpdateBoltMassDto extends PartialType(CreateBoltMassDto) {}
