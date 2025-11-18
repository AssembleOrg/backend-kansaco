// scripts/seed-users.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { User } from '../src/user/user.entity';
import { Cart } from '../src/cart/cart.entity';
import { UserRole } from '../src/user/user.enum';
import * as bcrypt from 'bcrypt';
import { nowAsDate } from '../src/helpers/date.helper';

dotenv.config();

const PASSWORD = 'password123';
const SALT_ROUNDS = 12;

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

  const userRepository = ds.getRepository(User);
  const cartRepository = ds.getRepository(Cart);

  try {
    // Hash password once for all users
    const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

    // Define users for each role
    const usersData = [
      {
        email: 'admin@kansaco.com',
        nombre: 'Admin',
        apellido: 'Sistema',
        direccion: 'Oficina Central',
        telefono: '+5491112345678',
        password: hashedPassword,
        rol: UserRole.ADMIN,
      },
      {
        email: 'cliente.minorista@kansaco.com',
        nombre: 'Cliente',
        apellido: 'Minorista',
        direccion: 'Av. Principal 123',
        telefono: '+5491112345679',
        password: hashedPassword,
        rol: UserRole.CLIENTE_MINORISTA,
      },
      {
        email: 'cliente.mayorista@kansaco.com',
        nombre: 'Cliente',
        apellido: 'Mayorista',
        direccion: 'Av. Comercial 456',
        telefono: '+5491112345680',
        password: hashedPassword,
        rol: UserRole.CLIENTE_MAYORISTA,
      },
      {
        email: 'asistente@kansaco.com',
        nombre: 'Asistente',
        apellido: 'Ventas',
        direccion: 'Oficina Ventas',
        telefono: '+5491112345681',
        password: hashedPassword,
        rol: UserRole.ASISTENTE,
      },
    ];

    console.log('🌱 Seeding users...');

    // Check if users already exist (only if table exists)
    try {
      const existingEmails = await userRepository
        .createQueryBuilder('user')
        .select('user.email')
        .where('user.email IN (:...emails)', {
          emails: usersData.map((u) => u.email),
        })
        .getMany();

      if (existingEmails.length > 0) {
        console.log(
          `⚠️  Some users already exist: ${existingEmails.map((u) => u.email).join(', ')}`,
        );
        console.log('💡 Delete existing users first or use a different email');
        await ds.destroy();
        process.exit(0);
      }
    } catch (error: any) {
      // If table doesn't exist, user needs to run migrations first
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('❌ User table does not exist yet.');
        console.log('💡 Please run migrations first: pnpm run migration:run');
        await ds.destroy();
        process.exit(1);
      } else {
        throw error;
      }
    }

    // Create users
    const createdUsers = [];
    for (const userData of usersData) {
      // Create user without cart relation
      const user = userRepository.create({
        email: userData.email,
        nombre: userData.nombre,
        apellido: userData.apellido,
        direccion: userData.direccion,
        telefono: userData.telefono,
        password: userData.password,
        rol: userData.rol,
      });
      const savedUser = await userRepository.save(user);

      // Create cart for each user
      const now = nowAsDate();
      const cart = cartRepository.create({
        userId: savedUser.id,
        createdAt: now,
        updatedAt: now,
      });
      await cartRepository.save(cart);

      createdUsers.push({
        email: savedUser.email,
        nombre: savedUser.nombre,
        apellido: savedUser.apellido,
        rol: savedUser.rol,
      });

      console.log(
        `✅ Created user: ${savedUser.email} (${savedUser.rol})`,
      );
    }

    console.log('\n📋 Summary:');
    console.log(`✅ Created ${createdUsers.length} users`);
    console.log('\n👤 Users created:');
    createdUsers.forEach((user) => {
      console.log(
        `   - ${user.email} | ${user.nombre} ${user.apellido} | Role: ${user.rol}`,
      );
    });
    console.log(`\n🔑 Password for all users: ${PASSWORD}`);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  } finally {
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

