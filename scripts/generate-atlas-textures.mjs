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

  return {
    data: duotone,
    width: info.width,
    height: info.height,
  };
}

function projectToWebMercator(source, width, height) {
  const destination = Buffer.alloc(width * width * 3);

  for (let targetY = 0; targetY < width; targetY += 1) {
    const normalizedY = (targetY + 0.5) / width;
    const latitude = Math.atan(Math.sinh(Math.PI * (1 - 2 * normalizedY)));
    const sourceY = ((Math.PI / 2 - latitude) / Math.PI) * height - 0.5;
    const topY = Math.max(0, Math.min(height - 1, Math.floor(sourceY)));
    const bottomY = Math.max(0, Math.min(height - 1, topY + 1));
    const mix = Math.max(0, Math.min(1, sourceY - topY));
    const topOffset = topY * width * 3;
    const bottomOffset = bottomY * width * 3;
    const targetOffset = targetY * width * 3;

    for (let x = 0; x < width * 3; x += 1) {
      destination[targetOffset + x] = Math.round(
        source[topOffset + x] * (1 - mix) + source[bottomOffset + x] * mix,
      );
    }
  }

  return destination;
}

async function makeSurfacePair({
  sourcePath,
  width,
  palette,
  globeDestination,
  mapDestination,
}) {
  const surface = await makeSurface(
    sourcePath,
    width,
    palette,
    globeDestination,
  );
  const mercator = projectToWebMercator(
    surface.data,
    surface.width,
    surface.height,
  );

  await sharp(mercator, {
    raw: { width, height: width, channels: 3 },
  })
    .webp({ effort: 6, quality: 84, smartSubsample: true })
    .toFile(mapDestination);
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
    makeSurfacePair({
      sourcePath: surfaceSource,
      width: 4096,
      palette: {
        shadow: [20, 54, 56],
        light: [244, 211, 157],
      },
      globeDestination: join(outputDirectory, 'earth-california-4k.webp'),
      mapDestination: join(
        outputDirectory,
        'earth-california-mercator-4k.webp',
      ),
    }),
    makeSurfacePair({
      sourcePath: surfaceSource,
      width: 2048,
      palette: {
        shadow: [20, 54, 56],
        light: [244, 211, 157],
      },
      globeDestination: join(outputDirectory, 'earth-california-2k.webp'),
      mapDestination: join(
        outputDirectory,
        'earth-california-mercator-2k.webp',
      ),
    }),
    makeSurfacePair({
      sourcePath: surfaceSource,
      width: 4096,
      palette: {
        shadow: [5, 22, 34],
        light: [145, 193, 198],
      },
      globeDestination: join(outputDirectory, 'earth-rain-4k.webp'),
      mapDestination: join(outputDirectory, 'earth-rain-mercator-4k.webp'),
    }),
    makeSurfacePair({
      sourcePath: surfaceSource,
      width: 2048,
      palette: {
        shadow: [5, 22, 34],
        light: [145, 193, 198],
      },
      globeDestination: join(outputDirectory, 'earth-rain-2k.webp'),
      mapDestination: join(outputDirectory, 'earth-rain-mercator-2k.webp'),
    }),
    makeElevation(
      elevationSource,
      join(outputDirectory, 'earth-elevation-2k.webp'),
    ),
  ]);
} finally {
  await rm(sourceDirectory, { force: true, recursive: true });
}

console.log(`Atlas textures written to ${outputDirectory}`);
