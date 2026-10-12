import { Controller, Get, Param, ParseIntPipe, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../guards/auth.guard';

@ApiTags('Notification')
@Controller('notification')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Últimos avisos del usuario actual + cantidad sin leer' })
  findMine(@Request() req: { user: { id: string } }) {
    return this.notificationService.findMine(req.user.id);
  }

  @Patch('read')
  @ApiOperation({ summary: 'Marcar todos mis avisos como leídos' })
  async markAllRead(@Request() req: { user: { id: string } }) {
    await this.notificationService.markRead(req.user.id);
    return { ok: true };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar un aviso propio como leído' })
  async markRead(
    @Request() req: { user: { id: string } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.notificationService.markRead(req.user.id, id);
    return { ok: true };
  }
}
