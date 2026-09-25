// scripts/import-tango.ts
//
// Importa el listado de artículos de Tango (xlsx) al catálogo.
//   npm run products:import-tango                 -> dry-run: NO escribe nada, genera reporte
//   npm run products:import-tango -- --apply      -> crea los productos nuevos (ocultos)
//   npm run products:import-tango -- --file=otra.xlsx
//
// Código Tango (10 dígitos) = EEEE (envase/empaque) + PPPPPP (familia = SKU web).
// Match SIEMPRE por SKU. Los productos existentes no se tocan (sus presentaciones
// tienen bultos atados al texto exacto); solo se reportan diferencias.
import 'reflect-metadata';
import * as path from 'path';
import { Workbook } from 'exceljs';
import dataSource from '../src/database/datasource';
import { Product } from '../src/product/product.entity';
import { Category } from '../src/category/category.entity';
import { ProductBulto } from '../src/bulto/bulto.entity';
import { slugify } from '../src/helpers/product.helper';
import { splitPresentations } from '../src/bulto/bulto.util';

// Prefijo -> nombre de presentación (estilo de la web). null = caja/empaque de
// varias unidades: en la web eso es un bulto, no una presentación.
// Prefijos que no están acá se etiquetan por capacidad y se marcan "a validar".
const ENVASES: Record<string, string | null> = {
  '0010': 'Tambor 200 Litros',
  '0020': 'Tambor 200 Litros',
  '0030': 'Tambor 200 Litros',
  '0040': 'Tambor 200 Litros',
  '0060': 'Contenedor 1000 Litros',
  '0070': 'Tambor 100 Litros',
  '0080': 'Balde 20 Litros',
  '0090': 'Balde 20 Litros',
  '0510': 'Bidón 4 Litros',
  '0050': 'Bidón 1 Litro',
  '0520': 'Bidón 1 Litro',
  '0530': 'Botella 500cc',
  '0540': 'Pomo 450cc',
  '0550': 'Botella 200cc',
  // grasas: mismo texto que ya usa la web
  '0170': 'TAMBOR 180 Kg',
  '0190': 'BALDE 18 Kg',
  '0200': 'BALDE 18 Kg',
  '0280': 'BALDE 9 Kg',
  '0570': 'BALDE 3 Kg',
  '0590': 'POTE 400 grs',
  // cajas: contenido total = N x envase unitario
  '0100': null, // 16 L = 4 x Bidón 4 L
  '0110': null, // 8 L = 8 x Bidón 1 L
  '0130': null, // 10,8 L = 24 x Pomo 450cc
  '0330': null, // 9 L = 20 x Pomo 450cc
  '0340': null, // 4,05 L = 9 x Pomo 450cc
  '0220': null, // 6,4 kg = 8 x Pote 800 grs
  '0230': null, // 9,6 kg = 24 x Pote 400 grs
  '0320': null, // 8 kg = 20 x Pote 400 grs
};

type Row = {
  codigo: string;
  prefijo: string;
  familia: string; // sin ceros, formato SKU web
  nombre: string;
  ean: string;
  capacidad: number;
  gama: string;
};

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\bde\b/g, '')
    .replace(/[^a-z0-9]+/g, '');

function cellText(v: unknown): string {
  if (v && typeof v === 'object') {
    const o = v as { result?: unknown; text?: unknown };
    return String(o.result ?? o.text ?? '');
  }
  return String(v ?? '');
}

function etiqueta(r: Row): { label: string | null; mapeado: boolean } {
  if (r.prefijo in ENVASES) return { label: ENVASES[r.prefijo], mapeado: true };
  const cap = String(r.capacidad).replace('.', ',');
  const unidad = r.gama.startsWith('G') ? 'Kg' : 'Litros';
  return { label: `${cap} ${unidad}`, mapeado: false };
}

async function leerExcel(file: string): Promise<Row[]> {
  const wb = new Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const rows: Row[] = [];
  ws.eachRow((row, i) => {
    if (i === 1) return;
    const codigo = clean(cellText(row.getCell(1).value)).padStart(10, '0');
    if (!/^\d{10}$/.test(codigo)) return;
    rows.push({
      codigo,
      prefijo: codigo.slice(0, 4),
      familia: String(Number(codigo.slice(4))),
      nombre: clean(cellText(row.getCell(2).value)),
      ean: clean(cellText(row.getCell(3).value)),
      capacidad: Number(cellText(row.getCell(4).value)),
      gama: clean(cellText(row.getCell(7).value)),
    });
  });
  return rows;
}

// El nombre más repetido de la familia (Tango varía espacios/abreviaturas por envase).
function nombreFamilia(rows: Row[]): string {
  const count = new Map<string, number>();
  rows.forEach((r) => count.set(r.nombre, (count.get(r.nombre) ?? 0) + 1));
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0][0].slice(0, 120);
}

// "5 W 30" -> "5w30", "SAE 40" -> "sae40": el grado queda como un solo token.
const tokens = (s: string) =>
  new Set(
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\bo\s*w\s*(\d+)/g, ' 0w$1 ') // "OW20" tipeado con O
      .replace(/(\d+)\s*w\s*(\d+)/g, ' $1w$2 ')
      .replace(/sae\s*(\d+)/g, ' sae$1 ')
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
const grados = (t: Set<string>) => [...t].filter((x) => /^(\d+w\d+|sae\d+)$/.test(x));

// Tango reutiliza el número de familia en algunos prefijos para OTRO producto
// (ej. 0050002120 = "SAVIA A 15W40" dentro de la familia SAVIA 0W20).
// Se separan las filas cuyo nombre no se parece al dominante o cuyo grado difiere.
// ponytail: heurística Jaccard 0.34; las filas excluidas van al reporte para revisar.
// Si ambos tienen grado ("15w40", "sae40") o número (ISO "68", "460") y no comparten ninguno: distintos.
function chocan(a: string[], b: string[]) {
  return a.length > 0 && b.length > 0 && !a.some((x) => b.includes(x));
}
// Abreviaturas de Tango: "agric" ~ "agricola", "ref" ~ "refrig".
const abrevia = (x: string, y: string) =>
  x === y || (Math.min(x.length, y.length) >= 2 && (x.startsWith(y) || y.startsWith(x)));

function parecido(a: Set<string>, b: Set<string>): boolean {
  const nums = (t: Set<string>) => [...t].filter((x) => /^\d{2,}$/.test(x));
  if (chocan(grados(a), grados(b)) || chocan(nums(a), nums(b))) return false;
  const ca = [...a].join('');
  const cb = [...b].join('');
  if (ca.includes(cb) || cb.includes(ca)) return true; // "G.S.P." vs "GSP"
  const hits = (x: Set<string>, y: Set<string>) =>
    [...x].filter((t) => [...y].some((u) => abrevia(t, u))).length;
  return (hits(a, b) + hits(b, a)) / (a.size + b.size) > 0.5;
}

function separarIntrusos(rows: Row[]): { propias: Row[]; intrusas: Row[] } {
  // Referencia = la fila parecida a más filas (el texto exacto varía por envase).
  const ts = rows.map((r) => tokens(r.nombre));
  const votos = ts.map((t) => ts.filter((o) => parecido(t, o)).length);
  const base = ts[votos.indexOf(Math.max(...votos))];
  const propias: Row[] = [];
  const intrusas: Row[] = [];
  rows.forEach((r, i) => (parecido(ts[i], base) ? propias : intrusas).push(r));
  return { propias, intrusas };
}

function presentacionFamilia(rows: Row[]): string {
  const vistos = new Map<string, number>(); // label -> capacidad para ordenar
  rows.forEach((r) => {
    const { label } = etiqueta(r);
    if (label) vistos.set(label, Math.max(vistos.get(label) ?? 0, r.capacidad));
  });
  return [...vistos.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l)
    .join(', ');
}

// "Tambor 200 Litros" / "200L" -> "200l"; "POTE 400 grs" / "400 G" -> "0.4kg"; sin capacidad -> ''.
function capacidad(label: string): string {
  const m = label
    .toLowerCase()
    .replace(',', '.')
    .match(/(\d+(?:\.\d+)?)\s*(litros?|lts?|l|kg|kilos?|k|grs?|gramos|g|cc|ml)\b/);
  if (!m) return '';
  const n = Number(m[1]);
  const u = m[2];
  if (/^(cc|ml)$/.test(u)) return `${n / 1000}l`;
  if (/^(grs?|gramos|g)$/.test(u)) return `${n / 1000}kg`;
  if (/^(kg|kilos?|k)$/.test(u)) return `${n}kg`;
  return `${n}l`;
}

async function run() {
  const apply = process.argv.includes('--apply');
  const fileArg = process.argv.find((a) => a.startsWith('--file='));
  const file = path.resolve(
    __dirname,
    'files',
    fileArg ? fileArg.split('=')[1] : 'ver productos1.xlsx',
  );

  const todas = await leerExcel(file);
  const descartadas = todas.filter((r) => /NO USAR/i.test(r.nombre));
  const rows = todas.filter((r) => !/NO USAR/i.test(r.nombre));

  const familias = new Map<string, Row[]>();
  rows.forEach((r) => familias.set(r.familia, [...(familias.get(r.familia) ?? []), r]));

  await dataSource.initialize();
  const productRepo = dataSource.getRepository(Product);
  const web = await productRepo.find({
    select: ['id', 'name', 'sku', 'slug', 'presentation', 'isVisible'],
  });

  // SKU web -> productos. Un SKU web puede listar varias familias ("5700-5800-...").
  const webPorFamilia = new Map<string, Product[]>();
  web.forEach((p) =>
    (p.sku.match(/\d+/g) ?? []).forEach((n) => {
      const k = String(Number(n));
      webPorFamilia.set(k, [...(webPorFamilia.get(k) ?? []), p]);
    }),
  );

  const nuevos: Array<Partial<Product> & { _familia: Row[]; _problema: string }> = [];
  const existentes: Array<Record<string, unknown>> = [];
  const intrusas: Row[] = [];

  for (const [familia, todasFamilia] of familias) {
    const { propias: frs, intrusas: fuera } = separarIntrusos(todasFamilia);
    intrusas.push(...fuera);
    const matches = webPorFamilia.get(familia);
    if (matches) {
      for (const p of matches) {
        // Se compara por capacidad: "200L" y "Tambor 200 Litros" son lo mismo.
        const tango = presentacionFamilia(frs).split(', ').filter(Boolean);
        const webCaps = new Set(splitPresentations(p.presentation).map(capacidad).filter(Boolean));
        const tangoCaps = new Set(tango.map(capacidad).filter(Boolean));
        existentes.push({
          id: p.id,
          sku: p.sku,
          nombreWeb: p.name,
          familiaTango: familia,
          nombreTango: nombreFamilia(frs),
          visible: p.isVisible,
          presentacionWeb: p.presentation,
          presentacionTango: tango.join(', '),
          enTangoNoEnWeb: tango.filter((t) => !webCaps.has(capacidad(t))).join(', '),
          enWebNoEnTango: [...webCaps].filter((c) => !tangoCaps.has(c)).join(', '),
        });
      }
      continue;
    }

    const presentation = presentacionFamilia(frs);
    const problemas: string[] = [];
    if (!presentation) problemas.push('sin presentación (solo cajas)');
    if (frs.some((r) => !etiqueta(r).mapeado)) problemas.push('envase sin mapear');
    if (fuera.length) problemas.push(`${fuera.length} fila(s) de otro producto excluidas`);

    const name = nombreFamilia(frs);
    const esGrasa = frs.every((r) => r.gama.startsWith('G'));
    nuevos.push({
      name,
      sku: familia,
      description: name,
      aplication: '',
      presentation,
      category: esGrasa ? ['Grasas'] : [],
      isVisible: false,
      stock: 0,
      price: 0,
      imageUrl: null,
      _familia: frs,
      _problema: problemas.join('; '),
    });
  }

  const webSinTango = web.filter(
    (p) => !(p.sku.match(/\d+/g) ?? []).some((n) => familias.has(String(Number(n)))),
  );

  // Bultos: se copia la convención actual. Si la mayoría de los productos con la
  // presentación "Bidón 1 Litro" tienen "Caja x 8", los nuevos también.
  const usos: Array<{ presentation: string; bultoId: number; nombre: string; c: number }> =
    await dataSource.query(
      `select pb.presentation, pb."bultoId", b.nombre, count(*)::int c
         from product_bulto pb join bulto b on b.id = pb."bultoId" group by 1, 2, 3`,
    );
  const productosPorPres = new Map<string, number>();
  web.forEach((p) =>
    splitPresentations(p.presentation).forEach((o) =>
      productosPorPres.set(o, (productosPorPres.get(o) ?? 0) + 1),
    ),
  );
  const bultosPorPres = new Map<string, Array<{ id: number; nombre: string }>>();
  usos
    .filter((u) => u.c * 2 > (productosPorPres.get(u.presentation) ?? Infinity))
    .forEach((u) =>
      bultosPorPres.set(u.presentation, [
        ...(bultosPorPres.get(u.presentation) ?? []),
        { id: u.bultoId, nombre: u.nombre },
      ]),
    );
  const bultosDe = (presentation: string) =>
    splitPresentations(presentation).flatMap((o) =>
      (bultosPorPres.get(o) ?? []).map((b) => ({ presentation: o, ...b })),
    );

  // Slugs únicos con la misma regla que ProductService.generateUniqueSlug.
  const slugs = new Set(web.map((p) => p.slug));
  for (const n of nuevos) {
    const base = slugify(n.name ?? '');
    let slug = base;
    for (let i = 2; slugs.has(slug); i++) slug = `${base}-${i}`.slice(0, 120);
    slugs.add(slug);
    n.slug = slug;
  }

  // ---------- reporte ----------
  const rep = new Workbook();
  const hoja = (nombre: string, filas: Array<Record<string, unknown>>) => {
    const ws = rep.addWorksheet(nombre);
    if (!filas.length) return;
    ws.columns = Object.keys(filas[0]).map((k) => ({ header: k, key: k, width: 28 }));
    ws.addRows(filas);
    ws.getRow(1).font = { bold: true };
  };
  hoja(
    'Nuevos (ocultos)',
    nuevos.map((n) => ({
      sku: n.sku,
      nombre: n.name,
      slug: n.slug,
      presentacion: n.presentation,
      bultos: bultosDe(n.presentation ?? '')
        .map((b) => `${b.presentation}: ${b.nombre}`)
        .join(', '),
      categoria: (n.category ?? []).join(', '),
      gama: [...new Set(n._familia.map((r) => r.gama))].join(', '),
      codigosTango: n._familia.map((r) => r.codigo).join(' '),
      ean: n._familia.map((r) => r.ean).filter(Boolean).join(' '),
      problema: n._problema,
    })),
  );
  hoja('Existentes', existentes);
  hoja(
    'Web sin Tango',
    webSinTango.map((p) => ({ id: p.id, sku: p.sku, nombre: p.name, visible: p.isVisible })),
  );
  hoja('Descartados', [
    ...descartadas.map((r) => ({ codigo: r.codigo, nombre: r.nombre, motivo: 'NO USAR' })),
    ...intrusas.map((r) => ({
      codigo: r.codigo,
      nombre: r.nombre,
      motivo: `otro producto dentro de la familia ${r.familia} (${nombreFamilia(separarIntrusos(familias.get(r.familia) ?? [r]).propias)})`,
    })),
  ]);
  const prefijos = new Map<string, Row[]>();
  rows.forEach((r) => prefijos.set(r.prefijo, [...(prefijos.get(r.prefijo) ?? []), r]));
  hoja(
    'Envases',
    [...prefijos.entries()].sort().map(([pref, rs]) => ({
      prefijo: pref,
      presentacion:
        pref in ENVASES ? (ENVASES[pref] ?? 'CAJA (bulto, se excluye)') : etiqueta(rs[0]).label,
      estado: pref in ENVASES ? 'mapeado' : 'A VALIDAR (etiqueta por capacidad)',
      capacidades: [...new Set(rs.map((r) => r.capacidad))].join(', '),
      filas: rs.length,
      ejemplo: rs[0].nombre,
    })),
  );
  const out = path.resolve(__dirname, 'files', 'import-tango-reporte.xlsx');
  await rep.xlsx.writeFile(out);

  const conProblema = nuevos.filter((n) => n._problema);
  console.log(`Excel: ${todas.length} filas, ${descartadas.length} NO USAR, ${familias.size} familias`);
  console.log(`Web:   ${web.length} productos, ${webSinTango.length} sin familia en Tango`);
  console.log(`Existentes (no se tocan): ${existentes.length}`);
  console.log(`Nuevos a crear ocultos:   ${nuevos.length} (${conProblema.length} con algo a revisar)`);
  console.log(`Reporte: ${out}`);

  if (!apply) {
    console.log('\nDRY-RUN: no se escribió nada. Usá --apply para crear los nuevos.');
    await dataSource.destroy();
    return;
  }

  const sinPresentacion = nuevos.filter((n) => !n.presentation);
  await dataSource.transaction(async (manager) => {
    const grasas = await manager.getRepository(Category).findOne({ where: { name: 'Grasas' } });
    const repo = manager.getRepository(Product);
    for (const n of nuevos) {
      if (!n.presentation) continue;
      const { _familia, _problema, ...data } = n;
      const product = repo.create(data);
      // category (text[]) y product_category siempre sincronizados
      product.categories = n.category?.includes('Grasas') && grasas ? [grasas] : [];
      product.category = product.categories.map((c) => c.name);
      const saved = await repo.save(product);
      const asignaciones = bultosDe(saved.presentation).map((b) => ({
        productId: saved.id,
        presentation: b.presentation,
        bultoId: b.id,
      }));
      if (asignaciones.length) await manager.getRepository(ProductBulto).insert(asignaciones);
    }
  });
  console.log(
    `\nAPLICADO: ${nuevos.length - sinPresentacion.length} productos creados ocultos` +
      (sinPresentacion.length ? `, ${sinPresentacion.length} salteados sin presentación` : ''),
  );
  await dataSource.destroy();
}

run().catch(async (e) => {
  console.error(e);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
