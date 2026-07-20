import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import sharp from 'sharp';

const outputDirectory = join(process.cwd(), 'public', 'images', 'atlas');
const sourceDirectory = join(process.cwd(), '.atlas-texture-sources');

const sources = {
  surface:
    'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x5400x2700.jpg',
  elevation:
    'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_5400x2700.jpg',
};

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download ${url}: ${response.status}`);
  }

  await Bun.write(destination, await response.arrayBuffer());
}

async function makeSurface(sourcePath, width, palette, destination) {
  const { data, info } = await sharp(sourcePath)
    .resize(width, width / 2, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .grayscale()
    .normalise({ lower: 1, upper: 99 })
    .sharpen({ sigma: 0.55 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const duotone = Buffer.alloc(info.width * info.height * 3);
  for (let input = 0, output = 0; input < data.length; input += 1) {
    const mix = Math.pow(data[input] / 255, 0.72);
    for (let channel = 0; channel < 3; channel += 1) {
      duotone[output] = Math.round(
        palette.shadow[channel] * (1 - mix) + palette.light[channel] * mix,
      );
      output += 1;
    }
  }

  await sharp(duotone, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .webp({ effort: 6, quality: 86, smartSubsample: true })
    .toFile(destination);
}

async function makeElevation(sourcePath, destination) {
  await sharp(sourcePath)
    .resize(2048, 1024, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    })
    .grayscale()
    .normalise({ lower: 0, upper: 99.5 })
    .webp({ effort: 6, quality: 88, smartSubsample: true })
    .toFile(destination);
}

await mkdir(outputDirectory, { recursive: true });
await mkdir(sourceDirectory, { recursive: true });

const surfaceSource = join(sourceDirectory, 'blue-marble-july.jpg');
const elevationSource = join(sourceDirectory, 'gebco-elevation.jpg');

try {
  await Promise.all([
    download(sources.surface, surfaceSource),
    download(sources.elevation, elevationSource),
  ]);

  await Promise.all([
    makeSurface(
      surfaceSource,
      4096,
      {
        shadow: [20, 54, 56],
        light: [244, 211, 157],
      },
      join(outputDirectory, 'earth-california-4k.webp'),
    ),
    makeSurface(
      surfaceSource,
      2048,
      {
        shadow: [20, 54, 56],
        light: [244, 211, 157],
      },
      join(outputDirectory, 'earth-california-2k.webp'),
    ),
    makeSurface(
      surfaceSource,
      4096,
      {
        shadow: [5, 22, 34],
        light: [145, 193, 198],
      },
      join(outputDirectory, 'earth-rain-4k.webp'),
    ),
    makeSurface(
      surfaceSource,
      2048,
      {
        shadow: [5, 22, 34],
        light: [145, 193, 198],
      },
      join(outputDirectory, 'earth-rain-2k.webp'),
    ),
    makeElevation(
      elevationSource,
      join(outputDirectory, 'earth-elevation-2k.webp'),
    ),
  ]);
} finally {
  await rm(sourceDirectory, { force: true, recursive: true });
}

console.log(`Atlas textures written to ${outputDirectory}`);
