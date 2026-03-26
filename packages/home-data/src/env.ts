import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';

let envLoaded = false;
const DEFAULT_R2_BUCKET = 'msk-bucket-1';
const DEFAULT_R2_ENDPOINT =
  'https://86b08c843d8f0d3d7a372bb34d945a5c.r2.cloudflarestorage.com';

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  dotenv.config({
    path: filePath,
    override: false,
  });
}

export function ensureEnvLoaded() {
  if (envLoaded) {
    return;
  }

  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, '.env.local'),
    path.join(cwd, '.env'),
    path.join(cwd, '..', '.env.local'),
    path.join(cwd, '..', '.env'),
    path.join(cwd, '..', '..', '.env.local'),
    path.join(cwd, '..', '..', '.env'),
  ];

  for (const candidate of candidates) {
    loadEnvFile(candidate);
  }

  envLoaded = true;
}

function requireEnv(name: string) {
  ensureEnvLoaded();
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string) {
  ensureEnvLoaded();
  return process.env[name];
}

export function getDatabaseEnv() {
  return {
    accountId: requireEnv('CLOUDFLARE_ACCOUNT_ID'),
    databaseId: requireEnv('CLOUDFLARE_DATABASE_ID'),
    token: requireEnv('CLOUDFLARE_D1_TOKEN'),
  };
}

export function getRedisEnv() {
  const url = optionalEnv('UPSTASH_REDIS_REST_URL');
  const token = optionalEnv('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) {
    return null;
  }

  return { url, token };
}

export function getGoogleMapsApiKey() {
  return optionalEnv('GOOGLE_MAP_API_KEY') ?? null;
}

export function getR2Env() {
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
  const bucket =
    optionalEnv('R2_BUCKET') ??
    optionalEnv('R2_BUCKET_NAME') ??
    DEFAULT_R2_BUCKET;

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: optionalEnv('R2_ENDPOINT') ?? DEFAULT_R2_ENDPOINT,
    publicBaseUrl:
      optionalEnv('R2_PUBLIC_BASE_URL') ?? 'https://r2.mskyurina.top',
  };
}
