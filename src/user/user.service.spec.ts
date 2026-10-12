import { ForbiddenException } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRole } from './user.enum';

// Quién puede asignar qué categoría (PATCH /user/:id/rol).
describe('UserService.changeRole', () => {
  const roles: Record<string, UserRole> = {
    admin: UserRole.ADMIN,
    asistente: UserRole.ASISTENTE,
    otraAsistente: UserRole.ASISTENTE,
    cliente: UserRole.CLIENTE_MINORISTA,
  };
  const repo = {
    findOne: async ({ where: { id } }: any) => ({ id, rol: roles[id] }),
    update: jest.fn(),
  };
  const service = new UserService(repo as any, {} as any, {} as any, {} as any);

  it('la asistente asigna categorías de cliente a cuentas de clientes', async () => {
    await service.changeRole('cliente', UserRole.TALLER, 'asistente');
    expect(repo.update).toHaveBeenCalledWith('cliente', { rol: UserRole.TALLER });
  });

  it('la asistente no crea staff ni toca cuentas de staff', async () => {
    for (const [id, rol] of [
      ['cliente', UserRole.ADMIN],
      ['cliente', UserRole.ASISTENTE],
      ['otraAsistente', UserRole.TALLER],
      ['admin', UserRole.TALLER],
    ] as const) {
      await expect(service.changeRole(id, rol, 'asistente')).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('el admin sí puede', async () => {
    await expect(service.changeRole('cliente', UserRole.ASISTENTE, 'admin')).resolves.toBeDefined();
  });
});
