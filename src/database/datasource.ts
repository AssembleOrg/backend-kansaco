import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  entities: [
    path.join(__dirname, '..', 'entities', '**', '*.entity{.ts,.js}'),
    path.join(__dirname, '..', 'product', '**', '*.entity{.ts,.js}'),
    path.join(__dirname, '..', 'user', '**', '*.entity{.ts,.js}'),
    path.join(__dirname, '..', 'cart', '**', '*.entity{.ts,.js}'),
    path.join(__dirname, '..', 'cartItem', '**', '*.entity{.ts,.js}'),
    path.join(__dirname, '..', 'admin-settings', '**', '*.entity{.ts,.js}'),
    path.join(__dirname, '..', 'discount', '**', '*.entity{.ts,.js}'),
    path.join(__dirname, '..', 'order', '**', '*.entity{.ts,.js}'),
  ],
  synchronize: false,
  logging: false,
  migrations: [path.join(__dirname, '..', 'migrations', '*{.ts,.js}')],
});
