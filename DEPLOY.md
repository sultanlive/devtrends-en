# Deploying DevTrends EN

Two deployables on Cloudflare (free tier):

- **`apps/parser`** — a Worker on a cron trigger (`*/3 * * * *`) that scrapes
  devtrends.ru, translates, and writes to D1/R2.
- **`apps/web`** — the Astro SSR site on Cloudflare **Pages**, reading the same
  D1 + R2.

CI/CD lives in `.github/workflows/`:

- **`ci.yml`** — typechecks the parser and builds the web app on every push/PR.
- **`deploy.yml`** — on push to `master` (or manual run): applies D1 migrations,
  deploys the parser Worker, then builds + deploys the web app to Pages.

## One-time setup

1. **Authenticate** locally: `npx wrangler login`.

2. **Create resources** (D1, R2, KV):

   ```bash
   bash scripts/setup-cloudflare.sh
   ```

   Paste the printed `database_id` into **both** `apps/parser/wrangler.toml` and
   `apps/web/wrangler.toml`, and the KV `id` into `apps/web/wrangler.toml`.

3. **Worker secrets** (persist across deploys):

   ```bash
   cd apps/parser
   npx wrangler secret put OPENAI_API_KEY
   npx wrangler secret put OPENAI_BASE_URL   # optional if left as a [vars] value
   npx wrangler secret put OPENAI_MODEL
   ```

4. **R2 public images** — enable a public URL and set `R2_PUBLIC_BASE`
   (in both wrangler.toml files) to that origin:

   ```bash
   npx wrangler r2 bucket dev-url enable devtrends-images
   ```

5. **GitHub repo secrets** (Settings → Secrets and variables → Actions):

   | Secret | Value |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | API token with Workers Scripts:Edit, Pages:Edit, D1:Edit, Workers KV Storage:Edit, R2:Edit |
   | `CLOUDFLARE_ACCOUNT_ID` | your account ID (`wrangler whoami`) |

6. **Commit** the filled-in `wrangler.toml` files and push to `master`.

## First deploy

The push triggers `deploy.yml`. To deploy manually:
`Actions → Deploy → Run workflow`, or locally:

```bash
npm run db:migrate:remote
npm run parser:deploy
npm run web:build && cd apps/web && npx wrangler pages deploy ./dist --project-name=devtrends-web
```

## After launch

- Set `SITE_URL` in `apps/web/wrangler.toml` to your custom domain so canonical/
  hreflang/sitemap pin to it (leave empty to use the request host).
- Bindings (D1/R2/KV) for the Pages project come from `apps/web/wrangler.toml`.
- Raise `BACKFILL_LIMIT` / `PROCESS_BATCH` in `apps/parser/wrangler.toml` to
  ingest faster once you're happy with output quality.
