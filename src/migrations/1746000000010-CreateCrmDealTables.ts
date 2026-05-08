import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrmDealTables1746000000010 implements MigrationInterface {
  name = 'CreateCrmDealTables1746000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "deal" (
        "id" SERIAL NOT NULL,
        "leadId" integer NOT NULL,
        "vendorId" integer,
        "stageId" integer NOT NULL,
        "currentReasonId" integer,
        "monto" numeric(14,2),
        "fechaCierre" date,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_deal" PRIMARY KEY ("id"),
        CONSTRAINT "FK_deal_lead" FOREIGN KEY ("leadId")
          REFERENCES "lead"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_deal_vendor" FOREIGN KEY ("vendorId")
          REFERENCES "vendor"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_deal_stage" FOREIGN KEY ("stageId")
          REFERENCES "pipeline_stage"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_deal_reason" FOREIGN KEY ("currentReasonId")
          REFERENCES "terminal_reason"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_deal_stageId" ON "deal" ("stageId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deal_leadId" ON "deal" ("leadId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deal_vendorId" ON "deal" ("vendorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deal_fechaCierre" ON "deal" ("fechaCierre")`,
    );

    await queryRunner.query(`
      CREATE TABLE "deal_stage_history" (
        "id" SERIAL NOT NULL,
        "dealId" integer NOT NULL,
        "fromStageId" integer,
        "toStageId" integer NOT NULL,
        "reasonId" integer,
        "movedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_deal_stage_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_dsh_deal" FOREIGN KEY ("dealId")
          REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_dsh_from" FOREIGN KEY ("fromStageId")
          REFERENCES "pipeline_stage"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_dsh_to" FOREIGN KEY ("toStageId")
          REFERENCES "pipeline_stage"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_dsh_reason" FOREIGN KEY ("reasonId")
          REFERENCES "terminal_reason"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_dsh_dealId" ON "deal_stage_history" ("dealId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dsh_movedAt" ON "deal_stage_history" ("movedAt")`,
    );

    await queryRunner.query(`
      CREATE TABLE "deal_note" (
        "id" SERIAL NOT NULL,
        "dealId" integer NOT NULL,
        "contenido" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_deal_note" PRIMARY KEY ("id"),
        CONSTRAINT "FK_deal_note_deal" FOREIGN KEY ("dealId")
          REFERENCES "deal"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_deal_note_dealId" ON "deal_note" ("dealId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_deal_note_createdAt" ON "deal_note" ("createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deal_note_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deal_note_dealId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deal_note"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dsh_movedAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dsh_dealId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deal_stage_history"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deal_fechaCierre"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deal_vendorId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deal_leadId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_deal_stageId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deal"`);
  }
}
