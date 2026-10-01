import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateShareholdersSchema1700000000000
  implements MigrationInterface
{
  name = 'CreateShareholdersSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "shareholders_status_enum" AS ENUM('draft', 'published', 'deleted')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'login', type: 'varchar', length: '64', isUnique: true },
          { name: 'password', type: 'varchar', length: '128' },
          { name: 'is_admin', type: 'boolean', default: false },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'shareholders',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'full_name', type: 'varchar', length: '255' },
          { name: 'short_description', type: 'text', isNullable: true },
          {
            name: 'status',
            type: 'shareholders_status_enum',
            default: `'draft'`,
          },
          { name: 'image_url', type: 'varchar', isNullable: true },
          { name: 'video_url', type: 'varchar', isNullable: true },
          { name: 'ownership_share', type: 'float', default: 0 },
          { name: 'shares_count', type: 'integer', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'formed_at', type: 'timestamp', isNullable: true },
          { name: 'creator_id', type: 'integer' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'shareholders',
      new TableForeignKey({
        columnNames: ['creator_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'likes',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'user_id', type: 'integer' },
          { name: 'shareholder_id', type: 'integer' },
        ],
        uniques: [{ columnNames: ['user_id', 'shareholder_id'] }],
      }),
    );

    await queryRunner.createForeignKeys('likes', [
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['shareholder_id'],
        referencedTableName: 'shareholders',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('likes', true);
    await queryRunner.dropTable('shareholders', true);
    await queryRunner.dropTable('users', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "shareholders_status_enum"`);
  }
}
