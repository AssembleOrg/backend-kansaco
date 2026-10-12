import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification, NotificationTipo } from './notification.entity';
import { User } from '../user/user.entity';
import { UserRole } from '../user/user.enum';
import { RabbitmqClientService } from '../rabbitmq/rabbitmq-client.service';
import { now } from '../helpers/date.helper';

export interface NotificationData {
  tipo: NotificationTipo;
  titulo: string;
  /** Texto plano; los saltos de línea se respetan en el mail y en la web. */
  mensaje: string;
  orderId?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly rabbitmqClient: RabbitmqClientService,
  ) {}

  /**
   * Aviso en la web + mail a un usuario. Nunca tira: un aviso que falla no
   * puede romper la operación que lo originó (cambiar un estado, editar un pedido).
   */
  async notify(userId: string, data: NotificationData): Promise<void> {
    try {
      await this.repo.save(this.repo.create({ ...data, userId }));
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email', 'nombre'],
      });
      if (user) await this.sendEmail(user, data);
    } catch (error) {
      this.logger.error(`No se pudo notificar a ${userId}: ${error.message}`);
    }
  }

  /**
   * Mismo aviso en la web a todas las cuentas de una categoría (promociones
   * para talleres, mayoristas…). Sin mail y sin endpoint todavía: queda listo
   * para cuando se arme la pantalla de promociones.
   */
  async notifyRole(rol: UserRole, data: NotificationData): Promise<number> {
    const users = await this.userRepository.find({ where: { rol }, select: ['id'] });
    if (users.length) await this.repo.insert(users.map((u) => ({ ...data, userId: u.id })));
    return users.length;
  }

  async findMine(userId: string): Promise<{ items: Notification[]; noLeidas: number }> {
    const [items, noLeidas] = await Promise.all([
      // ponytail: últimas 30 sin paginar; paginar si alguien necesita el historial completo.
      this.repo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 30 }),
      this.repo.count({ where: { userId, leidaAt: IsNull() } }),
    ]);
    return { items, noLeidas };
  }

  /** Marca como leído un aviso propio, o todos si no se pasa id. */
  async markRead(userId: string, id?: number): Promise<void> {
    await this.repo.update(
      { userId, leidaAt: IsNull(), ...(id ? { id } : {}) },
      { leidaAt: now() },
    );
  }

  // Mismo canal que el mail del checkout: RabbitMQ → backend de intranet.
  private async sendEmail(user: Pick<User, 'email' | 'nombre'>, data: NotificationData) {
    // Sitio público: de ahí salen el logo y el link a "Mis pedidos".
    const siteUrl = (process.env.FRONTEND_URL || 'https://kansaco.com').replace(/\/$/, '');
    const pedidosUrl = `${siteUrl}/mis-pedidos`;
    const sent = await this.rabbitmqClient.sendMessage('send-email', {
      to: [{ email: user.email, name: user.nombre }],
      subject: `Kansaco - ${data.titulo}`,
      textContent: `${data.titulo}\n\n${data.mensaje}\n\nVer el detalle en Mis pedidos: ${pedidosUrl}`,
      htmlContent: `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #000000; padding: 16px; text-align: center; border-radius: 8px 8px 0 0;">
    <img src="${siteUrl}/Kansaco-logo-negro.png" alt="Kansaco" width="150" style="display: inline-block; border: 0;" />
  </div>
  <div style="background-color: #16a245; padding: 14px 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${escapeHtml(data.titulo)}</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Hola <strong>${escapeHtml(user.nombre)}</strong>,</p>
    <p style="white-space: pre-line;">${escapeHtml(data.mensaje)}</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${pedidosUrl}" style="display: inline-block; background-color: #16a245; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 6px;">Ver mi pedido</a>
    </p>
    <p style="font-size: 12px; color: #666; text-align: center;">Este es un email automático, por favor no respondas a esta dirección.</p>
  </div>
</body>
</html>`,
    });
    if (!sent) this.logger.warn(`Mail de aviso no enviado a ${user.email}`);
  }
}
