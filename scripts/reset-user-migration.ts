// scripts/reset-user-migration.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  try {
    // Delete the migration record
    await queryRunner.query(
      `DELETE FROM migrations WHERE name = 'UpdateUserAndAddDiscount1746000000000'`,
    );
    console.log('✅ Migration record deleted');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});


