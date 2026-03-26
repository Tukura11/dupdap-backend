import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  PAYLINK_RECEIVED = 'paylink_received',
  PAYLINK_SENT = 'paylink_sent',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  YIELD_CREDIT = 'yield_credit',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: TransactionType,
  })
  type!: TransactionType;

  @Column({ name: 'amount', type: 'varchar' })
  amount!: string;

  @Column({ name: 'fee', type: 'varchar', nullable: true })
  fee!: string | null;

  @Column({ name: 'balance_after', type: 'varchar' })
  balanceAfter!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status!: TransactionStatus;

  @Column({ name: 'reference', type: 'varchar' })
  reference!: string;

  @Column({ name: 'counterparty_username', type: 'varchar', nullable: true })
  counterpartyUsername!: string | null;

  @Column({ name: 'note', type: 'varchar', nullable: true })
  note!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;
}

