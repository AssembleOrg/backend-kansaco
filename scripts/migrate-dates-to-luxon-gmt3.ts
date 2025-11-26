import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DateTime } from 'luxon';

dotenv.config();

const TIMEZONE = 'America/Argentina/Buenos_Aires'; // GMT-3

/**
 * Script para normalizar fechas existentes en la BD para uso con Luxon GMT-3
 * 
 * IMPORTANTE: PostgreSQL almacena TIMESTAMP sin zona horaria (o en UTC).
 * Este script asegura que las fechas se interpreten correctamente como UTC
 * y se normalicen para que el dateTransformer funcione correctamente.
 * 
 * El script:
 * 1. Lee todas las fechas de las tablas: order, product_image, cart
 * 2. Interpreta las fechas como UTC (asumiendo que PostgreSQL las almacena así)
 * 3. Las normaliza para que se lean correctamente con el dateTransformer
 * 
 * NOTA: Las fechas en la BD se almacenan sin zona horaria. El dateTransformer
 * y DateSerializeInterceptor se encargan de convertir a GMT-3 al leer/serializar.
 * 
 * Ejecutar con: pnpm run dates:migrate-to-luxon
 */
async function run() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    entities: [
      path.join(__dirname, '..', 'src', '**', '*.entity{.ts,.js}'),
    ],
    synchronize: false,
  });

  await ds.initialize();

  try {
    console.log('🚀 Iniciando migración de fechas a GMT-3 (Luxon)...\n');

    // ===== TABLA: order =====
    console.log('📦 Migrando tabla: order');
    const orderTable = 'order';
    const orderCount = await ds.query(`SELECT COUNT(*) as count FROM "${orderTable}"`);
    const totalOrders = parseInt(orderCount[0].count);

    if (totalOrders > 0) {
      const orders = await ds.query(`SELECT id, "createdAt", "updatedAt" FROM "${orderTable}"`);
      let updatedOrders = 0;

      for (const order of orders) {
        try {
          // PostgreSQL almacena TIMESTAMP sin zona horaria (o en UTC)
          // Necesitamos interpretar la fecha como UTC y convertirla a GMT-3
          // manteniendo el mismo momento en el tiempo
          let createdAt: Date | null = null;
          let updatedAt: Date | null = null;

          if (order.createdAt) {
            // PostgreSQL almacena TIMESTAMP sin zona horaria
            // Interpretamos como UTC y normalizamos para que el transformer funcione
            // No cambiamos el momento en el tiempo, solo aseguramos interpretación correcta
            const originalDate = new Date(order.createdAt);
            // Si la fecha viene como string sin zona horaria, asumimos UTC
            const dt = DateTime.fromJSDate(originalDate, { zone: 'utc' });
            // Mantener el mismo momento, solo normalizar
            createdAt = dt.toJSDate();
          }

          if (order.updatedAt) {
            const originalDate = new Date(order.updatedAt);
            const dt = DateTime.fromJSDate(originalDate, { zone: 'utc' });
            updatedAt = dt.toJSDate();
          }

          await ds.query(
            `UPDATE "${orderTable}" SET "createdAt" = $1, "updatedAt" = $2 WHERE id = $3`,
            [createdAt, updatedAt, order.id],
          );
          updatedOrders++;
        } catch (error: any) {
          console.error(`  ❌ Error actualizando orden ${order.id}: ${error.message}`);
        }
      }

      console.log(`  ✅ Órdenes actualizadas: ${updatedOrders}/${totalOrders}\n`);
    } else {
      console.log(`  ⏭️  No hay órdenes para migrar\n`);
    }

    // ===== TABLA: product_image =====
    console.log('🖼️  Migrando tabla: product_image');
    const productImageTable = 'product_image';
    const productImageCount = await ds.query(
      `SELECT COUNT(*) as count FROM "${productImageTable}"`,
    );
    const totalProductImages = parseInt(productImageCount[0].count);

    if (totalProductImages > 0) {
      const productImages = await ds.query(
        `SELECT id, "createdAt" FROM "${productImageTable}"`,
      );
      let updatedProductImages = 0;

      for (const image of productImages) {
        try {
          let createdAt: Date | null = null;
          if (image.createdAt) {
            const originalDate = new Date(image.createdAt);
            const dt = DateTime.fromJSDate(originalDate, { zone: 'utc' });
            createdAt = dt.toJSDate();
          }

          await ds.query(
            `UPDATE "${productImageTable}" SET "createdAt" = $1 WHERE id = $2`,
            [createdAt, image.id],
          );
          updatedProductImages++;
        } catch (error: any) {
          console.error(`  ❌ Error actualizando imagen ${image.id}: ${error.message}`);
        }
      }

      console.log(
        `  ✅ Imágenes actualizadas: ${updatedProductImages}/${totalProductImages}\n`,
      );
    } else {
      console.log(`  ⏭️  No hay imágenes para migrar\n`);
    }

    // ===== TABLA: cart =====
    console.log('🛒 Migrando tabla: cart');
    const cartTable = 'cart';
    const cartCount = await ds.query(`SELECT COUNT(*) as count FROM "${cartTable}"`);
    const totalCarts = parseInt(cartCount[0].count);

    if (totalCarts > 0) {
      const carts = await ds.query(
        `SELECT id, "createdAt", "updatedAt" FROM "${cartTable}"`,
      );
      let updatedCarts = 0;

      for (const cart of carts) {
        try {
          let createdAt: Date | null = null;
          let updatedAt: Date | null = null;

          if (cart.createdAt) {
            const originalDate = new Date(cart.createdAt);
            const dt = DateTime.fromJSDate(originalDate, { zone: 'utc' });
            createdAt = dt.toJSDate();
          }

          if (cart.updatedAt) {
            const originalDate = new Date(cart.updatedAt);
            const dt = DateTime.fromJSDate(originalDate, { zone: 'utc' });
            updatedAt = dt.toJSDate();
          }

          await ds.query(
            `UPDATE "${cartTable}" SET "createdAt" = $1, "updatedAt" = $2 WHERE id = $3`,
            [createdAt, updatedAt, cart.id],
          );
          updatedCarts++;
        } catch (error: any) {
          console.error(`  ❌ Error actualizando carrito ${cart.id}: ${error.message}`);
        }
      }

      console.log(`  ✅ Carritos actualizados: ${updatedCarts}/${totalCarts}\n`);
    } else {
      console.log(`  ⏭️  No hay carritos para migrar\n`);
    }

    console.log('✨ Migración completada exitosamente!\n');
    console.log('📝 Nota: Las nuevas fechas se guardarán automáticamente en GMT-3 gracias a los transformers de TypeORM.\n');
  } catch (error: any) {
    console.error('❌ Error fatal durante la migración:', error);
    process.exit(1);
  } finally {
    await ds.destroy();
  }
}

run();

