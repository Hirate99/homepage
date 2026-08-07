import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@homepage/home-data'],
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, '..', '..'),
};

export default nextConfig;
