import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { StellarController } from './stellar.controller';
import { ConfigModule } from '@nestjs/config';
import { WalletEntity } from '../database/entities/wallet.entity';
import { UserEntity } from '../database/entities/user.entity';
import { SorobanService } from './soroban.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([WalletEntity, UserEntity])],
  providers: [StellarService, SorobanService],
  controllers: [StellarController],
  exports: [StellarService, SorobanService],
})
export class StellarModule {}
