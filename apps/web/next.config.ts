import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@midnight-ntwrk/compact-runtime',
    '@midnight-ntwrk/onchain-runtime-v3',
  ],
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@casp-core': path.resolve(__dirname, '../../src'),
      '#kyc-harness': path.resolve(
        __dirname,
        '../../compact/managed/kyc-harness/contract/index.js',
      ),
    };
    return config;
  },
};

export default nextConfig;
