# Personal Homepage

A personal space for the music I love, the photographs I take, and the places I remember. Scroll through the visuals, then explore my photo collections on the globe.

## Features

- Song-driven landing scenes with `orange-day` and `rain` visual themes
- Three.js lyrics environments and a lazily loaded interactive globe
- Photography collections backed by Cloudflare D1 and images served through R2/CDN
- Cover aspect-ratio selection, randomized collection ordering, and optional Upstash Redis caching
- Cloudflare-hosted admin app for creating, editing, and deleting collections and images
- WebP conversion, EXIF GPS extraction, and Google Places location lookup
- OpenNext deployment to separate preview and production Cloudflare Workers

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
│  ├─ admin/                   # Local admin app on port 3001
│  └─ home-data/               # Shared data, image, and location services
├─ prisma/                     # Prisma schema
├─ migrations/                 # Wrangler D1 migrations
├─ scripts/                    # Texture generation, migration, and backfills
├─ public/images/atlas/        # Globe textures and source notes
├─ open-next.config.ts         # OpenNext configuration
└─ wrangler.toml               # Cloudflare Worker and D1 bindings
```

## Local Development

### Prerequisites

- [Bun](https://bun.com/) 1.3 or later
- Cloudflare credentials with access to the configured D1 database and R2 bucket when using remote resources or deploying

Install dependencies:

```bash
bun install
```

Apply the D1 migrations to the local database:

```bash
bunx wrangler d1 migrations apply homepage --local
```

Start the public site:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Local D1 data is stored under `.wrangler/`, which is ignored by Git.

### Admin App

Log in to Wrangler so the admin app can use the configured remote D1 and R2 bindings, then run:

```bash
bun run admin:dev
```

Open [http://127.0.0.1:3001](http://127.0.0.1:3001). The production admin is deployed at [admin.mskyurina.top](https://admin.mskyurina.top) and protected by Cloudflare Access. Local development still relies on loopback binding instead of application-level authentication.

## Environment Variables

Keep sensitive values in an uncommitted `.env.local`, `.env`, or Cloudflare secrets. `.dev.vars.example` contains only the non-sensitive example value used by local development.

| Variable                       | Purpose                                   | Requirement                                      |
| ------------------------------ | ----------------------------------------- | ------------------------------------------------ |
| `CLOUDFLARE_ACCOUNT_ID`        | Cloudflare account ID                     | Required by remote maintenance scripts           |
| `CLOUDFLARE_DATABASE_ID`       | D1 database ID                            | Required by remote maintenance scripts           |
| `CLOUDFLARE_D1_TOKEN`          | D1 API token                              | Required by remote maintenance scripts           |
| `R2_ACCESS_KEY_ID`             | R2 S3 access key                          | Required by legacy or remote maintenance scripts |
| `R2_SECRET_ACCESS_KEY`         | R2 S3 secret key                          | Required by legacy or remote maintenance scripts |
| `R2_BUCKET` / `R2_BUCKET_NAME` | R2 bucket name                            | Optional; the code provides a default            |
| `R2_ENDPOINT`                  | R2 S3 endpoint                            | Optional; the code provides a default            |
| `R2_PUBLIC_BASE_URL`           | Public image base URL                     | Optional; the code provides a default            |
| `GOOGLE_MAP_API_KEY`           | Places, Place Details, and Geocoding APIs | Optional; EXIF coordinates still work without it |
| `UPSTASH_REDIS_REST_URL`       | Upstash REST URL                          | Optional collection cache                        |
| `UPSTASH_REDIS_REST_TOKEN`     | Upstash REST token                        | Optional collection cache                        |
| `DATABASE_URL`                 | Legacy Neon PostgreSQL connection string  | Used only by `scripts/migrate.mjs`               |

## Scripts

| Command                                              | Description                                             |
| ---------------------------------------------------- | ------------------------------------------------------- |
| `bun run dev`                                        | Start the public development server                     |
| `bun run admin:dev`                                  | Start the local admin app                               |
| `bun run admin:build`                                | Create the OpenNext Cloudflare admin build              |
| `bun run admin:deploy`                               | Deploy the `homepage-admin` Worker                      |
| `bun run build`                                      | Generate Prisma Client and build the Next.js app        |
| `bun run lint`                                       | Run ESLint                                              |
| `bun run cf:build`                                   | Create the OpenNext Cloudflare build                    |
| `bun run preview`                                    | Build and locally preview the preview Worker            |
| `bun run preview:production`                         | Build and locally preview the production Worker         |
| `bun run deploy:preview`                             | Deploy the `homepage-preview` Worker                    |
| `bun run deploy:production`                          | Deploy the `homepage` Worker                            |
| `bun run cf-typegen`                                 | Regenerate Cloudflare types from Wrangler configuration |
| `bun run atlas:textures`                             | Regenerate the optimized WebP globe textures            |
| `bun run backfill:image-dimensions -- --dry-run`     | Preview the image-dimension backfill                    |
| `bun run backfill:collection-locations -- --dry-run` | Preview the collection-location backfill                |

## Database and Deployment

D1 migrations live in `migrations/`. Apply pending migrations to the remote production database with:

```bash
bunx wrangler d1 migrations apply homepage --remote --env production
```

Build and preview the production Worker before deployment:

```bash
bun run cf:build
bun run preview:production
```

Deploy to production:

```bash
bun run deploy:production
```

Deploy the admin Worker and its `admin.mskyurina.top` custom domain:

```bash
bun run admin:deploy
```

The admin Worker uses native D1, R2, and Cloudflare Images bindings. Image inputs are limited to 20 MB before conversion to WebP. Access policy and identity-provider configuration remain in the Cloudflare Zero Trust dashboard rather than this repository.

The `preview` and `production` environments use different Worker names, but `wrangler.toml` currently binds both environments to the same D1 database. Separate the preview database before running tests that should not modify production data.

## Asset Sources

The globe textures are generated from NASA Earth Observatory Blue Marble imagery. See [`public/images/atlas/SOURCES.md`](public/images/atlas/SOURCES.md) for source links and regeneration details.

## License

[MIT](LICENSE)
