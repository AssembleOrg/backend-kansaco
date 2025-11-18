import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserAndAddDiscount1746000000000
  implements MigrationInterface
{
  name = 'UpdateUserAndAddDiscount1746000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if user_role enum exists, if not create it directly
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'user_role'
      )
    `);

    if (enumExists[0].exists) {
      // Drop old user_role enum and create new one with updated roles
      await queryRunner.query(
        `ALTER TYPE "public"."user_role" RENAME TO "user_role_old"`,
      );
    }

    // Create new enum with updated roles
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'CLIENTE_MINORISTA', 'CLIENTE_MAYORISTA', 'ASISTENTE')`,
    );

    // Check if user table exists and has role column
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user'
      )
    `);

    if (tableExists[0].exists) {
      // Check if role column exists
      const columnExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'user' 
          AND column_name = 'role'
        )
      `);

      if (columnExists[0].exists) {
        // Drop the old role column default
        await queryRunner.query(
          `ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`,
        );

        // Convert existing role values to new enum
        await queryRunner.query(
          `ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role" USING 
            CASE 
              WHEN "role"::text = 'ADMIN' THEN 'ADMIN'::user_role
              WHEN "role"::text = 'EMPLOYEE' THEN 'ASISTENTE'::user_role
              WHEN "role"::text = 'USER' THEN 'CLIENTE_MINORISTA'::user_role
              ELSE 'CLIENTE_MINORISTA'::user_role
            END`,
        );
      }
    }

    // Drop old enum if it exists
    if (enumExists[0].exists) {
      await queryRunner.query(`DROP TYPE "public"."user_role_old"`);
    }

    // Rename role column to rol (if table exists)
    if (tableExists[0].exists) {
      const columnExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'user' 
          AND column_name = 'role'
        )
      `);

      if (columnExists[0].exists) {
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "role" TO "rol"`);
      }
    }

    // Check if user table exists before adding columns
    const userTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user'
      )
    `);

    if (!userTableExists[0].exists) {
      // Create user table from scratch
      await queryRunner.query(
        `CREATE TABLE "user" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "email" character varying(120) NOT NULL,
          "nombre" character varying(120) NOT NULL,
          "apellido" character varying(120) NOT NULL,
          "direccion" character varying(255),
          "telefono" character varying(20) NOT NULL,
          "password" character varying(255) NOT NULL,
          "rol" "public"."user_role" NOT NULL,
          CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_user_email" UNIQUE ("email")
        )`,
      );
    } else {
        // Check which columns already exist
      const existingColumns = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user'
      `);
      const columnNames = existingColumns.map((c: any) => c.column_name);

      // Add new columns only if they don't exist
      if (!columnNames.includes('nombre')) {
        await queryRunner.query(
          `ALTER TABLE "user" ADD COLUMN "nombre" character varying(120)`,
        );
      }
      if (!columnNames.includes('apellido')) {
        await queryRunner.query(
          `ALTER TABLE "user" ADD COLUMN "apellido" character varying(120)`,
        );
      }
      if (!columnNames.includes('direccion')) {
        await queryRunner.query(
          `ALTER TABLE "user" ADD COLUMN "direccion" character varying(255)`,
        );
      }
      if (!columnNames.includes('telefono')) {
        await queryRunner.query(
          `ALTER TABLE "user" ADD COLUMN "telefono" character varying(20)`,
        );
      }
      if (!columnNames.includes('password')) {
        await queryRunner.query(
          `ALTER TABLE "user" ADD COLUMN "password" character varying(255)`,
        );
      }

      // Migrate fullName to nombre and apellido (if fullName exists)
      if (columnNames.includes('fullName')) {
        await queryRunner.query(`
          UPDATE "user" 
          SET 
            "nombre" = COALESCE("nombre", SPLIT_PART("fullName", ' ', 1)),
            "apellido" = COALESCE("apellido", CASE 
              WHEN POSITION(' ' IN "fullName") > 0 
              THEN SUBSTRING("fullName" FROM POSITION(' ' IN "fullName") + 1)
              ELSE ''
            END)
          WHERE "fullName" IS NOT NULL
        `);
      }

      // Set default values for required fields
      await queryRunner.query(
        `UPDATE "user" SET "telefono" = COALESCE("telefono", '+5490000000000') WHERE "telefono" IS NULL`,
      );
      await queryRunner.query(
        `UPDATE "user" SET "password" = COALESCE("password", '') WHERE "password" IS NULL`,
      );

      // Make required columns NOT NULL
      await queryRunner.query(
        `ALTER TABLE "user" ALTER COLUMN "nombre" SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "user" ALTER COLUMN "apellido" SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "user" ALTER COLUMN "telefono" SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "user" ALTER COLUMN "password" SET NOT NULL`,
      );

      // Change user id to UUID with auto-generation (if not already)
      const idColumn = await queryRunner.query(`
        SELECT column_default 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user' 
        AND column_name = 'id'
      `);

      if (!idColumn[0]?.column_default?.includes('uuid_generate_v4')) {
        // First, drop the primary key constraint
        await queryRunner.query(
          `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "PK_cace4a159ff9f2512dd42373760"`,
        );
        // Change id column to use uuid_generate_v4() as default
        await queryRunner.query(
          `ALTER TABLE "user" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
        );
        // Re-add primary key
        await queryRunner.query(
          `ALTER TABLE "user" ADD CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")`,
        );
      }

      // Drop old fullName column if it exists
      if (columnNames.includes('fullName')) {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "fullName"`);
      }
    }

    // Check if cart table exists, if not create it
    const cartTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cart'
      )
    `);

    if (!cartTableExists[0].exists) {
      await queryRunner.query(
        `CREATE TABLE "cart" (
          "id" SERIAL NOT NULL,
          "createdAt" TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "userId" uuid,
          CONSTRAINT "PK_cart" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_cart_userId" UNIQUE ("userId"),
          CONSTRAINT "FK_cart_user" FOREIGN KEY ("userId") 
            REFERENCES "user"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        )`,
      );
    }

    // Create discount table
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "discount" (
        "id" SERIAL NOT NULL,
        "porcentaje" numeric(5,2) NOT NULL,
        CONSTRAINT "PK_discount" PRIMARY KEY ("id")
      )`,
    );

    // Create user_discount junction table
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "user_discount" (
        "userId" uuid NOT NULL,
        "discountId" integer NOT NULL,
        CONSTRAINT "PK_user_discount" PRIMARY KEY ("userId", "discountId")
      )`,
    );

    // Create product_discount junction table
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "product_discount" (
        "productId" integer NOT NULL,
        "discountId" integer NOT NULL,
        CONSTRAINT "PK_product_discount" PRIMARY KEY ("productId", "discountId")
      )`,
    );

    // Add foreign keys for user_discount (if they don't exist)
    const fkUserDiscountUserExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_user_discount_user'
      )
    `);
    if (!fkUserDiscountUserExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "user_discount" 
         ADD CONSTRAINT "FK_user_discount_user" 
         FOREIGN KEY ("userId") 
         REFERENCES "user"("id") 
         ON DELETE CASCADE 
         ON UPDATE NO ACTION`,
      );
    }

    const fkUserDiscountDiscountExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_user_discount_discount'
      )
    `);
    if (!fkUserDiscountDiscountExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "user_discount" 
         ADD CONSTRAINT "FK_user_discount_discount" 
         FOREIGN KEY ("discountId") 
         REFERENCES "discount"("id") 
         ON DELETE CASCADE 
         ON UPDATE NO ACTION`,
      );
    }

    // Add foreign keys for product_discount (if they don't exist)
    const fkProductDiscountProductExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_product_discount_product'
      )
    `);
    if (!fkProductDiscountProductExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "product_discount" 
         ADD CONSTRAINT "FK_product_discount_product" 
         FOREIGN KEY ("productId") 
         REFERENCES "product"("id") 
         ON DELETE CASCADE 
         ON UPDATE NO ACTION`,
      );
    }

    const fkProductDiscountDiscountExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'FK_product_discount_discount'
      )
    `);
    if (!fkProductDiscountDiscountExists[0].exists) {
      await queryRunner.query(
        `ALTER TABLE "product_discount" 
         ADD CONSTRAINT "FK_product_discount_discount" 
         FOREIGN KEY ("discountId") 
         REFERENCES "discount"("id") 
         ON DELETE CASCADE 
         ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop junction tables (if they exist)
    await queryRunner.query(`DROP TABLE IF EXISTS "product_discount"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_discount"`);

    // Drop discount table (if it exists)
    await queryRunner.query(`DROP TABLE IF EXISTS "discount"`);

    // Revert user table changes
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "fullName" character varying(120)`,
    );

    // Migrate nombre and apellido back to fullName
    await queryRunner.query(`
      UPDATE "user" 
      SET "fullName" = CONCAT("nombre", ' ', "apellido")
      WHERE "nombre" IS NOT NULL AND "apellido" IS NOT NULL
    `);

    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "fullName" SET NOT NULL`,
    );

    // Drop new columns
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "password"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "telefono"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "direccion"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "apellido"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "nombre"`);

    // Rename rol back to role
    await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "rol" TO "role"`);

    // Revert enum
    await queryRunner.query(
      `ALTER TYPE "public"."user_role" RENAME TO "user_role_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('USER', 'EMPLOYEE', 'ADMIN')`,
    );

    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`,
    );

    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role" USING 
        CASE 
          WHEN "role"::text = 'ADMIN' THEN 'ADMIN'::user_role
          WHEN "role"::text = 'ASISTENTE' THEN 'EMPLOYEE'::user_role
          WHEN "role"::text = 'CLIENTE_MINORISTA' OR "role"::text = 'CLIENTE_MAYORISTA' THEN 'USER'::user_role
          ELSE 'USER'::user_role
        END`,
    );

    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER'`,
    );

    await queryRunner.query(`DROP TYPE "public"."user_role_old"`);

    // Revert id column
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "PK_cace4a159ff9f2512dd42373760"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")`,
    );
  }
}

