import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Like } from '../../likes/entities/like.entity';

export enum ShareholderStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  DELETED = 'deleted',
}

@Entity('shareholders')
export class Shareholder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription: string;

  @Column({
    type: 'enum',
    enum: ShareholderStatus,
    default: ShareholderStatus.DRAFT,
  })
  status: ShareholderStatus;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string;

  @Column({ name: 'video_url', type: 'varchar', nullable: true })
  videoUrl: string;

  @Column({ name: 'ownership_share', type: 'float', default: 0 })
  ownershipShare: number;

  // поле по предметной области №2: доля привилегированных акций, %
  @Column({ name: 'preferred_share', type: 'float', default: 0 })
  preferredShare: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'formed_at', type: 'timestamp', nullable: true })
  formedAt: Date | null;

  @ManyToOne(() => User, (user) => user.shareholders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @OneToMany(() => Like, (like) => like.shareholder)
  likes: Like[];

  likesCount?: number;
}
