import { Order, OrderItemData } from './order.entity';
import { OrderStatus } from './order.enum';
import { shortId } from './order-export';
import { NotificationData } from '../notification/notification.service';

type Item = Pick<OrderItemData, 'productId' | 'productName' | 'presentation' | 'quantity'>;

/** Qué cambió entre dos listas de ítems, en frases para el cliente. Vacío = nada. */
export function describeItemChanges(before: Item[], after: Item[]): string[] {
  // Las líneas libres (productId null) se distinguen por su descripción.
  const key = (i: Item) => `${i.productId ?? i.productName}|${i.presentation ?? ''}`;
  const name = (i: Item) => (i.presentation ? `${i.productName} (${i.presentation})` : i.productName);
  const prev = new Map(before.map((i) => [key(i), i]));
  const next = new Map(after.map((i) => [key(i), i]));
  const changes: string[] = [];
  for (const [k, item] of next) {
    const old = prev.get(k);
    if (!old) changes.push(`Se agregó: ${name(item)} x ${item.quantity}`);
    else if (old.quantity !== item.quantity) {
      changes.push(`${name(item)}: cantidad ${old.quantity} → ${item.quantity}`);
    }
  }
  for (const [k, item] of prev) {
    if (!next.has(k)) changes.push(`Se quitó: ${name(item)}`);
  }
  return changes;
}

const STATUS_MESSAGE: Partial<Record<OrderStatus, [titulo: string, mensaje: string]>> = {
  RECIBIDO: ['recibido', 'Recibimos tu pedido y ya lo estamos revisando.'],
  PROCESANDO: ['en proceso', 'Tu pedido está en proceso de preparación.'],
  ENVIADO: ['enviado', 'Tu pedido fue enviado.'],
  CANCELADO: ['cancelado', 'Tu pedido fue cancelado. Ante cualquier duda, comunicate con ventas.'],
};

/**
 * Aviso al cliente por un cambio de estado. null = no se avisa (volver a
 * PENDIENTE es un paso interno del staff para poder editar el pedido).
 */
export function statusNotification(
  order: Pick<Order, 'id' | 'shippingInfo'>,
  status: OrderStatus,
): NotificationData | null {
  // Retiro en planta: "Enviado" significa que ya lo pueden pasar a buscar.
  const texto =
    status === OrderStatus.ENVIADO && order.shippingInfo?.modalidad === 'RETIRO'
      ? ['listo para retirar', 'Tu pedido está listo para retirar en planta.']
      : STATUS_MESSAGE[status];
  if (!texto) return null;
  return {
    tipo: 'PEDIDO_ESTADO',
    titulo: `Pedido #${shortId(order.id)} ${texto[0]}`,
    mensaje: texto[1],
    orderId: order.id,
  };
}

export function itemsNotification(orderId: string, changes: string[]): NotificationData {
  return {
    tipo: 'PEDIDO_EDITADO',
    titulo: `Pedido #${shortId(orderId)} modificado`,
    mensaje: `El equipo de Kansaco actualizó los productos de tu pedido:\n${changes.map((c) => `• ${c}`).join('\n')}`,
    orderId,
  };
}
