import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import { redisConfig } from '../config/redis.config';

const NGN_TO_USDC_RATE_KEY = 'rates:NGN_USDC';
const RATE_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class RatesService {
  private readonly logger = new Logger(RatesService.name);
  private readonly redis: Redis;

  constructor(
    private readonly httpService: HttpService,
    @Inject(redisConfig.KEY)
    redisCfg: ConfigType<typeof redisConfig>,
  ) {
    this.redis = new Redis({
      host: redisCfg.host,
      port: redisCfg.port,
      password: redisCfg.password,
    });
    this.redis.on('error', (err: Error) =>
      this.logger.warn(`Rates Redis error: ${err.message}`),
    );

    // Start periodic rate updates
    this.startRateUpdates();
  }

  async getNgnToUsdcRate(): Promise<number> {
    const cached = await this.redis.get(NGN_TO_USDC_RATE_KEY);
    if (cached) {
      return parseFloat(cached);
    }

    // Fallback rate if no cached value
    return 0.00065;
  }

  async convertNgnToUsdc(ngnAmount: number): Promise<number> {
    const rate = await this.getNgnToUsdcRate();
    return parseFloat((ngnAmount * rate).toFixed(6));
  }

  private async startRateUpdates(): Promise<void> {
    // Initial update
    await this.updateRate();

    // Periodic updates
    setInterval(() => {
      this.updateRate().catch((err) =>
        this.logger.error(`Failed to update NGN/USDC rate: ${err.message}`),
      );
    }, RATE_UPDATE_INTERVAL_MS);
  }

  private async updateRate(): Promise<void> {
    try {
      // This is a placeholder — replace with actual rate API
      // For example, from CoinGecko, CoinMarketCap, or a forex API
      const response = await firstValueFrom(
        this.httpService.get('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=ngn'),
      );

      const rate = response.data['usd-coin']['ngn'];
      if (rate) {
        const usdcToNgn = 1 / rate; // Invert to get NGN to USDC
        await this.redis.set(NGN_TO_USDC_RATE_KEY, usdcToNgn.toString());
        this.logger.log(`Updated NGN/USDC rate: ${usdcToNgn}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch NGN/USDC rate: ${error.message}`);
    }
  }
}