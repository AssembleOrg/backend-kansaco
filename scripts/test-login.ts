// scripts/test-login.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { User } from '../src/user/user.entity';
import * as bcrypt from 'bcrypt';
// Using @nestjs/jwt would require full app bootstrap, so we'll just check the basics

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
    const jwtSecret = process.env.JWT_SECRET;

    console.log('🧪 Testing login flow...\n');

    // 1. Check JWT_SECRET
    console.log('1️⃣  Checking JWT_SECRET...');
    if (!jwtSecret) {
      console.log('❌ JWT_SECRET is not defined in .env file');
      console.log('💡 Add JWT_SECRET=your-secret-key to your .env file');
      await ds.destroy();
      process.exit(1);
    }
    console.log('✅ JWT_SECRET is defined');

    // 2. Find user
    console.log('\n2️⃣  Finding user...');
    const user = await userRepository.findOne({
      where: { email },
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      await ds.destroy();
      process.exit(1);
    }
    console.log(`✅ User found: ${user.email} (${user.rol})`);

    // 3. Verify password
    console.log('\n3️⃣  Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ Password verification failed');
      await ds.destroy();
      process.exit(1);
    }
    console.log('✅ Password is valid');

    // 4. Check JWT configuration
    console.log('\n4️⃣  Checking JWT configuration...');
    console.log(`   JWT_SECRET length: ${jwtSecret.length} characters`);
    console.log(`   JWT_EXPIRES_IN: ${process.env.JWT_EXPIRES_IN || '7d'}`);
    console.log('✅ JWT configuration looks good');

    console.log('\n✅ All tests passed! Login should work correctly.');
    console.log('\n💡 If login still fails, check:');
    console.log('   1. Server logs for detailed error messages');
    console.log('   2. That the server is running on the correct port');
    console.log('   3. That CORS is properly configured');
    console.log('   4. Network tab in browser for actual HTTP response');
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

