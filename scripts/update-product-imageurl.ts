// scripts/update-product-imageurl.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Product } from '../src/product/product.entity';
import { ProductImage } from '../src/product/product-image.entity';

dotenv.config();

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

  const productRepository = ds.getRepository(Product);
  const productImageRepository = ds.getRepository(ProductImage);

  try {
    console.log('🚀 Iniciando actualización de imageUrl en productos...\n');

    // Obtener todos los productos
    const products = await productRepository.find();
    console.log(`📦 Total de productos encontrados: ${products.length}\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of products) {
      try {
        // Buscar la imagen con order = 0 o isPrimary = true
        // Prioridad: primero isPrimary = true, luego order = 0
        let primaryImage = await productImageRepository.findOne({
          where: [
            { productId: product.id, isPrimary: true },
            { productId: product.id, order: 0 },
          ],
          order: { isPrimary: 'DESC', order: 'ASC' },
        });

        // Si no hay imagen con order = 0 o isPrimary, buscar cualquier imagen del producto
        if (!primaryImage) {
          primaryImage = await productImageRepository.findOne({
            where: { productId: product.id },
            order: { order: 'ASC', createdAt: 'ASC' },
          });
        }

        if (primaryImage) {
          // Actualizar el imageUrl del producto
          await productRepository.update(product.id, {
            imageUrl: primaryImage.imageUrl, 
          });
          updated++;
          console.log(
            `✅ Producto ${product.id} (${product.name}): imageUrl actualizado con ${primaryImage.imageUrl}`,
          );
        } else {
          skipped++;
          console.log(
            `⏭️  Producto ${product.id} (${product.name}): Sin imágenes, saltado`,
          );
        }
      } catch (error: any) {
        errors++;
        console.error(
          `❌ Error actualizando producto ${product.id}: ${error.message}`,
        );
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Actualizados: ${updated}`);
    console.log(`   ⏭️  Saltados: ${skipped}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`\n✨ Proceso completado!\n`);
  } catch (error: any) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  } finally {
    await ds.destroy();
  }
}

run();

