/**
 * Centralized Redis key naming conventions.
 * All keys are used with the configured keyPrefix (e.g. dabdub:).
 */
export const RedisKeys = {
  // Auth
  refreshToken: (adminId: string, tokenId: string) =>
    `auth:refresh:${adminId}:${tokenId}`,
  adminSessions: (adminId: string) => `auth:sessions:${adminId}`,
  loginAttempts: (email: string) => `auth:attempts:${email}`,
  accountLockout: (email: string) => `auth:lockout:${email}`,

  // Cache
  merchantList: (hash: string) => `cache:merchants:${hash}`,
  merchantDetail: (id: string) => `cache:merchant:${id}`,
  dashboardOverview: (period: string) => `cache:dashboard:${period}`,

  // Rate limiting
  rateLimit: (key: string) => `ratelimit:${key}`,
};
