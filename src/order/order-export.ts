import { Workbook } from 'exceljs';
import * as Handlebars from 'handlebars';
import { DateTime } from 'luxon';
import { Order } from './order.entity';
import { OrderStatus } from './order.enum';
import { UserRole } from '../user/user.enum';
import { CATEGORIA_LABEL } from './order-filters';
import { modalidadLabel } from './shipping.util';
import { now } from '../helpers/date.helper';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDIENTE: 'Pendiente',
  PROCESANDO: 'Procesando',
  ENVIADO: 'Enviado',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
};

/** Nº corto que se ve en exports (el "presupuesto" del PDF no es único). */
export const shortId = (id: string) => id.slice(0, 8).toUpperCase();

/**
 * ExcelJS escribe las Date como UTC: se arma una Date UTC con el reloj de pared
 * AR para que la celda muestre la hora local y siga siendo una fecha ordenable.
 */
const excelDate = (d?: DateTime | null) =>
  d ? new Date(Date.UTC(d.year, d.month - 1, d.day, d.hour, d.minute)) : null;

/** Excel sin precios: hoja Pedidos (1 fila por pedido) + Items (1 fila por ítem, para Tango). */
export async function ordersToXlsx(
  orders: Order[],
  skus: Map<number, string>,
  roles: Map<string, UserRole>,
): Promise<Buffer> {
  const wb = new Workbook();
  const dateFmt = 'dd/mm/yyyy hh:mm';

  const pedidos = wb.addWorksheet('Pedidos');
  pedidos.columns = [
    { header: 'Nº', key: 'nro', width: 11 },
    { header: 'Fecha creación', key: 'creado', width: 17, style: { numFmt: dateFmt } },
    { header: 'Fecha estado', key: 'fechaEstado', width: 17, style: { numFmt: dateFmt } },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Cliente', key: 'cliente', width: 28 },
    { header: 'Razón social', key: 'razonSocial', width: 28 },
    { header: 'CUIT', key: 'cuit', width: 15, style: { numFmt: '@' } },
    { header: 'Categoría', key: 'categoria', width: 14 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Teléfono', key: 'telefono', width: 15, style: { numFmt: '@' } },
    { header: 'Provincia', key: 'provincia', width: 16 },
    { header: 'Localidad', key: 'localidad', width: 18 },
    { header: 'Envío', key: 'envio', width: 22 },
    { header: 'Cant. ítems', key: 'items', width: 10 },
    { header: 'Notas', key: 'notas', width: 40 },
  ];

  const items = wb.addWorksheet('Items');
  items.columns = [
    { header: 'Nº pedido', key: 'nro', width: 11 },
    { header: 'Fecha estado', key: 'fechaEstado', width: 17, style: { numFmt: dateFmt } },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Cliente', key: 'cliente', width: 28 },
    { header: 'CUIT', key: 'cuit', width: 15, style: { numFmt: '@' } },
    { header: 'SKU', key: 'sku', width: 10, style: { numFmt: '@' } },
    { header: 'Producto', key: 'producto', width: 40 },
    { header: 'Presentación', key: 'presentacion', width: 20 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
  ];

  for (const o of orders) {
    const base = {
      nro: shortId(o.id),
      fechaEstado: excelDate(o.statusChangedAt),
      estado: STATUS_LABEL[o.status],
      cliente: o.contactInfo?.fullName ?? '',
      cuit: o.businessInfo?.cuit ?? '',
    };
    pedidos.addRow({
      ...base,
      creado: excelDate(o.createdAt),
      razonSocial: o.businessInfo?.razonSocial ?? '',
      categoria: CATEGORIA_LABEL[roles.get(o.userId)!] ?? '',
      email: o.contactInfo?.email ?? '',
      telefono: o.contactInfo?.phone ?? '',
      provincia: o.contactInfo?.provincia ?? '',
      localidad: o.contactInfo?.localidad ?? '',
      envio: o.shippingInfo ? modalidadLabel(o.shippingInfo.modalidad) : '',
      items: o.items.length,
      notas: o.notes ?? '',
    });
    for (const i of o.items) {
      items.addRow({
        ...base,
        sku: i.productId != null ? (skus.get(i.productId) ?? '') : '',
        producto: i.productName,
        presentacion: i.presentation ?? '',
        cantidad: i.quantity,
      });
    }
  }

  for (const ws of [pedidos, items]) {
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

const reportTemplate = Handlebars.compile(`<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #222; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .muted { color: #666; }
  .counts { display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap; }
  .count { border: 1px solid #ccc; border-radius: 6px; padding: 6px 10px; }
  .count b { font-size: 16px; display: block; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #e3e3e3; }
  th { background: #f3f3f3; }
  tr { page-break-inside: avoid; }
</style></head><body>
  <h1>Reporte de pedidos</h1>
  <div class="muted">{{filtros}} · Generado {{generado}}</div>
  <div class="counts">
    <div class="count"><b>{{total}}</b>Total</div>
    {{#each counts}}<div class="count"><b>{{this.n}}</b>{{this.label}}</div>{{/each}}
  </div>
  <table>
    <thead><tr><th>Nº</th><th>Fecha estado</th><th>Creado</th><th>Cliente</th><th>Provincia</th><th>Ítems</th><th>Estado</th></tr></thead>
    <tbody>
    {{#each rows}}<tr><td>{{nro}}</td><td>{{fechaEstado}}</td><td>{{creado}}</td><td>{{cliente}}</td><td>{{provincia}}</td><td>{{items}}</td><td>{{estado}}</td></tr>{{/each}}
    </tbody>
  </table>
</body></html>`);

/** HTML del reporte resumido (sin precios): conteos por estado + listado. */
export function ordersReportHtml(orders: Order[], filtros: string): string {
  const fmt = (d?: DateTime | null) => (d ? d.toFormat('dd/MM/yyyy HH:mm') : '');
  const counts = Object.values(OrderStatus)
    .map((s) => ({ label: STATUS_LABEL[s], n: orders.filter((o) => o.status === s).length }))
    .filter((c) => c.n > 0);
  return reportTemplate({
    filtros,
    generado: fmt(now()),
    total: orders.length,
    counts,
    rows: orders.map((o) => ({
      nro: shortId(o.id),
      fechaEstado: fmt(o.statusChangedAt),
      creado: fmt(o.createdAt),
      cliente: o.businessInfo?.razonSocial || o.contactInfo?.fullName || '',
      provincia: o.contactInfo?.provincia ?? '',
      items: o.items.length,
      estado: STATUS_LABEL[o.status],
    })),
  });
}
