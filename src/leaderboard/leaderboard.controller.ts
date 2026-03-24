import { Controller, Get, Query, Req } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardResponseDto } from './dto/leaderboard-response.dto';
import { Request } from 'express';

type NamespaceParam = 'waitlist' | 'users';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * GET /leaderboard?namespace=waitlist|users
   * Returns top 100 (cached, 30s TTL) + current user's rank if authenticated.
   * Current user is read from req.user.id if a JWT guard is applied at the app level.
   */
  @Get()
  async getLeaderboard(
    @Query('namespace') namespace: NamespaceParam = 'users',
    @Req() req: Request,
  ): Promise<LeaderboardResponseDto> {
    const entries = await this.leaderboardService.getTop100Cached(namespace);

    // req.user is populated by a JWT/auth guard if one is active globally or on this route.
    // Cast loosely so the module stays decoupled from the auth module.
    const userId: string | undefined = (req as any).user?.id;
    const currentUserRank = userId
      ? await this.leaderboardService.getRank(userId, namespace)
      : null;

    return { entries, currentUserRank };
  }
}
