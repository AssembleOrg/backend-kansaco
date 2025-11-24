// scripts/drop-users-table.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { User } from '../src/user/user.entity';
import { Cart } from '../src/cart/cart.entity';

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

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    console.log('🗑️  Dropping user-related tables...');

    // Drop junction table first (user_discount)
    try {
      await queryRunner.query(`DROP TABLE IF EXISTS "user_discount" CASCADE`);
      console.log('✅ Dropped user_discount table');
    } catch (error) {
      console.log('⚠️  user_discount table may not exist:', error.message);
    }

    // Drop cart table (has foreign key to user)
    try {
      await queryRunner.query(`DROP TABLE IF EXISTS "cart" CASCADE`);
      console.log('✅ Dropped cart table');
    } catch (error) {
      console.log('⚠️  cart table may not exist:', error.message);
    }

    // Drop user table
    try {
      await queryRunner.query(`DROP TABLE IF EXISTS "user" CASCADE`);
      console.log('✅ Dropped user table');
    } catch (error) {
      console.log('⚠️  user table may not exist:', error.message);
    }

    // Drop user_role enum if it exists and is not used elsewhere
    try {
      await queryRunner.query(`DROP TYPE IF EXISTS "user_role" CASCADE`);
      console.log('✅ Dropped user_role enum');
    } catch (error) {
      console.log('⚠️  user_role enum may not exist or is in use:', error.message);
    }

    await queryRunner.commitTransaction();
    console.log('✅ Successfully dropped all user-related tables');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error dropping tables:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});



