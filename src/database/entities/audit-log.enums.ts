export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  EXPORT = 'export',
  SANDBOX_RESET = 'sandbox_reset',
  TREASURY_WHITELIST_ADDRESS_ADDED = 'treasury_whitelist_address_added',
  TREASURY_WHITELIST_ADDRESS_REMOVED = 'treasury_whitelist_address_removed',
  TREASURY_WITHDRAWAL_REQUESTED = 'treasury_withdrawal_requested',
  TREASURY_WITHDRAWAL_APPROVED = 'treasury_withdrawal_approved',
  TREASURY_WITHDRAWAL_REJECTED = 'treasury_withdrawal_rejected',
}

export enum ActorType {
  USER = 'user',
  ADMIN = 'admin',
  SYSTEM = 'system',
  API_KEY = 'api_key',
  SERVICE_ACCOUNT = 'service_account',
}

export enum DataClassification {
  SENSITIVE = 'sensitive',
  NORMAL = 'normal',
  PUBLIC = 'public',
}
