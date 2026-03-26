import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule, appConfig, redisConfig } from './config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { SorobanModule } from './soroban/soroban.module';

@Module({
  imports: [
    // 1. Config — global, validates all env vars at startup with abortEarly: false.
    AppConfigModule,

    // 2. Database — owns the TypeORM root connection; see database.module.ts.
    DatabaseModule,

    // 3. Bull — async Redis connection via typed RedisConfig.
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

    // 4. Throttler — rate limiting via typed AppConfig.
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
    SorobanModule,
  ],
})
export class AppModule {}
