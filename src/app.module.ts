import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule, appConfig, databaseConfig, redisConfig } from './config';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Config — global, validates all env vars on startup
    AppConfigModule,

    // TypeORM — injecting typed DatabaseConfig
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY, appConfig.KEY],
      useFactory: (db: ConfigType<typeof databaseConfig>, app: ConfigType<typeof appConfig>) => ({
        type: 'postgres',
        host: db.host,
        port: db.port,
        username: db.user,
        password: db.pass,
        database: db.name,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: false,
        migrationsRun: app.nodeEnv === 'production',
        logging: app.nodeEnv === 'development',
      }),
    }),

    // Bull — injecting typed RedisConfig
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (redis: ConfigType<typeof redisConfig>) => ({
        redis: {
          host: redis.host,
          port: redis.port,
          password: redis.password,
        },
      }),
    }),

    // Throttler — injecting typed AppConfig
    ThrottlerModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (app: ConfigType<typeof appConfig>) => ({
        throttlers: [
          {
            ttl: app.throttleTtl * 1000,
            limit: app.throttleLimit,
          },
        ],
      }),
    }),

    HealthModule,
  ],
})
export class AppModule {}
