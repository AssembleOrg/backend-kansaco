import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZoneToUser1746000000015 implements MigrationInterface {
  name = 'AddZoneToUser1746000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN "localidad" varchar(120),
      ADD COLUMN "provincia" varchar(80),
      ADD COLUMN "codigoPostal" varchar(12);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN "localidad",
      DROP COLUMN "provincia",
      DROP COLUMN "codigoPostal";
    `);
  }
}
