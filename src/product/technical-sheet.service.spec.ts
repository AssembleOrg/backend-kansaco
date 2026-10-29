import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  TechnicalSheetService,
  TECHNICAL_SHEET_MAX_BYTES,
  buildSheetKey,
  cleanSheetName,
  isPdfBuffer,
} from './technical-sheet.service';

const PDF = Buffer.from('%PDF-1.4\n%%EOF');

function file(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    originalname: 'Ficha KS-100.pdf',
    buffer: PDF,
    size: PDF.length,
    mimetype: 'application/pdf',
    ...overrides,
  } as Express.Multer.File;
}

function setup(product: Record<string, unknown> | null) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(product),
  };
  const repo: any = {
    createQueryBuilder: jest.fn(() => qb),
    update: jest.fn().mockResolvedValue({}),
  };
  const bucket: any = {
    uploadFile: jest.fn().mockResolvedValue({}),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    getFile: jest.fn().mockResolvedValue(PDF),
  };
  return { service: new TechnicalSheetService(repo, bucket), repo, bucket };
}

describe('helpers de ficha técnica', () => {
  it('reconoce un PDF por su cabecera, no por el nombre', () => {
    expect(isPdfBuffer(PDF)).toBe(true);
    expect(isPdfBuffer(Buffer.from('<html>'))).toBe(false);
    expect(isPdfBuffer(Buffer.from('%PD'))).toBe(false);
    expect(isPdfBuffer(undefined)).toBe(false);
  });

  it('limpia el nombre visible y le fuerza .pdf', () => {
    expect(cleanSheetName('Ficha.PDF')).toBe('Ficha.pdf');
    expect(cleanSheetName('../../etc/passwd')).toBe('passwd.pdf');
    expect(cleanSheetName('C:\\docs\\hoja "a".pdf')).toBe('hoja a.pdf');
    expect(cleanSheetName('')).toBe('ficha-tecnica.pdf');
    expect(cleanSheetName(undefined)).toBe('ficha-tecnica.pdf');
    expect(cleanSheetName('x'.repeat(300) + '.pdf')).toHaveLength(200);
  });

  it('recupera acentos que multer entrega en latin1', () => {
    const latin1 = Buffer.from('Ficha técnica ñandú.pdf', 'utf8').toString('latin1');
    expect(cleanSheetName(latin1)).toBe('Ficha técnica ñandú.pdf');
    // Si ya viene bien decodificado, no lo rompe.
    expect(cleanSheetName('Ficha técnica.pdf')).toBe('Ficha técnica.pdf');
  });

  it('arma keys ASCII dentro de fichas-tecnicas/', () => {
    const key = buildSheetKey(12, 'Ficha Técnica ñ #1.pdf');
    expect(key).toMatch(/^fichas-tecnicas\/12-\d+-ficha_tecnica_n_1\.pdf$/);
    expect(buildSheetKey(3, '###.pdf')).toMatch(/^fichas-tecnicas\/3-\d+-ficha\.pdf$/);
  });
});

describe('TechnicalSheetService', () => {
  it('sube privado, guarda la referencia y borra la ficha anterior', async () => {
    const { service, repo, bucket } = setup({
      id: 5,
      isVisible: true,
      technicalSheetKey: 'fichas-tecnicas/5-1-vieja.pdf',
    });

    const info = await service.upload(5, file());

    expect(info).toEqual({ name: 'Ficha KS-100.pdf', size: PDF.length });
    const [key, body, type, opts] = bucket.uploadFile.mock.calls[0];
    expect(key).toMatch(/^fichas-tecnicas\/5-\d+-ficha_ks-100\.pdf$/);
    expect(body).toBe(PDF);
    expect(type).toBe('application/pdf');
    expect(opts).toEqual({ private: true });
    expect(repo.update).toHaveBeenCalledWith(5, {
      technicalSheetKey: key,
      technicalSheetName: 'Ficha KS-100.pdf',
      technicalSheetSize: PDF.length,
    });
    expect(bucket.deleteFile).toHaveBeenCalledWith('fichas-tecnicas/5-1-vieja.pdf');
  });

  it('rechaza lo que no es PDF aunque diga application/pdf', async () => {
    const { service, bucket } = setup({ id: 5, isVisible: true });
    await expect(
      service.upload(5, file({ buffer: Buffer.from('MZ\x90\x00'), size: 4 })),
    ).rejects.toThrow(BadRequestException);
    expect(bucket.uploadFile).not.toHaveBeenCalled();
  });

  it('rechaza sin archivo y por tamaño', async () => {
    const { service } = setup({ id: 5, isVisible: true });
    await expect(service.upload(5, undefined)).rejects.toThrow(BadRequestException);
    await expect(
      service.upload(5, file({ size: TECHNICAL_SHEET_MAX_BYTES + 1 })),
    ).rejects.toThrow('20 MB');
  });

  it('producto inexistente: 404 y no sube nada', async () => {
    const { service, bucket } = setup(null);
    await expect(service.upload(99, file())).rejects.toThrow(NotFoundException);
    expect(bucket.uploadFile).not.toHaveBeenCalled();
  });

  it('si falla la base, borra el archivo recién subido', async () => {
    const { service, repo, bucket } = setup({ id: 5, isVisible: true });
    repo.update.mockRejectedValueOnce(new Error('db caída'));
    await expect(service.upload(5, file())).rejects.toThrow('db caída');
    const [key] = bucket.uploadFile.mock.calls[0];
    expect(bucket.deleteFile).toHaveBeenCalledWith(key);
  });

  it('quita la ficha: limpia columnas y el archivo', async () => {
    const { service, repo, bucket } = setup({
      id: 5,
      technicalSheetKey: 'fichas-tecnicas/5-1-a.pdf',
    });
    await service.remove(5);
    expect(repo.update).toHaveBeenCalledWith(5, {
      technicalSheetKey: null,
      technicalSheetName: null,
      technicalSheetSize: null,
    });
    expect(bucket.deleteFile).toHaveBeenCalledWith('fichas-tecnicas/5-1-a.pdf');
  });

  it('quitar sin ficha da 404', async () => {
    const { service } = setup({ id: 5, technicalSheetKey: null });
    await expect(service.remove(5)).rejects.toThrow(NotFoundException);
  });

  it('entrega el PDF de un producto visible', async () => {
    const { service, bucket } = setup({
      id: 5,
      isVisible: true,
      technicalSheetKey: 'k.pdf',
      technicalSheetName: 'Ficha.pdf',
    });
    await expect(service.get(5, false)).resolves.toEqual({ name: 'Ficha.pdf', buffer: PDF });
    expect(bucket.getFile).toHaveBeenCalledWith('k.pdf');
  });

  it('producto oculto: el cliente no la ve, el staff sí', async () => {
    const product = { id: 5, isVisible: false, technicalSheetKey: 'k.pdf', technicalSheetName: 'F.pdf' };
    await expect(setup(product).service.get(5, false)).rejects.toThrow(NotFoundException);
    await expect(setup(product).service.get(5, true)).resolves.toMatchObject({ name: 'F.pdf' });
  });

  it('archivo perdido en el bucket: 404', async () => {
    const { service, bucket } = setup({ id: 5, isVisible: true, technicalSheetKey: 'k.pdf' });
    bucket.getFile.mockRejectedValueOnce(new Error('NoSuchKey'));
    await expect(service.get(5, false)).rejects.toThrow(NotFoundException);
  });

  it('un error del bucket al borrar no corta la operación', async () => {
    const { service, bucket } = setup({ id: 5, technicalSheetKey: 'k.pdf' });
    bucket.deleteFile.mockRejectedValueOnce(new Error('503'));
    await expect(service.remove(5)).resolves.toBeUndefined();
  });
});
