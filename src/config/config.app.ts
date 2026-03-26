import { registerAs } from '@nestjs/config';
import { AppConfig } from './interfaces/config.interface';

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4000'),
    debug: process.env.DEBUG === 'true',
    referralRewardAmountUsdc: process.env.REFERRAL_REWARD_AMOUNT_USDC || '5.00',
    referralTreasuryAddress: process.env.REFERRAL_TREASURY_ADDRESS,
  }),
);
