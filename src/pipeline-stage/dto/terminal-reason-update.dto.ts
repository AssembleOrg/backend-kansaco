import { PartialType } from '@nestjs/swagger';
import { TerminalReasonCreateDto } from './terminal-reason-create.dto';

export class TerminalReasonUpdateDto extends PartialType(
  TerminalReasonCreateDto,
) {}
