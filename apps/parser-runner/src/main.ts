// Standalone parser runner for GitHub Actions (off-Cloudflare, no Workers
// limits). Reuses the existing scrape/translate/media/db logic; D1 is accessed
// over REST and R2 via the wrangler CLI. Usage: `tsx src/main.ts process|discover`.
import { D1Rest } from "./d1";
import { R2Wrangler } from "./r2";
import { discover } from "../../parser/src/sitemap";
import { claimPending, markPublished, markFailed, logRun, saveTranslationsBatch } from "../../parser/src/db";
import { scrapeArticle } from "../../parser/src/scrape";
import { processMedia } from "../../parser/src/media";
import { translateArticle, translateToLocale } from "../../parser/src/translate";
import type { Env, TranslatedArticle } from "../../parser/src/types";

const DEFAULT_TARGET_LOCALES = "es,de,zh,ja,fr,pt,it,nl,pl";

function buildEnv(): Env {
  const e = process.env;
  return {
    DB: new D1Rest() as unknown as Env["DB"],
    BUCKET: new R2Wrangler() as unknown as Env["BUCKET"],
    SOURCE_BASE: e.SOURCE_BASE ?? "https://devtrends.ru",
    USER_AGENT: e.USER_AGENT ?? "devtrends-en-bot/0.1 (+https://devtrends-en.pages.dev)",
    BACKFILL_LIMIT: e.BACKFILL_LIMIT ?? "0",
    PROCESS_BATCH: e.PROCESS_BATCH ?? "1",
    OPENAI_BASE_URL: e.OPENAI_BASE_URL ?? "",
    OPENAI_MODEL: e.OPENAI_MODEL ?? "",
    R2_PUBLIC_BASE: e.R2_PUBLIC_BASE ?? "",
    SITE_URL: e.SITE_URL ?? "",
    TARGET_LOCALES: e.TARGET_LOCALES ?? DEFAULT_TARGET_LOCALES,
    OPENAI_API_KEY: e.OPENAI_API_KEY ?? "",
  };
}

async function runDiscover(env: Env): Promise<void> {
  const discovered = await discover(env);
  await logRun(env, discovered, 0, 0, "discover (actions)");
  console.log(`discover: enqueued ${discovered} new URLs`);
}

async function runProcess(env: Env): Promise<void> {
  const batch = Number(env.PROCESS_BATCH) || 1;
  let rows = await claimPending(env, batch);
  if (rows.length === 0) {
    await discover(env); // refill if the queue is empty
    rows = await claimPending(env, batch);
  }

  const locales = (env.TARGET_LOCALES ?? DEFAULT_TARGET_LOCALES)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let processed = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const scraped = await scrapeArticle(env, row.source_url);
      const slug = row.slug ?? String(row.id);
      const media = await processMedia(env, scraped.bodyHtml, slug);
      const en = await translateArticle(env, scraped.title, media.bodyHtml);
      await markPublished(env, row, { ...scraped, bodyHtml: media.bodyHtml }, en, media.ogImage);

      const localized: { locale: string; tr: TranslatedArticle }[] = [];
      for (const loc of locales) {
        try {
          localized.push({ locale: loc, tr: await translateToLocale(env, loc, en) });
        } catch (e) {
          console.log(`locale ${loc} failed for ${row.slug}: ${String(e).slice(0, 120)}`);
        }
      }
      await saveTranslationsBatch(env, row.id, localized);
      processed++;
      console.log(`published ${row.language}/${row.slug} (+${localized.length} locales)`);
    } catch (e) {
      await markFailed(env, row.id, String(e));
      failed++;
      console.log(`failed ${row.source_url}: ${String(e).slice(0, 160)}`);
    }
  }
  await logRun(env, 0, processed, failed);
}

const mode = process.argv[2] === "discover" ? "discover" : "process";
const env = buildEnv();
(mode === "discover" ? runDiscover(env) : runProcess(env))
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
