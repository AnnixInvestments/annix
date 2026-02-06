import { PartialType } from '@nestjs/swagger';
import { CreateInstrumentRfqDto } from './create-instrument-rfq.dto';

export class UpdateInstrumentRfqDto extends PartialType(CreateInstrumentRfqDto) {}
