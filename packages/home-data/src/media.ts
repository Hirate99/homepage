import path from 'node:path';

import sharp from 'sharp';

import type { UploadedImageInput } from './types';

export interface ProcessedImage {
  keyBase: string;
  output: Buffer;
  width: number | null;
  height: number | null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function convertImageToWebp(
  image: UploadedImageInput,
): Promise<ProcessedImage> {
  const baseName = path.parse(image.name).name || 'image';
  const { data, info } = await sharp(image.buffer)
    .rotate()
    .webp({
      quality: 88,
      effort: 5,
    })
    .toBuffer({ resolveWithObject: true });

  return {
    keyBase: slugify(baseName) || 'image',
    output: data,
    width: typeof info.width === 'number' ? info.width : null,
    height: typeof info.height === 'number' ? info.height : null,
  };
}
