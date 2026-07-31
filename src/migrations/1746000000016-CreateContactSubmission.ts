import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea la tabla de solicitudes enviadas desde los formularios públicos.
 *
 * SEGURIDAD EN PRODUCCIÓN: esta migración es puramente aditiva. Crea un tipo
 * y una tabla que no existen, y no ejecuta ALTER ni DROP sobre ningún objeto
 * en uso. Ningún código existente lee estos objetos, así que aplicarla no
 * puede alterar el comportamiento del sitio.
 */
export class CreateContactSubmission1746000000016 implements MigrationInterface {
  name = 'CreateContactSubmission1746000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guardas de idempotencia: permiten reintentar la migración sin romper
    // si quedó a medias por un corte de red contra el proxy de Railway.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_type') THEN
          CREATE TYPE "submission_type" AS ENUM ('MAYORISTA', 'TRABAJO', 'LUBRI_EXPERTO');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contact_submission" (
        "id" SERIAL NOT NULL,
        "tipo" "submission_type" NOT NULL,
        "nombre" varchar(180) NOT NULL,
        "email" varchar(180) NOT NULL,
        "telefono" varchar(40),
        "mensaje" text,
        "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "leida" boolean NOT NULL DEFAULT false,
        "leidaAt" TIMESTAMP,
        "notaInterna" text,
        "ipHash" varchar(64),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contact_submission" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contact_submission_tipo" ON "contact_submission" ("tipo")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contact_submission_leida" ON "contact_submission" ("leida")`,
    );
    // Orden por defecto del listado del panel.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contact_submission_createdAt" ON "contact_submission" ("createdAt" DESC)`,
    );
    // Índice parcial para el contador de no leídas del sidebar: sólo indexa
    // las filas pendientes, que son una fracción del total.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contact_submission_no_leidas" ON "contact_submission" ("createdAt" DESC) WHERE "leida" = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_contact_submission_no_leidas"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_contact_submission_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_contact_submission_leida"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_contact_submission_tipo"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "contact_submission"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "submission_type"`);
  }
}
