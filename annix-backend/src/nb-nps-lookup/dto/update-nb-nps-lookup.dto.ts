import { PartialType } from '@nestjs/swagger';
import { CreateNbNpsLookupDto } from './create-nb-nps-lookup.dto';

export class UpdateNbNpsLookupDto extends PartialType(CreateNbNpsLookupDto) {}
