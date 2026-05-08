import { PartialType } from '@nestjs/swagger';
import { LeadCreateDto } from './lead-create.dto';

export class LeadUpdateDto extends PartialType(LeadCreateDto) {}
