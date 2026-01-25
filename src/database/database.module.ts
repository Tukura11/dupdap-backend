import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DatabaseHealthIndicator } from './health.indicator';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', ''),
        database: configService.get('DB_NAME', 'dabdub_dev'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        logger: 'advanced-console',
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: false,
        dropSchema: false,
        poolSize: configService.get('DB_POOL_SIZE', 10),
        maxQueryExecutionTime: 30000,
        ssl:
          configService.get('NODE_ENV') === 'production'
            ? {
                rejectUnauthorized: false,
              }
            : false,
        extra: {
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          max: configService.get<number>('DB_POOL_SIZE', 10),
          statement_timeout: 30000,
        },
      }),
    }),
  ],
  providers: [DatabaseHealthIndicator],
  exports: [DatabaseHealthIndicator],
})
export class DatabaseModule {}
