import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { IpBlockService } from './ip-block.service';
import { Roles } from '../rbac/decorators/roles.decorator';
import { Role } from '../rbac/rbac.types';
import { RolesGuard } from '../rbac/guards/roles.guard';

@Controller('admin/rate-limits')
@UseGuards(RolesGuard)
@Roles(Role.Admin, Role.SuperAdmin)
export class RateLimitAdminController {
  constructor(private readonly ipBlockService: IpBlockService) {}

  /**
   * GET /admin/rate-limits/blocked-ips
   * Returns list of all currently blocked IP addresses.
   */
  @Get('blocked-ips')
  async listBlockedIps(): Promise<{ blockedIps: string[] }> {
    const blockedIps = await this.ipBlockService.listBlockedIps();
    return { blockedIps };
  }

  /**
   * DELETE /admin/rate-limits/blocked-ips/:ip
   * Removes the block and clears the hit counter for the given IP.
   */
  @Delete('blocked-ips/:ip')
  async unblockIp(@Param('ip') ip: string): Promise<{ message: string }> {
    const isBlocked = await this.ipBlockService.isBlocked(ip);
    if (!isBlocked) {
      throw new NotFoundException(`IP ${ip} is not currently blocked`);
    }

    await this.ipBlockService.unblockIp(ip);
    return { message: `IP ${ip} has been unblocked` };
  }
}
