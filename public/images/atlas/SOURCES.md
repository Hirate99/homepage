# Atlas texture sources

The generated globe textures in this directory use NASA Earth Observatory's
Blue Marble: Next Generation imagery:

- `earth-california-*.webp` and `earth-rain-*.webp` derive from the July 2004
  global base map:
  https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/
  https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x5400x2700.jpg
- `earth-elevation-2k.webp` derives from the global topography map:
  https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/topography-bathymetry-maps/
  https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_5400x2700.jpg

Run `bun run atlas:textures` from the repository root to regenerate the
optimized WebP assets. The generator converts the satellite image into
theme-specific duotone relief maps while preserving one shared elevation map.
