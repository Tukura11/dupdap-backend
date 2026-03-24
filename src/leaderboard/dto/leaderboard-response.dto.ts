import { LeaderboardEntryDto } from './leaderboard-entry.dto';

export class LeaderboardResponseDto {
  entries: LeaderboardEntryDto[];
  currentUserRank: number | null;
}
