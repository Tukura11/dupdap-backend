import { Injectable, Logger, BadRequestException, ConflictException, TooManyRequestsException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { REDIS_CLIENT } from '../cache/redis.module';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { DISPOSABLE_DOMAINS } from '../config/disposable-domains';

export const WAITLIST_FRAUD_QUEUE = 'waitlist-fraud';
export const WAITLIST_FRAUD_CHECK_JOB = 'waitlist-fraud-check';

export interface WaitlistFraudContext {
  ip: string;
  userAgent?: string;
  fingerprint?: string;
  timestamp: Date;
  referralCode?: string;
}

export interface WaitlistFraudResult {
  passed: boolean;
  rule?: string;
  message?: string;
  rank?: number;
}

export interface WaitlistFraudLogEntry {
  rule: string;
  ip: string;
  email?: string;
  referralCode?: string;
  userAgent?: string;
  fingerprint?: string;
  blocked: boolean;
  message: string;
  timestamp: Date;
}

@Injectable()
export class WaitlistFraudService {
  private readonly logger = new Logger(WaitlistFraudService.name);

  constructor(
    @InjectRepository(WaitlistEntry)
    private readonly repo: Repository<WaitlistEntry>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    @InjectQueue(WAITLIST_FRAUD_QUEUE)
    private readonly fraudQueue: Queue<WaitlistFraudLogEntry>,
  ) {}

  /**
   * Run all fraud detection rules against a waitlist signup request
   */
  async check(
    dto: JoinWaitlistDto,
    context: WaitlistFraudContext,
  ): Promise<WaitlistFraudResult> {
    // Rule 1: IP rate limit (max 3 per IP per 24h)
    const ipRateResult = await this.checkIpRateLimit(context.ip);
    if (!ipRateResult.passed) {
      await this.logFraudAttempt({
        rule: 'IP_RATE_LIMIT',
        ip: context.ip,
        email: dto.email,
        referralCode: dto.referredByCode,
        userAgent: context.userAgent,
        fingerprint: context.fingerprint,
        blocked: true,
        message: ipRateResult.message!,
        timestamp: context.timestamp,
      });
      return ipRateResult;
    }

    // Rule 2: Disposable email detection
    const disposableEmailResult = await this.checkDisposableEmail(dto.email);
    if (!disposableEmailResult.passed) {
      await this.logFraudAttempt({
        rule: 'DISPOSABLE_EMAIL',
        ip: context.ip,
        email: dto.email,
        referralCode: dto.referredByCode,
        userAgent: context.userAgent,
        fingerprint: context.fingerprint,
        blocked: true,
        message: disposableEmailResult.message!,
        timestamp: context.timestamp,
      });
      return disposableEmailResult;
    }

    // Rule 3: Email domain velocity check (>20 same domain in 24h)
    const domainVelocityResult = await this.checkEmailDomainVelocity(dto.email);
    if (!domainVelocityResult.passed) {
      await this.logFraudAttempt({
        rule: 'DOMAIN_VELOCITY',
        ip: context.ip,
        email: dto.email,
        referralCode: dto.referredByCode,
        userAgent: context.userAgent,
        fingerprint: context.fingerprint,
        blocked: true,
        message: domainVelocityResult.message!,
        timestamp: context.timestamp,
      });
      return domainVelocityResult;
    }

    // Rule 4: Referral self-abuse detection (same IP as referrer)
    if (dto.referredByCode) {
      const referralAbuseResult = await this.checkReferralSelfAbuse(
        dto.referredByCode,
        context.ip,
      );
      if (!referralAbuseResult.passed) {
        await this.logFraudAttempt({
          rule: 'REFERRAL_SELF_ABUSE',
          ip: context.ip,
          email: dto.email,
          referralCode: dto.referredByCode,
          userAgent: context.userAgent,
          fingerprint: context.fingerprint,
          blocked: true,
          message: referralAbuseResult.message!,
          timestamp: context.timestamp,
        });
        return referralAbuseResult;
      }
    }

    // Rule 5: Bot detection (timing + user-agent)
    const botDetectionResult = await this.checkBotDetection(context);
    if (!botDetectionResult.passed) {
      await this.logFraudAttempt({
        rule: 'BOT_DETECTION',
        ip: context.ip,
        email: dto.email,
        referralCode: dto.referredByCode,
        userAgent: context.userAgent,
        fingerprint: context.fingerprint,
        blocked: true,
        message: botDetectionResult.message!,
        timestamp: context.timestamp,
      });
      return botDetectionResult;
    }

    // Rule 6: Duplicate email check with specific error and rank
    const duplicateEmailResult = await this.checkDuplicateEmail(dto.email);
    if (!duplicateEmailResult.passed) {
      await this.logFraudAttempt({
        rule: 'DUPLICATE_EMAIL',
        ip: context.ip,
        email: dto.email,
        referralCode: dto.referredByCode,
        userAgent: context.userAgent,
        fingerprint: context.fingerprint,
        blocked: true,
        message: duplicateEmailResult.message!,
        timestamp: context.timestamp,
      });
      return duplicateEmailResult;
    }

    return { passed: true };
  }

  /**
   * Rule 1: IP rate limit (max 3 per IP per 24h)
   */
  private async checkIpRateLimit(ip: string): Promise<WaitlistFraudResult> {
    const ipKey = `waitlist:fraud:ip:${ip}:${new Date().toISOString().split('T')[0]}`;
    const ipCount = await this.redis.incr(ipKey);
    
    if (ipCount === 1) {
      await this.redis.expire(ipKey, 86400); // 24h TTL
    }
    
    const MAX_PER_IP = 3;
    if (ipCount > MAX_PER_IP) {
      return {
        passed: false,
        rule: 'IP_RATE_LIMIT',
        message: 'Too many signups from this IP address (max 3 per 24 hours)',
      };
    }
    
    return { passed: true };
  }

  /**
   * Rule 2: Disposable email detection
   */
  private async checkDisposableEmail(email: string): Promise<WaitlistFraudResult> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && DISPOSABLE_DOMAINS.has(domain)) {
      return {
        passed: false,
        rule: 'DISPOSABLE_EMAIL',
        message: 'Disposable email addresses are not allowed',
      };
    }
    return { passed: true };
  }

  /**
   * Rule 3: Email domain velocity check (>20 same domain in 24h)
   */
  private async checkEmailDomainVelocity(email: string): Promise<WaitlistFraudResult> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return { passed: true };

    const domainKey = `waitlist:fraud:domain:${domain}:${new Date().toISOString().split('T')[0]}`;
    const domainCount = await this.redis.incr(domainKey);
    
    if (domainCount === 1) {
      await this.redis.expire(domainKey, 86400); // 24h TTL
    }
    
    const MAX_PER_DOMAIN = 20;
    if (domainCount > MAX_PER_DOMAIN) {
      return {
        passed: false,
        rule: 'DOMAIN_VELOCITY',
        message: `Too many signups from ${domain} domain (max 20 per 24 hours)`,
      };
    }
    
    return { passed: true };
  }

  /**
   * Rule 4: Referral self-abuse detection (same IP as referrer)
   */
  private async checkReferralSelfAbuse(
    referralCode: string,
    ip: string,
  ): Promise<WaitlistFraudResult> {
    const referrer = await this.repo.findOne({ 
      where: { referralCode },
      select: ['id', 'ipAddress'],
    });
    
    if (referrer && referrer.ipAddress === ip) {
      return {
        passed: false,
        rule: 'REFERRAL_SELF_ABUSE',
        message: 'Cannot use your own referral code (same IP detected)',
      };
    }
    
    return { passed: true };
  }

  /**
   * Rule 5: Bot detection (timing + user-agent)
   */
  private async checkBotDetection(context: WaitlistFraudContext): Promise<WaitlistFraudResult> {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /node/i,
      /java/i,
      /go-http/i,
    ];

    const userAgent = context.userAgent?.toLowerCase() || '';
    const isSuspiciousUA = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    
    // Check for rapid successive requests from same IP
    const timingKey = `waitlist:fraud:timing:${context.ip}`;
    const now = Date.now();
    const recentRequests = await this.redis.zrangebyscore(
      timingKey,
      now - 5000, // Last 5 seconds
      now,
    );
    
    // Add current request timestamp
    await this.redis.zadd(timingKey, now, now.toString());
    await this.redis.expire(timingKey, 60); // Keep for 1 minute
    
    if (recentRequests.length >= 3 || isSuspiciousUA) {
      return {
        passed: false,
        rule: 'BOT_DETECTION',
        message: 'Suspicious activity detected - please try again later',
      };
    }
    
    return { passed: true };
  }

  /**
   * Rule 6: Duplicate email check with specific error and rank
   */
  private async checkDuplicateEmail(email: string): Promise<WaitlistFraudResult> {
    const existing = await this.repo.findOne({ 
      where: { email: email.toLowerCase() },
      select: ['id', 'points', 'referralCode'],
    });
    
    if (existing) {
      // Calculate rank
      const totalEntries = await this.repo.count();
      const rank = await this.repo
        .createQueryBuilder('w')
        .where('w.points > :points', { points: existing.points })
        .getCount() + 1;
      
      return {
        passed: false,
        rule: 'DUPLICATE_EMAIL',
        message: `This email is already on the waitlist at rank #${rank}`,
        rank,
      };
    }
    
    return { passed: true };
  }

  /**
   * Log fraud attempt for audit trail
   */
  private async logFraudAttempt(entry: WaitlistFraudLogEntry): Promise<void> {
    // Store in Redis for quick access
    const logKey = `waitlist:fraud:logs:${new Date().toISOString().split('T')[0]}`;
    await this.redis.lpush(logKey, JSON.stringify(entry));
    await this.redis.expire(logKey, 86400 * 30); // Keep for 30 days

    // Also enqueue for persistent storage
    await this.fraudQueue.add('log-fraud-attempt', entry, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.warn(
      `Fraud attempt blocked: rule="${entry.rule}" ip="${entry.ip}" email="${entry.email}" message="${entry.message}"`,
    );
  }

  /**
   * Get fraud logs for admin interface
   */
  async getFraudLogs(
    page: number = 1,
    limit: number = 20,
    rule?: string,
    ip?: string,
    date?: string,
  ): Promise<{
    data: WaitlistFraudLogEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    const logKey = date 
      ? `waitlist:fraud:logs:${date}`
      : `waitlist:fraud:logs:${new Date().toISOString().split('T')[0]}`;
    
    const allLogs = await this.redis.lrange(logKey, 0, -1);
    const parsedLogs = allLogs.map(log => JSON.parse(log) as WaitlistFraudLogEntry);
    
    // Filter by rule and IP if provided
    let filteredLogs = parsedLogs;
    if (rule) {
      filteredLogs = filteredLogs.filter(log => log.rule === rule);
    }
    if (ip) {
      filteredLogs = filteredLogs.filter(log => log.ip === ip);
    }
    
    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Pagination
    const total = filteredLogs.length;
    const startIndex = (page - 1) * limit;
    const data = filteredLogs.slice(startIndex, startIndex + limit);
    
    return { data, total, page, limit };
  }

  /**
   * Reset IP rate limit (admin function)
   */
  async resetIpRateLimit(ip: string, date?: string): Promise<void> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const ipKey = `waitlist:fraud:ip:${ip}:${targetDate}`;
    await this.redis.unlink(ipKey);
    
    this.logger.log(`IP rate limit reset for ${ip} on ${targetDate}`);
  }
}
