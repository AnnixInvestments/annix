import { PartialType } from '@nestjs/swagger';
import { CreateNominalOutsideDiameterMmDto } from './create-nominal-outside-diameter-mm.dto';

export class UpdateNominalOutsideDiameterMmDto extends PartialType(CreateNominalOutsideDiameterMmDto) {}
