// scripts/list-products-by-presentation.ts
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
    console.log('🔍 Buscando productos por campo presentation...\n');

    // Consulta SQL para productos que NO contienen ","
    const sqlQueryWithoutComma = `
      SELECT id, name, presentation, sku
      FROM product
      WHERE presentation NOT LIKE '%,%'
      ORDER BY id;
    `;

    console.log('📝 Consulta SQL para productos SIN coma en presentation:');
    console.log(sqlQueryWithoutComma);
    console.log('\n' + '='.repeat(80) + '\n');

    // Obtener productos CON coma en presentation
    const productsWithComma = await productRepository
      .createQueryBuilder('product')
      .where("product.presentation LIKE '%,%'")
      .orderBy('product.id', 'ASC')
      .getMany();

    // Obtener productos SIN coma en presentation
    const productsWithoutComma = await productRepository
      .createQueryBuilder('product')
      .where("product.presentation NOT LIKE '%,%'")
      .orderBy('product.id', 'ASC')
      .getMany();

    console.log('📊 RESULTADOS:\n');

    // Listar productos CON coma
    console.log(`✅ Productos CON coma (",") en presentation: ${productsWithComma.length}\n`);
    if (productsWithComma.length > 0) {
      productsWithComma.forEach((product, index) => {
        console.log(
          `  ${index + 1}. ID: ${product.id} | SKU: ${product.sku} | Nombre: ${product.name}`,
        );
        console.log(`     Presentation: "${product.presentation}"`);
        console.log('');
      });
    } else {
      console.log('  (No hay productos con coma en presentation)\n');
    }

    console.log('='.repeat(80));
    console.log('');

    // Listar productos SIN coma
    console.log(`⏭️  Productos SIN coma (",") en presentation: ${productsWithoutComma.length}\n`);
    if (productsWithoutComma.length > 0) {
      productsWithoutComma.forEach((product, index) => {
        console.log(
          `  ${index + 1}. ID: ${product.id} | SKU: ${product.sku} | Nombre: ${product.name}`,
        );
        console.log(`     Presentation: "${product.presentation}"`);
        console.log('');
      });
    } else {
      console.log('  (No hay productos sin coma en presentation)\n');
    }

    console.log('='.repeat(80));
    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Con coma: ${productsWithComma.length}`);
    console.log(`   ⏭️  Sin coma: ${productsWithoutComma.length}`);
    console.log(`   📦 Total: ${productsWithComma.length + productsWithoutComma.length}`);
    console.log('\n✨ Proceso completado!\n');
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await ds.destroy();
  }
}

run();

