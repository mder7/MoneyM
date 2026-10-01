import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Shareholder } from '../../shareholders/entities/shareholder.entity';

@Entity('likes')
@Unique(['user', 'shareholder'])
export class Like {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.likes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Shareholder, (shareholder) => shareholder.likes, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'shareholder_id' })
  shareholder: Shareholder;
}
