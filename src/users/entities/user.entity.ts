import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Shareholder } from '../../shareholders/entities/shareholder.entity';
import { Like } from '../../likes/entities/like.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  login: string;

  @Column({ type: 'varchar', length: 128 })
  password: string;

  @Column({ name: 'is_admin', type: 'boolean', default: false })
  isAdmin: boolean;

  @OneToMany(() => Shareholder, (shareholder) => shareholder.creator)
  shareholders: Shareholder[];

  @OneToMany(() => Like, (like) => like.user)
  likes: Like[];
}
