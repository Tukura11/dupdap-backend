import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum TransactionType {
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  WITHDRAWAL = 'withdrawal',
}

@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({
    name: 'amount_usdc',
    type: 'numeric',
    precision: 24,
    scale: 8,
  })
  amountUsdc!: string;
}
