import { ForbiddenException } from '@nestjs/common';
import { OrderService } from './order.service';

// Producto excepcional (productId null) en pricedItems.
describe('OrderService.pricedItems — producto excepcional', () => {
  const producto = { id: 1, name: 'Aceite X', price: 100 };
  const service = new OrderService(
    {} as any,
    { find: async () => [producto] } as any,
    { findOne: async () => ({ id: 'u1', rol: null }) } as any,
    { getPercentage: async () => 0, applyRolePricing: (p: number) => p } as any,
    { snapshotFor: async () => new Map() } as any,
  );
  const libre = { productId: null, productName: '3 bidones sueltos', quantity: 3, presentation: 'Bidón' };
  const normal = { productId: 1, productName: 'x', quantity: 8 };
  const order = (items: any[] = []) => ({ userId: 'u1', items }) as any;
  const priced = (o: any, items: any[], isStaff: boolean) =>
    (service as any).pricedItems(o, items, isStaff);

  it('el staff agrega una línea libre: sin precio ni bultos, orden conservado', async () => {
    const res = await priced(order(), [libre, normal], true);
    expect(res[0]).toEqual({ productId: null, productName: '3 bidones sueltos', quantity: 3, presentation: 'Bidón' });
    expect(res[1]).toMatchObject({ productId: 1, productName: 'Aceite X', unitPrice: 100 });
  });

  it('un cliente no puede crear una línea libre', async () => {
    await expect(priced(order(), [libre, normal], false)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('un cliente puede conservar la que cargó el staff, pero no cambiarla', async () => {
    const o = order([libre, normal]);
    await expect(priced(o, [libre, { ...normal, quantity: 16 }], false)).resolves.toHaveLength(2);
    await expect(priced(o, [{ ...libre, quantity: 30 }], false)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
