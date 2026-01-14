// scripts/list-all-categories.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Category } from '../src/category/category.entity';

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

  const categoryRepository = ds.getRepository(Category);

  try {
    console.log('🔍 Fetching all categories from database...');

    // Obtener todas las categorías de la tabla category
    const categories = await categoryRepository.find({
      order: { name: 'ASC' },
    });

    console.log(`📦 Found ${categories.length} categories in database\n`);

    // Extraer solo los nombres
    const categoryNames = categories.map((cat) => cat.name);

    // Mostrar en formato JSON
    const jsonOutput = JSON.stringify(categoryNames, null, 2);
    console.log(jsonOutput);

    // También mostrar en formato lista legible
    console.log('\n📝 Categories list:');
    categoryNames.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat} (ID: ${categories[index].id})`);
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

