// scripts/check-user.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { User } from '../src/user/user.entity';
import * as bcrypt from 'bcrypt';

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

  const userRepository = ds.getRepository(User);

  try {
    const email = 'admin@kansaco.com';
    const password = 'password123';

    console.log(`🔍 Checking user: ${email}`);

    const user = await userRepository.findOne({
      where: { email },
    });

    if (!user) {
      console.log('❌ User not found');
      await ds.destroy();
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Nombre: ${user.nombre}`);
    console.log(`   Apellido: ${user.apellido}`);
    console.log(`   Rol: ${user.rol}`);
    console.log(`   Password hash: ${user.password.substring(0, 20)}...`);

    console.log('\n🔐 Testing password verification...');
    const isValid = await bcrypt.compare(password, user.password);
    console.log(`   Password match: ${isValid ? '✅ YES' : '❌ NO'}`);

    if (!isValid) {
      console.log('\n⚠️  Password verification failed!');
      console.log('   This might be because:');
      console.log('   1. The password was not hashed correctly during seed');
      console.log('   2. The password in DB is different from expected');
      
      console.log('\n💡 Testing with a new hash...');
      const testHash = await bcrypt.hash(password, 12);
      const testCompare = await bcrypt.compare(password, testHash);
      console.log(`   New hash test: ${testCompare ? '✅ Works' : '❌ Failed'}`);
    } else {
      console.log('\n✅ Password verification successful!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await ds.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

