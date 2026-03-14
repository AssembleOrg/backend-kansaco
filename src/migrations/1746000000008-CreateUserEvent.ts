import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserEvent1746000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_event" (
        "id" SERIAL NOT NULL,
        "userId" uuid,
        "eventType" varchar(50) NOT NULL,
        "payload" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_event" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_event_userId_createdAt" ON "user_event" ("userId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_event_eventType_createdAt" ON "user_event" ("eventType", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_event_eventType_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_user_event_userId_createdAt"`);
    await queryRunner.query(`DROP TABLE "user_event"`);
  }
}
