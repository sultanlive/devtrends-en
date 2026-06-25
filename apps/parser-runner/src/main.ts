// Standalone parser runner for GitHub Actions (off-Cloudflare, no Workers
// limits). Reuses the existing scrape/translate/media/db logic; D1 is accessed
// over REST and R2 via the wrangler CLI. Usage: `tsx src/main.ts process|discover`.
import { D1Rest } from "./d1";
import { R2Wrangler } from "./r2";
import { discover } from "../../parser/src/sitemap";
import {
  claimPending, markPublished, markFailed, logRun,
  saveTranslationsBatch, getPublishedMissingLocale,
} from "../../parser/src/db";
import { scrapeArticle } from "../../parser/src/scrape";
import { processMedia } from "../../parser/src/media";
import { translateArticle, translateToLocale } from "../../parser/src/translate";
import type { Env, TranslatedArticle } from "../../parser/src/types";

const DEFAULT_TARGET_LOCALES = "es,de,zh,ja,fr,pt,it,nl,pl";
const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function buildEnv(): Env {
  const e = process.env;
  return {
    DB: new D1Rest() as unknown as Env["DB"],
    BUCKET: new R2Wrangler() as unknown as Env["BUCKET"],
    SOURCE_BASE: e.SOURCE_BASE ?? "https://devtrends.ru",
    USER_AGENT: e.USER_AGENT ?? CHROME_UA,
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
  const locales = (env.TARGET_LOCALES ?? DEFAULT_TARGET_LOCALES)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Per-run budgets keep each run bounded and well under the job timeout.
  const enBudget = Number(env.PROCESS_BATCH) || 1;           // new English articles
  const localeBudget = Number(process.env.LOCALE_BUDGET) || 6; // missing-locale fills

  // 1) Publish new articles in English (fast, ~1 LLM call each). Locales are
  //    filled separately below so a slow/timed-out run never loses them.
  let rows = await claimPending(env, enBudget);
  if (rows.length === 0) {
    await discover(env); // refill if the queue is empty
    rows = await claimPending(env, enBudget);
  }
  let processed = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const scraped = await scrapeArticle(env, row.source_url);
      const slug = row.slug ?? String(row.id);
      const media = await processMedia(env, scraped.bodyHtml, slug);
      const en = await translateArticle(env, scraped.title, media.bodyHtml);
      await markPublished(env, row, { ...scraped, bodyHtml: media.bodyHtml }, en, media.ogImage);
      processed++;
      console.log(`published EN ${row.language}/${row.slug}`);
    } catch (e) {
      await markFailed(env, row.id, String(e));
      failed++;
      console.log(`failed ${row.source_url}: ${String(e).slice(0, 160)}`);
    }
  }

  // 2) Backfill missing locales (newest articles first), saved one at a time so
  //    progress survives a timeout. Bounded by localeBudget per run.
  let filled = 0;
  for (const loc of locales) {
    if (filled >= localeBudget) break;
    const tasks = await getPublishedMissingLocale(env, loc, localeBudget - filled);
    for (const t of tasks) {
      if (filled >= localeBudget) break;
      try {
        const tr = await translateToLocale(env, loc, t.en);
        await saveTranslationsBatch(env, t.id, [{ locale: loc, tr }]);
        filled++;
      } catch (e) {
        console.log(`locale ${loc} failed for ${t.slug}: ${String(e).slice(0, 120)}`);
      }
    }
  }

  console.log(`done: published ${processed}, failed ${failed}, locales filled ${filled}`);
  await logRun(env, 0, processed, failed, `locales+${filled}`);
}

const mode = process.argv[2] === "discover" ? "discover" : "process";
const env = buildEnv();
(mode === "discover" ? runDiscover(env) : runProcess(env))
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
