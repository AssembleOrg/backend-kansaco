import { Product } from 'src/product/product.entity';
import { Parser as Json2csvParser } from 'json2csv';
import { parseStringPromise, Builder as XmlBuilder } from 'xml2js';
import { Workbook } from 'exceljs';
import { parse } from 'csv-parse';
import { BadRequestException } from '@nestjs/common';
import { formatDateSpanish, now } from './date.helper';

/**
 * Genera un slug url-safe a partir de un nombre arbitrario.
 * Reglas:
 *  - Pasa a minúsculas y quita diacríticos (NFD).
 *  - Cualquier carácter que no sea [a-z0-9] se convierte en '-'.
 *  - Colapsa guiones repetidos y los recorta de los extremos.
 *  - Limita a 120 caracteres para respetar la columna varchar(120) del entity.
 *  - Si el resultado queda vacío (nombre solo con símbolos/espacios), devuelve 'producto'.
 */
export function slugify(name: string): string {
  if (!name) return 'producto';

  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
    .replace(/-+$/g, '');

  return slug.length > 0 ? slug : 'producto';
}

export function addSlug(product: Partial<Product>) {
  return {
    ...product,
    slug: slugify(product.name ?? ''),
  };
}

export function toCsv(products: Partial<Product>[]): Buffer {
  const keys = Object.keys(products[0]);
  const jsonForConfig = (keys: string[]): { label: string; value: string }[] =>
    keys.map((key) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: key,
    }));
  const fields = jsonForConfig(keys);

  const csvParser = new Json2csvParser({
    fields,
  });

  const csv = csvParser.parse(products);

  return Buffer.from(csv);
}

export function toXml(products: Partial<Product>[]): Buffer {
  const builder = new XmlBuilder({
    rootName: 'products',
    xmldec: {
      version: '1.0',
      encoding: 'UTF-8',
    },
  });
  const typeObj = {
    product: products,
  };

  const xml = builder.buildObject(typeObj);

  return Buffer.from(xml);
}

export async function toXlsx(products: Partial<Product>[]): Promise<Buffer> {
  const wb = new Workbook();
  const formattedDate = formatDateSpanish(now());
  const ws = wb.addWorksheet(`Productos al ${formattedDate}`);

  // Build column definitions, styling "price" in red
  const columns = products.length
    ? Object.keys(products[0]).map((key) => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
        key,
        width: 20,
        // apply red font if this is the price column
        style:
          key === 'price'
            ? { font: { color: { argb: 'FFFF0000' } } }
            : undefined,
      }))
    : [];
  ws.columns = columns;

  // Populate rows
  products.forEach((item) => ws.addRow(item));

  // ExcelJS returns a Uint8Array, convert to Node Buffer
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function parseCsv(text: string): Promise<Partial<Product>[]> {
  return new Promise<Partial<Product>[]>((resolve, reject) => {
    parse(
      text,
      { columns: true, skip_empty_lines: true },
      (err, records: Record<string, string>[]) => {
        if (err) {
          return reject(err);
        }
        try {
          const parsed = records.map((r) => ({
            id: parseInt(r.id, 10),
            price: parseFloat(r.price),
          }));
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

export async function parseXml(buf: Buffer): Promise<Partial<Product>[]> {
  const doc = await parseStringPromise(buf.toString('utf8'), {
    explicitArray: false,
  });
  // expecting <products><product><id>..</id><price>..</price></product>…</products>
  const items = doc.products.product;
  return (Array.isArray(items) ? items : [items]).map(
    (p: { id: string; price: string }) => ({
      id: parseFloat(p.id),
      price: parseFloat(p.price),
    }),
  );
}

export async function parseXlsx(buf: Buffer): Promise<Partial<Product>[]> {
  const wb = new Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  // assume first row is headers "id", "name", "price", etc.
  const headers = ws.getRow(1).values as Partial<Product>[];
  const idCol = headers.findIndex((h) => `${h}`.toLowerCase() === 'id');
  const priceCol = headers.findIndex((h) => `${h}`.toLowerCase() === 'price');
  if (idCol < 1 || priceCol < 1) {
    throw new BadRequestException('Excel is missing id or price column');
  }

  const result: Partial<Product>[] = [];
  ws.eachRow((row, rn) => {
    if (rn === 1) return;
    const idVal = row.getCell(idCol).value;
    const priceVal = row.getCell(priceCol).value;
    result.push({
      id: typeof idVal === 'number' ? idVal : parseInt(`${idVal}`, 10),
      price:
        typeof priceVal === 'number' ? priceVal : parseFloat(`${priceVal}`),
    });
  });
  return result;
}
