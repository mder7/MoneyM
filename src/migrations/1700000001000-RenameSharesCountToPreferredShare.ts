import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSharesCountToPreferredShare1700000001000
  implements MigrationInterface
{
  name = 'RenameSharesCountToPreferredShare1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shareholders" RENAME COLUMN "shares_count" TO "preferred_share"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shareholders" ALTER COLUMN "preferred_share" TYPE float USING "preferred_share"::float`,
    );
    await queryRunner.query(
      `ALTER TABLE "shareholders" ALTER COLUMN "preferred_share" SET DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shareholders" ALTER COLUMN "preferred_share" TYPE integer USING round("preferred_share")::integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "shareholders" ALTER COLUMN "preferred_share" SET DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "shareholders" RENAME COLUMN "preferred_share" TO "shares_count"`,
    );
  }
}