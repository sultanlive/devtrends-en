#!/usr/bin/env bash
# One-time Cloudflare bootstrap: creates the D1 database, R2 bucket, and KV
# namespace this project needs, then prints the IDs to paste into the
# wrangler.toml files. Run from anywhere; requires `wrangler login` first
# (or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID in the environment).
#
#   bash scripts/setup-cloudflare.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Creating D1 database 'devtrends' (copy the database_id from the output)"
npx wrangler d1 create devtrends || echo "(already exists? check the dashboard)"

echo
echo "==> Creating R2 bucket 'devtrends-images'"
npx wrangler r2 bucket create devtrends-images || echo "(already exists?)"

echo
echo "==> Creating KV namespace 'SESSION' (for Astro/Cloudflare sessions; copy the id)"
npx wrangler kv namespace create SESSION || echo "(already exists?)"

cat <<'NEXT'

==> Next steps
1. Paste the printed D1 database_id into BOTH:
     apps/parser/wrangler.toml   (database_id = "...")
     apps/web/wrangler.toml      (database_id = "...")
   and the KV id into:
     apps/web/wrangler.toml      (id = "...")

2. Set the parser Worker's runtime secrets (persist across deploys):
     cd apps/parser
     npx wrangler secret put OPENAI_API_KEY
     npx wrangler secret put OPENAI_BASE_URL    # if not using vars in wrangler.toml
     npx wrangler secret put OPENAI_MODEL

3. (R2 public images) Enable a public URL for the bucket and set
   R2_PUBLIC_BASE in apps/parser/wrangler.toml + apps/web/wrangler.toml:
     npx wrangler r2 bucket dev-url enable devtrends-images   # gives an r2.dev URL
   or attach a custom domain in the dashboard.

4. Create the Pages project (first deploy can also create it):
     cd apps/web && npx wrangler pages project create devtrends-web --production-branch main

5. Add GitHub repo secrets for CI/CD (Settings -> Secrets and variables -> Actions):
     CLOUDFLARE_API_TOKEN   (token with Workers Scripts:Edit, Pages:Edit, D1:Edit, Workers KV:Edit, R2:Edit)
     CLOUDFLARE_ACCOUNT_ID

6. Commit the filled-in wrangler.toml files and push — the Deploy workflow runs.
NEXT
