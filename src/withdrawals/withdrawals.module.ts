import { Module } from '@nestjs/common';
import { PinModule } from '../pin/pin.module';
import { WithdrawalsController } from './withdrawals.controller';

@Module({
  imports: [PinModule],
  controllers: [WithdrawalsController],
})
export class WithdrawalsModule {}
