import type { Env } from "./types";
import { discover } from "./sitemap";
import { claimPending, markPublished, markFailed, logRun } from "./db";
import { scrapeArticle } from "./scrape";
import { processMedia } from "./media";
import { translateArticle } from "./translate";
import { purgeForArticle } from "./cache";

/** Discover new sitemap entries, then translate & publish a small batch. */
async function runPipeline(env: Env): Promise<{ discovered: number; processed: number; failed: number }> {
  let discovered = 0;
  try {
    discovered = await discover(env);
  } catch (e) {
    await logRun(env, 0, 0, 0, `discover error: ${String(e).slice(0, 200)}`);
  }

  const batch = Number(env.PROCESS_BATCH) || 1;
  const rows = await claimPending(env, batch);

  let processed = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const scraped = await scrapeArticle(env, row.source_url);
      const slug = row.slug ?? String(row.id);
      const media = await processMedia(env, scraped.bodyHtml, slug);
      const translated = await translateArticle(env, scraped.title, media.bodyHtml);
      await markPublished(env, row, { ...scraped, bodyHtml: media.bodyHtml }, translated, media.ogImage);
      await purgeForArticle(env, row.language, row.slug);
      processed++;
    } catch (e) {
      await markFailed(env, row.id, String(e));
      failed++;
    }
  }

  await logRun(env, discovered, processed, failed);
  return { discovered, processed, failed };
}

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runPipeline(env).then(() => undefined));
  },

  // Minimal fetch handler: cron is the real trigger. In local dev,
  // `wrangler dev --test-scheduled` exposes /__scheduled to run scheduled().
  async fetch(_req: Request, _env: Env): Promise<Response> {
    return new Response(
      "devtrends parser — runs on cron. Local: `wrangler dev --test-scheduled` then GET /__scheduled",
      { headers: { "content-type": "text/plain" } }
    );
  },
};
