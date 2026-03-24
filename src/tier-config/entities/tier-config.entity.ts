import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum TierName {
  SILVER = 'Silver',
  GOLD = 'Gold',
  BLACK = 'Black',
}

/**
 * TierConfig defines the per-tier business rules applied to user accounts.
 *
 * Tiers are assigned based on a user's balance relative to minBalance.
 * feeMultiplier scales the base fee rates from FeeConfig (e.g. 0.8 = 20% discount).
 * Limits are stored in the platform's native unit (e.g. XLM or USD-equivalent).
 */
@Entity('tier_configs')
export class TierConfig extends BaseEntity {
  @Column({ type: 'enum', enum: TierName, unique: true })
  name!: TierName;

  /** Minimum account balance to qualify for this tier (inclusive). */
  @Column({
    name: 'min_balance',
    type: 'numeric',
    precision: 24,
    scale: 8,
    default: '0',
  })
  minBalance!: string;

  /**
   * Multiplier applied to base fee rates.
   * Silver = 1.00 (no discount), Gold = 0.80 (20% off), Black = 0.50 (50% off).
   */
  @Column({
    name: 'fee_multiplier',
    type: 'numeric',
    precision: 5,
    scale: 4,
    default: '1.0000',
  })
  feeMultiplier!: string;

  @Column({
    name: 'daily_limit',
    type: 'numeric',
    precision: 24,
    scale: 8,
  })
  dailyLimit!: string;

  @Column({
    name: 'monthly_limit',
    type: 'numeric',
    precision: 24,
    scale: 8,
  })
  monthlyLimit!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}
