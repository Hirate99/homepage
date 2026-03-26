import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { getR2Env } from './env';

function getClient() {
  const env = getR2Env();

  return {
    env,
    client: new S3Client({
      region: 'auto',
      endpoint: env.endpoint,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
    }),
  };
}

export async function uploadWebpToR2(
  key: string,
  body: Buffer,
): Promise<string> {
  const { client, env } = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: env.bucket,
      Key: key,
      Body: body,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return `${env.publicBaseUrl.replace(/\/$/, '')}/${key}`;
}

export async function deleteObjectFromR2(key: string) {
  const { client, env } = getClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: env.bucket,
      Key: key,
    }),
  );
}
