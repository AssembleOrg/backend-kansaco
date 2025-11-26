// scripts/update-urls-to-cdn.ts
// Script para actualizar todas las URLs de Digital Ocean Spaces a CDN
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
    console.log('🚀 Iniciando actualización de URLs a CDN...\n');
    console.log('📝 Reemplazando: .digitaloceanspaces.com → .cdn.digitaloceanspaces.com\n');

    // Actualizar URLs en Product.imageUrl
    console.log('📦 Actualizando Product.imageUrl...');
    const products = await productRepository.find();
    let productUpdated = 0;
    let productSkipped = 0;

    for (const product of products) {
      if (product.imageUrl && product.imageUrl.includes('.digitaloceanspaces.com') && !product.imageUrl.includes('.cdn.')) {
        const newUrl = product.imageUrl.replace('.digitaloceanspaces.com', '.cdn.digitaloceanspaces.com');
        await productRepository.update(product.id, { imageUrl: newUrl });
        productUpdated++;
        console.log(`  ✅ Producto ${product.id}: ${product.imageUrl.substring(0, 60)}... → ${newUrl.substring(0, 60)}...`);
      } else {
        productSkipped++;
      }
    }

    console.log(`\n📊 Product.imageUrl: ${productUpdated} actualizados, ${productSkipped} saltados\n`);

    // Actualizar URLs en ProductImage.imageUrl
    console.log('🖼️  Actualizando ProductImage.imageUrl...');
    const productImages = await productImageRepository.find();
    let imageUpdated = 0;
    let imageSkipped = 0;

    for (const image of productImages) {
      if (image.imageUrl && image.imageUrl.includes('.digitaloceanspaces.com') && !image.imageUrl.includes('.cdn.')) {
        const newUrl = image.imageUrl.replace('.digitaloceanspaces.com', '.cdn.digitaloceanspaces.com');
        await productImageRepository.update(image.id, { imageUrl: newUrl });
        imageUpdated++;
        console.log(`  ✅ Imagen ${image.id}: ${image.imageUrl.substring(0, 60)}... → ${newUrl.substring(0, 60)}...`);
      } else {
        imageSkipped++;
      }
    }

    console.log(`\n📊 ProductImage.imageUrl: ${imageUpdated} actualizados, ${imageSkipped} saltados\n`);

    console.log('📊 Resumen Final:');
    console.log(`   ✅ Productos actualizados: ${productUpdated}`);
    console.log(`   ✅ Imágenes actualizadas: ${imageUpdated}`);
    console.log(`   ⏭️  Productos saltados: ${productSkipped}`);
    console.log(`   ⏭️  Imágenes saltadas: ${imageSkipped}`);
    console.log(`\n✨ Proceso completado!\n`);
    console.log('💡 Nota: Las nuevas imágenes se subirán automáticamente con URLs del CDN.\n');
  } catch (error: any) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  } finally {
    await ds.destroy();
  }
}

run();

