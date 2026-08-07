import type { HomeDataRuntime } from './runtime';
import type { UploadedImageInput } from './types';

const CLOUDFLARE_IMAGE_INPUT_LIMIT = 20 * 1024 * 1024;

export interface ProcessedImage {
  keyBase: string;
  output: Buffer;
  width: number | null;
  height: number | null;
}

export async function convertImageToWebp(
  image: UploadedImageInput,
  runtime: HomeDataRuntime,
): Promise<ProcessedImage> {
  if (image.buffer.byteLength > CLOUDFLARE_IMAGE_INPUT_LIMIT) {
    throw new Error(
      "This image is over Cloudflare's 20 MB processing limit. Remove it, add it again, and the studio will optimize it before upload.",
    );
  }

  const metadataStream = new Response(image.buffer)
    .body! as unknown as Parameters<
    HomeDataRuntime['imageProcessor']['info']
  >[0];
  const inputStream = new Response(image.buffer).body! as unknown as Parameters<
    HomeDataRuntime['imageProcessor']['input']
  >[0];
  const metadata = await runtime.imageProcessor.info(metadataStream);
  const transformed = await runtime.imageProcessor.input(inputStream).output({
    format: 'image/webp',
    quality: 88,
    anim: false,
  });
  const output = Buffer.from(
    await new Response(
      transformed.image() as unknown as BodyInit,
    ).arrayBuffer(),
  );

  return {
    keyBase: image.name,
    output,
    width: 'width' in metadata ? metadata.width : null,
    height: 'height' in metadata ? metadata.height : null,
  };
}
