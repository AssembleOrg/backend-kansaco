// scripts/list-all-categories.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
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
    console.log('🔍 Fetching all products...');

    // Obtener todos los productos con sus categorías
    const products = await productRepository.find({
      select: ['category'],
    });

    console.log(`📦 Found ${products.length} products`);

    // Extraer todas las categorías y eliminar duplicados
    const allCategories = new Set<string>();

    products.forEach((product) => {
      if (product.category && Array.isArray(product.category)) {
        product.category.forEach((cat) => {
          if (cat && typeof cat === 'string' && cat.trim() !== '') {
            // Normalizar: trim y capitalizar primera letra
            const normalized = cat.trim();
            allCategories.add(normalized);
          }
        });
      }
    });

    // Convertir Set a Array y ordenar alfabéticamente
    const uniqueCategories = Array.from(allCategories).sort();

    console.log(`\n📋 Found ${uniqueCategories.length} unique categories:\n`);

    // Mostrar en formato JSON como el usuario pidió
    const jsonOutput = JSON.stringify(uniqueCategories, null, 2);
    console.log(jsonOutput);

    // También mostrar en formato lista legible
    console.log('\n📝 Categories list:');
    uniqueCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat}`);
    });

    // Guardar en un archivo JSON (opcional)
    const outputPath = path.join(__dirname, 'all-categories.json');
    fs.writeFileSync(outputPath, jsonOutput, 'utf8');
    console.log(`\n💾 Categories saved to: ${outputPath}`);

    console.log('\n✨ Done!');
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    throw error;
  } finally {
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

