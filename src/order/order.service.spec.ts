import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../user/user.enum';
import { OrderStatus } from './order.enum';
import { OrderService } from './order.service';

// Producto excepcional (productId null) en pricedItems.
describe('OrderService.pricedItems — producto excepcional', () => {
  const producto = { id: 1, name: 'Aceite X', price: 100 };
  const service = new OrderService(
    {} as any,
    { find: async () => [producto] } as any,
    { findOne: async () => ({ id: 'u1', rol: null }) } as any,
    { getPercentage: async () => 0, applyRolePricing: (p: number) => p } as any,
    { snapshotFor: async () => new Map(), snapshotSkus: async () => new Map() } as any,
    {} as any,
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

// Nota del cliente (notes) vs nota interna del staff (internalNotes).
describe('OrderService — notas', () => {
  const make = () => {
    const order: any = { id: 'o1', userId: 'cliente', status: OrderStatus.ENVIADO, notes: 'Va en promo', items: [] };
    const qb: any = { addSelect: () => qb, where: () => qb, getOne: async () => order };
    const repo = { findOne: async () => order, createQueryBuilder: () => qb, save: async (o: any) => o };
    const notify = jest.fn();
    const service = new OrderService(repo as any, {} as any, {} as any, {} as any, {} as any, { notify } as any);
    return { service, order, notify };
  };

  it('un cliente no puede escribir la nota interna', async () => {
    const { service } = make();
    await expect(
      service.update('o1', { internalNotes: 'x' }, 'cliente', UserRole.CLIENTE_MAYORISTA),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('el staff guarda la nota interna en cualquier estado y no pisa la del cliente', async () => {
    const { service } = make();
    const saved = await service.update('o1', { internalNotes: 'llamar el lunes', notes: 'pisada' }, 'staff', UserRole.ASISTENTE);
    expect(saved).toMatchObject({ internalNotes: 'llamar el lunes', notes: 'Va en promo' });
  });

  it('el motivo de cancelación va a la nota interna y no al aviso del cliente', async () => {
    const { service, order, notify } = make();
    await service.updateStatus('o1', OrderStatus.CANCELADO, 'staff', 'Sin stock');
    expect(order.internalNotes).toMatch(/^\[CANCELADO .+\] Sin stock$/);
    expect(order.notes).toBe('Va en promo');
    expect(JSON.stringify(notify.mock.calls)).not.toContain('Sin stock');
  });
});
