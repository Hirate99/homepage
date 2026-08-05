# Personal Homepage

A personal space for the music I love, the photographs I take, and the places I remember. Scroll through the visuals, then explore my photo collections on the globe.

## Features

- Song-driven landing scenes with `orange-day` and `rain` visual themes
- Three.js lyrics environments and a lazily loaded interactive globe
- Photography collections with image, cover, ordering, and location metadata
- Cover aspect-ratio selection, randomized collection ordering, and optional Upstash Redis caching
- Private admin workspace for creating, editing, and deleting collections and images
- WebP conversion, EXIF GPS extraction, and Google Places location lookup

Use the `song` query parameter to select a landing theme:

```text
/?song=orange-day
/?song=rain
```

When the parameter is missing or invalid, the server selects a theme at random.

## Tech Stack

- Next.js 16, React 19, and TypeScript
- Tailwind CSS, Framer Motion, and Radix UI
- Three.js and react-globe.gl
- Prisma and Cloudflare D1
- Cloudflare R2 and Upstash Redis
- OpenNext for Cloudflare and Wrangler
- Bun workspaces

## Project Structure

```text
.
├─ src/                         # Public homepage
│  ├─ app/                     # Next.js App Router
│  ├─ components/home/         # Hero, song themes, lyrics scenes, and globe
│  └─ lib/                     # D1, Redis, and collection queries
├─ packages/
│  ├─ admin/                   # Private collection editor
│  └─ home-data/               # Shared data, image, and location services
├─ prisma/                     # Prisma schema
├─ migrations/                 # Wrangler D1 migrations
├─ scripts/                    # Texture generation, migration, and backfills
├─ public/images/atlas/        # Globe textures and source notes
├─ open-next.config.ts         # Runtime adapter configuration
└─ wrangler.toml               # Runtime configuration
```

## Local Development

### Prerequisites

- [Bun](https://bun.com/) 1.3 or later

Install dependencies:

```bash
bun install
```

Start the public site:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Local D1 data is stored under `.wrangler/`, which is ignored by Git.

### Admin App

Run the admin workspace separately:

```bash
bun run admin:dev
```

Open [http://127.0.0.1:3001](http://127.0.0.1:3001). Access to connected services requires maintainer-provided local configuration.

## Configuration

Use the checked-in example files for non-sensitive local defaults. Keep credentials in ignored local files or the platform's secret store. Production domains, resource identifiers, access policies, environment mappings, and deployment procedures are intentionally documented outside this public repository.

## Scripts

| Command               | Description                         |
| --------------------- | ----------------------------------- |
| `bun run dev`         | Start the public development server |
| `bun run admin:dev`   | Start the local admin workspace     |
| `bun run build`       | Build the public application        |
| `bun run admin:build` | Build the admin application         |
| `bun run lint`        | Run ESLint                          |

## Operations

Database maintenance, remote resources, deployment targets, and private access configuration are maintained in internal runbooks. Ask a maintainer before running any command against a shared environment.

## Asset Sources

The globe textures are generated from NASA Earth Observatory Blue Marble imagery. See [`public/images/atlas/SOURCES.md`](public/images/atlas/SOURCES.md) for source links and regeneration details.

## License

[MIT](LICENSE)
