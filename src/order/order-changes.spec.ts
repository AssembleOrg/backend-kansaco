import { describeItemChanges, statusNotification } from './order-changes';
import { OrderStatus } from './order.enum';

describe('describeItemChanges', () => {
  const aceite = { productId: 1, productName: 'Aceite X', presentation: 'Balde 20 L', quantity: 2 };
  const grasa = { productId: 2, productName: 'Grasa Y', quantity: 1 };
  const libre = { productId: null, productName: '3 bidones sueltos', quantity: 3 };

  it('sin cambios → vacío (aunque cambie el orden)', () => {
    expect(describeItemChanges([aceite, grasa], [grasa, aceite])).toEqual([]);
  });

  it('agregado, quitado y cambio de cantidad', () => {
    expect(describeItemChanges([aceite, grasa], [{ ...aceite, quantity: 5 }, libre])).toEqual([
      'Aceite X (Balde 20 L): cantidad 2 → 5',
      'Se agregó: 3 bidones sueltos x 3',
      'Se quitó: Grasa Y',
    ]);
  });

  it('el mismo producto en otra presentación es otro ítem', () => {
    expect(describeItemChanges([aceite], [{ ...aceite, presentation: 'Tambor 200 L' }])).toHaveLength(2);
  });
});

describe('statusNotification', () => {
  const id = '50106563-b3c7-440d-a98b-171c70f7c8d2';
  const order = { id };
  it('avisa en cada etapa menos al volver a PENDIENTE', () => {
    expect(statusNotification(order, OrderStatus.PENDIENTE)).toBeNull();
    for (const s of [OrderStatus.RECIBIDO, OrderStatus.PROCESANDO, OrderStatus.ENVIADO, OrderStatus.CANCELADO]) {
      expect(statusNotification(order, s)).toMatchObject({ tipo: 'PEDIDO_ESTADO', orderId: id });
    }
    expect(statusNotification(order, OrderStatus.ENVIADO)!.titulo).toBe('Pedido #50106563 enviado');
  });
  it('con retiro en planta, "Enviado" avisa que está listo para retirar', () => {
    const retiro = { id, shippingInfo: { modalidad: 'RETIRO' as const } };
    expect(statusNotification(retiro, OrderStatus.ENVIADO)!.titulo).toBe('Pedido #50106563 listo para retirar');
    expect(statusNotification(retiro, OrderStatus.PROCESANDO)!.titulo).toBe('Pedido #50106563 en proceso');
  });

});
