import { registerAs } from '@nestjs/config';

export interface StellarConfig {
  network: 'testnet' | 'mainnet';
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string;
  adminSecretKey: string;
}

export const stellarConfig = registerAs(
  'stellar',
  (): StellarConfig => ({
    network:
      (process.env['STELLAR_NETWORK'] as
        | StellarConfig['network']
        | undefined) ?? 'testnet',
    rpcUrl: process.env['STELLAR_RPC_URL']!,
    networkPassphrase: process.env['STELLAR_NETWORK_PASSPHRASE']!,
    contractId: process.env['STELLAR_CONTRACT_ID']!,
    adminSecretKey: process.env['STELLAR_ADMIN_SECRET_KEY']!,
  }),
);
