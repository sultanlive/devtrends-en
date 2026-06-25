# DevTrends EN — $0 Cloudflare content pipeline

Automated pipeline that scrapes articles from **devtrends.ru**, translates them
to English with an LLM, and publishes them on a fast, SEO-optimized custom
frontend. All infrastructure runs within Cloudflare free tiers (Workers, D1, R2,
Pages); the only cost is the LLM API (pennies).

```
apps/
  parser/   Cron Worker: sitemap discover -> scrape -> R2 media -> translate -> D1
  web/      Astro SSR site on Cloudflare Pages (reads D1, edge-cached)
```

- **Discovery:** `devtrends.ru/sitemap.xml` (+ `<lastmod>` diffing). No RSS.
- **Translation:** OpenAI-compatible Chat Completions, provider chosen by env
  (`OPENAI_BASE_URL` / `OPENAI_MODEL` / `OPENAI_API_KEY`) — swap OpenAI ⇄ DeepSeek
  ⇄ any compatible endpoint with no code change.
- **Rendering:** SSR on Pages + edge cache; parser purges cache on publish.

## Prerequisites

- Node 20+, a Cloudflare account, `npx wrangler login` once.
- An OpenAI-compatible API key.

## 1. Create Cloudflare resources

```bash
npm install

# D1 database — copy the printed database_id into BOTH wrangler.toml files
npx wrangler d1 create devtrends

# R2 bucket for re-hosted images
npx wrangler r2 bucket create devtrends-images

# KV namespace for the web app's sessions (Astro/Cloudflare requirement)
npx wrangler kv namespace create SESSION   # paste id into apps/web/wrangler.toml
```

Then edit:
- `apps/parser/wrangler.toml` and `apps/web/wrangler.toml`:
  - `database_id` (from `d1 create`)
  - `SITE_URL` = your custom domain (e.g. `https://devtrends.example`)
  - `R2_PUBLIC_BASE` = your R2 public/custom domain (e.g. `https://img.devtrends.example`)
- `apps/web/wrangler.toml`: KV `SESSION` `id`.

> **R2 public domain:** enable a custom domain on the `devtrends-images` bucket
> (R2 → Settings → Public access / custom domain) and set `R2_PUBLIC_BASE` to it.

## 2. Secrets

```bash
cd apps/parser
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put CF_API_TOKEN     # optional: enables cache purge-on-publish
# also set CF_ZONE_ID in apps/parser/wrangler.toml [vars] if using purge
```

For local dev: `cp apps/parser/.dev.vars.example apps/parser/.dev.vars` and fill in.

## 3. Migrate the database

```bash
# remote (production)
npm run db:migrate:remote -w apps/parser
# local (shared dev state used by both apps)
npm run db:migrate:local -w apps/parser
```

## 4. Run / deploy

```bash
# Parser (local): triggers cron via GET http://localhost:8787/__scheduled
npm run dev -w apps/parser

# Web (local): http://localhost:4321  (reads the shared local D1)
npm run dev -w apps/web

# Deploy
npm run deploy -w apps/parser        # Worker + cron
npm run deploy -w apps/web           # Astro build + Pages deploy
```

In the **Pages dashboard**, add the same bindings as `apps/web/wrangler.toml`
(`DB`, `BUCKET`, `SESSION`) and vars (`SITE_URL`, `R2_PUBLIC_BASE`, `SITE_NAME`)
for the production deployment.

## Configuration knobs (`apps/parser/wrangler.toml` [vars])

| Var | Purpose |
|---|---|
| `BACKFILL_LIMIT` | Initial cap on articles (set `20` to validate; raise/remove for full backfill) |
| `PROCESS_BATCH` | Pending articles processed per cron tick (keep small for free-tier limits) |
| `OPENAI_BASE_URL` / `OPENAI_MODEL` | Switch translation provider (e.g. `https://api.deepseek.com/v1` + `deepseek-chat`) |
| `SOURCE_BASE` | Source site (`https://devtrends.ru`) |

## How it works

1. **Cron** (`*/3 * * * *`) → `scheduled()`:
   - `discover()` reads `sitemap.xml`, inserts new/updated URLs as `pending`
     (capped by `BACKFILL_LIMIT` on the very first run).
   - claims `PROCESS_BATCH` pending rows → for each: scrape `.prose` body (strip
     ads/QR), re-host images to R2, translate via the LLM (code blocks left
     untouched), save as `published`, purge edge cache.
2. **Web** renders home / `[lang]` / `[lang]/[slug]` from D1 with semantic HTML,
   auto meta/OG + JSON-LD, generated `sitemap.xml` and `robots.txt`, Tailwind
   styling, and Alpine.js for the mobile menu (dark mode is pre-paint inline JS).

## Note on content

This republishes translated third-party content. Each article keeps its
`source_url`; decide on attribution / `rel=canonical` / licensing before going
public.
