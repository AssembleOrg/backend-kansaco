import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsFeaturedToProduct1746000000004
  implements MigrationInterface
{
  name = 'AddIsFeaturedToProduct1746000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product"
      ADD COLUMN "isFeatured" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product"
      DROP COLUMN "isFeatured";
    `);
  }
}
