import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionService } from './transactions.service';
import { TransactionController } from './transactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction])],
  providers: [TransactionService],
  controllers: [TransactionController],
  exports: [TransactionService],
})
export class TransactionModule {}
