// scripts/set-all-products-visible.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Product } from '../src/product/product.entity';

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

  try {
    console.log('🔍 Checking products...');

    // Contar productos totales
    const totalProducts = await productRepository.count();
    console.log(`📦 Total products: ${totalProducts}`);

    // Contar productos que ya están visibles
    const visibleProducts = await productRepository.count({
      where: { isVisible: true },
    });
    console.log(`✅ Already visible: ${visibleProducts}`);

    // Contar productos que no están visibles
    const hiddenProducts = await productRepository.count({
      where: { isVisible: false },
    });
    console.log(`❌ Hidden products: ${hiddenProducts}`);

    if (hiddenProducts === 0) {
      console.log('\n✨ All products are already visible!');
      await ds.destroy();
      process.exit(0);
    }

    // Actualizar todos los productos a visible
    console.log('\n🔄 Updating all products to visible...');
    const result = await productRepository
      .createQueryBuilder()
      .update(Product)
      .set({ isVisible: true })
      .where('isVisible = :isVisible', { isVisible: false })
      .execute();

    console.log(`\n✅ Successfully updated ${result.affected} products to visible!`);

    // Verificar el resultado
    const newVisibleCount = await productRepository.count({
      where: { isVisible: true },
    });
    console.log(`\n📊 Final count: ${newVisibleCount} visible products`);

    console.log('\n✨ Done!');
  } catch (error) {
    console.error('❌ Error updating products:', error);
    throw error;
  } finally {
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

