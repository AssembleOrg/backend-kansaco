// scripts/seed-carts.ts
// Script para crear carritos para usuarios que no tienen uno
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { User } from '../src/user/user.entity';
import { Cart } from '../src/cart/cart.entity';
import { nowAsDate } from '../src/helpers/date.helper';

dotenv.config();

async function run() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    entities: [path.join(__dirname, '..', 'src', '**', '*.entity{.ts,.js}')],
    synchronize: false,
  });

  await ds.initialize();

  const userRepository = ds.getRepository(User);
  const cartRepository = ds.getRepository(Cart);

  try {
    console.log('🔍 Buscando usuarios sin carrito...');

    // Buscar usuarios que no tienen carrito
    const usersWithoutCart = await userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.cart', 'cart')
      .where('cart.id IS NULL')
      .getMany();

    if (usersWithoutCart.length === 0) {
      console.log('✅ Todos los usuarios ya tienen carrito.');
      await ds.destroy();
      return;
    }

    console.log(
      `📋 Encontrados ${usersWithoutCart.length} usuarios sin carrito:`,
    );
    usersWithoutCart.forEach((user) => {
      console.log(`   - ${user.email} (${user.rol})`);
    });

    // Crear carritos
    console.log('\n🛒 Creando carritos...');
    const now = nowAsDate();

    for (const user of usersWithoutCart) {
      const cart = cartRepository.create({
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      });
      await cartRepository.save(cart);
      console.log(`✅ Carrito creado para: ${user.email}`);
    }

    console.log(
      `\n🎉 Se crearon ${usersWithoutCart.length} carritos exitosamente.`,
    );
  } catch (error) {
    console.error('❌ Error creando carritos:', error);
    throw error;
  } finally {
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
