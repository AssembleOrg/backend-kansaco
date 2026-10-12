import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Nota interna del staff, separada de la nota del cliente (`notes`): nunca se
 * le muestra al cliente (ni API, ni PDF, ni mails). Ahí queda el motivo de
 * cancelación.
 *
 * Puramente aditiva. No se migran datos: `notes` sigue siendo la nota del cliente.
 */
export class AddInternalNotesToOrder1746000000027 implements MigrationInterface {
  name = 'AddInternalNotesToOrder1746000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "internalNotes" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" DROP COLUMN IF EXISTS "internalNotes"`,
    );
  }
}
