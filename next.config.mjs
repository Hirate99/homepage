import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', '.prisma/client'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.mskyurina.top',
      },
    ],
  },

  turbopack: {
    rules: {
      '*.md': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },

  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      // This is the asset module.
      type: 'asset/source',
    });
    return config;
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
