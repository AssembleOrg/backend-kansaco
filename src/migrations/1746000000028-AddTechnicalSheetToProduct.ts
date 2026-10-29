import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ficha técnica (PDF) por producto. El archivo vive en el bucket con ACL
 * privada; acá sólo queda el key, el nombre original y el tamaño.
 *
 * Puramente aditiva.
 */
export class AddTechnicalSheetToProduct1746000000028
  implements MigrationInterface
{
  name = 'AddTechnicalSheetToProduct1746000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "technicalSheetKey" character varying(250)`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "technicalSheetName" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "technicalSheetSize" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" DROP COLUMN IF EXISTS "technicalSheetSize"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" DROP COLUMN IF EXISTS "technicalSheetName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" DROP COLUMN IF EXISTS "technicalSheetKey"`,
    );
  }
}
