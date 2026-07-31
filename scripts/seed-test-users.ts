// scripts/seed-test-users.ts
// Crea 20 usuarios de prueba (testuno@test.com .. testveinte@test.com) repartidos
// por provincias (foco en Buenos Aires + Mendoza/Santa Fe/Córdoba + sur), con roles
// mezclados (habilitados B2B / pendientes MINORISTA) para poblar el analytics de zonas
// y el mapa.
//
//   Dry-run (valida sin tocar la base, hace ROLLBACK):
//     pnpm ts-node -r tsconfig-paths/register scripts/seed-test-users.ts --dry-run
//   Sembrar de verdad:
//     pnpm ts-node -r tsconfig-paths/register scripts/seed-test-users.ts
//   Borrar los de prueba:
//     pnpm ts-node -r tsconfig-paths/register scripts/seed-test-users.ts --drop
//
// Los nombres de provincia deben coincidir EXACTO con AR_PROVINCES del front
// (si no, no matchean el pin del mapa).
import 'reflect-metadata';
import { DataSource, EntityManager } from 'typeorm';
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

const NUMEROS = [
  'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete',
  'dieciocho', 'diecinueve', 'veinte',
];

// [provincia, localidad, CP, rol]. Foco en Bs As, algo de Cuyo/Centro/Litoral y sur.
const ZONAS: Array<[string, string, string, UserRole]> = [
  ['Buenos Aires', 'La Plata', '1900', UserRole.CLIENTE_MAYORISTA],
  ['Buenos Aires', 'Quilmes', '1878', UserRole.CLIENTE_MINORISTA],
  ['Buenos Aires', 'Mar del Plata', '7600', UserRole.REVENDEDOR],
  ['Buenos Aires', 'Bahía Blanca', '8000', UserRole.CLIENTE_MAYORISTA],
  ['Buenos Aires', 'Tandil', '7000', UserRole.CLIENTE_MINORISTA],
  ['Buenos Aires', 'San Nicolás', '2900', UserRole.TALLER],
  ['Ciudad Autónoma de Buenos Aires', 'Palermo', '1425', UserRole.CLIENTE_MAYORISTA],
  ['Ciudad Autónoma de Buenos Aires', 'Caballito', '1405', UserRole.CLIENTE_MINORISTA],
  ['Córdoba', 'Córdoba', '5000', UserRole.CLIENTE_MAYORISTA],
  ['Córdoba', 'Villa María', '5900', UserRole.REVENDEDOR],
  ['Córdoba', 'Río Cuarto', '5800', UserRole.CLIENTE_MINORISTA],
  ['Santa Fe', 'Rosario', '2000', UserRole.CLIENTE_MAYORISTA],
  ['Santa Fe', 'Santa Fe', '3000', UserRole.SUBMAYORISTA],
  ['Mendoza', 'Mendoza', '5500', UserRole.CLIENTE_MAYORISTA],
  ['Mendoza', 'San Rafael', '5600', UserRole.CLIENTE_MINORISTA],
  ['Neuquén', 'Neuquén', '8300', UserRole.TALLER],
  ['Río Negro', 'Bariloche', '8400', UserRole.CLIENTE_MINORISTA],
  ['Chubut', 'Comodoro Rivadavia', '9000', UserRole.CLIENTE_MAYORISTA],
  ['Santa Cruz', 'Río Gallegos', '9400', UserRole.CLIENTE_MINORISTA],
  ['Tierra del Fuego', 'Ushuaia', '9410', UserRole.REVENDEDOR],
];

const emails = NUMEROS.map((n) => `test${n}@test.com`);

function buildDataSource() {
  return new DataSource({
    type: 'postgres',
    ...(process.env.DATABASE_URL
      ? { url: process.env.DATABASE_URL }
      : {
          host: process.env.POSTGRES_HOST,
          port: Number(process.env.POSTGRES_PORT),
          username: process.env.POSTGRES_USERNAME,
          password: process.env.POSTGRES_PASSWORD,
          database: process.env.POSTGRES_DATABASE,
        }),
    entities: [path.join(__dirname, '..', 'src', '**', '*.entity{.ts,.js}')],
    synchronize: false,
  });
}

// Inserta los usuarios usando el EntityManager dado (que puede ser transaccional).
async function insertUsers(manager: EntityManager) {
  const userRepo = manager.getRepository(User);
  const cartRepo = manager.getRepository(Cart);

  const existing = await userRepo
    .createQueryBuilder('user')
    .select('user.email')
    .where('user.email IN (:...emails)', { emails })
    .getMany();

  if (existing.length > 0) {
    console.log(`⚠️  Ya existen ${existing.length} usuarios de prueba.`);
    console.log('💡 Corré con --drop para borrarlos y volver a sembrar.');
    return 0;
  }

  const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  let count = 0;
  for (let i = 0; i < NUMEROS.length; i++) {
    const [provincia, localidad, codigoPostal, rol] = ZONAS[i];
    const user = userRepo.create({
      email: emails[i],
      nombre: `Test${i + 1}`,
      apellido: provincia.split(' ')[0],
      direccion: `Calle de Prueba ${100 + i}`,
      localidad,
      provincia,
      codigoPostal,
      telefono: `+54911${String(20000000 + i).padStart(8, '0')}`,
      password: hashedPassword,
      rol,
    });
    const savedUser = await userRepo.save(user);

    const now = nowAsDate();
    const cart = cartRepo.create({
      userId: savedUser.id,
      createdAt: now,
      updatedAt: now,
    });
    await cartRepo.save(cart);

    count++;
    console.log(`✅ ${savedUser.email} — ${provincia} / ${localidad} (${rol})`);
  }
  return count;
}

async function seed(ds: DataSource) {
  console.log('🌱 Sembrando 20 usuarios de prueba...');
  const count = await insertUsers(ds.manager);
  if (count > 0) console.log(`\n📋 Creados ${count} usuarios. Password: ${PASSWORD}`);
}

// Dry-run: ejecuta TODO dentro de una transacción y hace ROLLBACK al final.
// Detecta errores de FK/columnas/lógica sin dejar nada en la base.
async function dryRun(ds: DataSource) {
  console.log('🧪 DRY-RUN: ejecutando dentro de una transacción (se revierte al final)...');
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    const count = await insertUsers(qr.manager);
    await qr.rollbackTransaction();
    if (count > 0) {
      console.log(`\n✅ DRY-RUN OK: se habrían creado ${count} usuarios. Nada se guardó (rollback).`);
      console.log('💡 Corré sin --dry-run para sembrar de verdad.');
    } else {
      console.log('\nℹ️  DRY-RUN sin cambios (ver aviso arriba).');
    }
  } catch (error) {
    await qr.rollbackTransaction();
    console.error('\n❌ DRY-RUN FALLÓ — el seed real también fallaría:');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await qr.release();
  }
}

async function drop(ds: DataSource) {
  const userRepo = ds.getRepository(User);
  const cartRepo = ds.getRepository(Cart);
  const users = await userRepo
    .createQueryBuilder('user')
    .where('user.email IN (:...emails)', { emails })
    .getMany();
  if (users.length === 0) {
    console.log('ℹ️  No hay usuarios de prueba para borrar.');
    return;
  }
  // El cart tiene FK a userId SIN ON DELETE CASCADE → hay que borrarlo antes.
  const userIds = users.map((u) => u.id);
  const carts = await cartRepo
    .createQueryBuilder('cart')
    .where('cart.userId IN (:...userIds)', { userIds })
    .getMany();
  if (carts.length > 0) await cartRepo.remove(carts);
  await userRepo.remove(users);
  console.log(`🗑️  Borrados ${users.length} usuarios de prueba (y sus carts).`);
}

async function run() {
  const isDrop = process.argv.includes('--drop');
  const isDry = process.argv.includes('--dry-run');
  const ds = buildDataSource();
  await ds.initialize();
  try {
    if (isDrop) await drop(ds);
    else if (isDry) await dryRun(ds);
    else await seed(ds);
  } catch (error: any) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log('❌ La tabla user no existe. Corré las migraciones primero.');
    } else {
      console.error('❌ Error:', error);
    }
    process.exitCode = 1;
  } finally {
    await ds.destroy();
  }
}

run();
