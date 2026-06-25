import type { Env, TranslatedArticle } from "./types";
import { discover } from "./sitemap";
import { claimPending, markPublished, markFailed, logRun, saveTranslationsBatch } from "./db";
import { scrapeArticle } from "./scrape";
import { processMedia } from "./media";
import { translateArticle, translateToLocale } from "./translate";
import { purgeForArticle } from "./cache";

const DEFAULT_TARGET_LOCALES = "es,de,zh,ja,fr,pt,it,nl,pl";

// Two schedules (see wrangler.toml): a frequent one processes a small batch,
// and an infrequent one does the heavy full-sitemap discovery. Keeping them on
// separate invocations means neither competes for the per-invocation budget.
const DISCOVER_CRON = "11 */6 * * *";

/** Full sitemap discovery (its own cron — bulk INSERT OR IGNORE). */
async function runDiscover(env: Env): Promise<void> {
  try {
    const discovered = await discover(env);
    await logRun(env, discovered, 0, 0, "discover");
  } catch (e) {
    await logRun(env, 0, 0, 0, `discover error: ${String(e).slice(0, 200)}`);
  }
}

/** Translate & publish a small batch of pending articles (the frequent cron). */
async function runProcess(env: Env): Promise<void> {
  const batch = Number(env.PROCESS_BATCH) || 1;
  let rows = await claimPending(env, batch);

  // Self-heal: if nothing is queued, discover once to refill, then re-claim.
  if (rows.length === 0) {
    try {
      await discover(env);
    } catch {
      /* discovery is best-effort here */
    }
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

      // English is the pivot: RU -> EN once, then EN -> every other locale.
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

      await purgeForArticle(env, row.language, row.slug);
      processed++;
    } catch (e) {
      await markFailed(env, row.id, String(e));
      failed++;
    }
  }

  await logRun(env, 0, processed, failed);
}

export default {
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const task = event.cron === DISCOVER_CRON ? runDiscover(env) : runProcess(env);
    ctx.waitUntil(task.then(() => undefined));
  },

  // Minimal fetch handler: cron is the real trigger. In local dev,
  // `wrangler dev --test-scheduled` exposes /__scheduled (add ?cron=... to pick
  // a schedule, e.g. the discovery one).
  async fetch(_req: Request, _env: Env): Promise<Response> {
    return new Response(
      "devtrends parser — runs on cron. Local: `wrangler dev --test-scheduled` then GET /__scheduled",
      { headers: { "content-type": "text/plain" } }
    );
  },
};
