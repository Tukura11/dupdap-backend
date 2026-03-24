<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Project setup

```bash
pnpm install
cp .env.example .env   # fill in your values
```

## Compile and run

```bash
pnpm start:dev     # watch mode
pnpm start:prod    # production (runs migrations automatically on boot)
```

## Run tests

```bash
pnpm test                                                    # unit tests
pnpm test --testPathPattern=database.integration             # integration (needs DB)
pnpm test:e2e
pnpm test:cov
```

---

## Database, Migrations & Seeding

### How the connection is configured

`DatabaseModule` (`src/database/database.module.ts`) owns the single TypeORM root
connection. It is imported once, in `AppModule`. Configuration is injected via the
typed `databaseConfig` and `appConfig` tokens — no raw `process.env` access outside
of `src/database/data-source.ts`.

Key connection options:

| Option | Value |
|---|---|
| `synchronize` | `false` always — schema changes via migrations only |
| `migrationsRun` | `true` **in production only** — app self-migrates on startup |
| `autoLoadEntities` | `true` — entities registered via `forFeature()` are auto-discovered |
| `logging` | `['query','error','warn']` in development, `['error']` elsewhere |

### Adding a new module with TypeORM entities

Every feature module must register its entities with `TypeOrmModule.forFeature()`:

```typescript
// src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentFee } from './entities/payment-fee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentFee])],
  // ...
})
export class PaymentsModule {}
```

Repositories are then injectable in services:

```typescript
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
  ) {}
}
```

**Never** register entities directly in `DatabaseModule` or `AppModule`.

### Migration workflow

All migrations live in `src/database/migrations/`.
The TypeORM CLI uses `src/database/data-source.ts` as its DataSource.

```bash
# 1. After creating or modifying entities, generate a migration:
pnpm migration:generate src/database/migrations/DescriptiveMigrationName

# 2. Review the generated file, then apply:
pnpm migration:run

# 3. Roll back the last migration if needed:
pnpm migration:revert
```

In **production**, `migrationsRun: true` means all pending migrations run
automatically when the application starts. You do **not** need to run the CLI manually
in production — just deploy and start.

### Environment variables for the database

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | — | PostgreSQL hostname |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | — | Database user |
| `DB_PASS` | — | Database password |
| `DB_NAME` | — | Database name |

### Seeding

The seed script is idempotent — safe to run multiple times without creating
duplicate rows. Users are matched by email (check before insert); tier configs
and fee configs are upserted by their unique key.

```bash
pnpm seed:run
```

What the seed creates:

| Type | Key | Notes |
|---|---|---|
| User | `admin@system.local` | `isAdmin = true`; password via `SEED_ADMIN_PASSWORD` env var |
| User | `treasury@system.local` | `isTreasury = true`; collects platform fees |
| TierConfig | Silver | `feeMultiplier = 1.00`, daily limit 1 000, monthly 10 000 |
| TierConfig | Gold | `feeMultiplier = 0.80` (20 % discount), daily 5 000, monthly 50 000 |
| TierConfig | Black | `feeMultiplier = 0.50` (50 % discount), daily 50 000, monthly 500 000 |
| FeeConfig | transfer | 1 % base rate |
| FeeConfig | withdrawal | 2 % base rate |
| FeeConfig | deposit | 0 % (free) |

Override seed credentials via environment variables:

```
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=YourSecurePassword
SEED_TREASURY_EMAIL=treasury@example.com
SEED_TREASURY_PASSWORD=YourSecurePassword
```

### Integration test

The integration test (`src/database/database.integration.spec.ts`) connects to a
**real** PostgreSQL database, drops and rebuilds the schema, runs all migrations,
seeds, and asserts every expected table and row exists.

```bash
# Use a dedicated test database to avoid clobbering dev data:
DB_NAME=dabdub_test pnpm test --testPathPattern=database.integration
```

---

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
