import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { dateTransformer } from '../database/date.transformer';
import { DateTime } from 'luxon';

export enum EventType {
  LOGIN = 'login',
  SEARCH = 'search',
}

@Entity('user_event')
@Index(['userId', 'createdAt'])
@Index(['eventType', 'createdAt'])
export class UserEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 50 })
  eventType: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @CreateDateColumn({
    type: 'timestamp',
    transformer: dateTransformer,
  })
  createdAt: DateTime;
}
