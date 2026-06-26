import type { APIContext } from "astro";
import { getEnv, canonical, articlePath, siteUrl } from "../lib/site";
import { listArticles, listLanguages, publishedTagSets } from "../lib/db";
import { SECTIONS, tagsMatchSection } from "../lib/sections";

// /llms.txt — a concise, LLM-friendly map of the site (https://llmstxt.org/).
export async function GET(context: APIContext): Promise<Response> {
  const env = getEnv(context.locals);
  const site = siteUrl(context.locals, context.url);
  const abs = (p: string) => canonical(site, p);
  const clean = (s: string | null, max = 140) =>
    (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

  const [latest, languages, tagSets] = await Promise.all([
    listArticles(env.DB, { limit: 40, offset: 0, locale: "en" }),
    listLanguages(env.DB),
    publishedTagSets(env.DB),
  ]);

  const sections = SECTIONS.filter((s) => tagSets.some((ts) => tagsMatchSection(ts, s)));

  const lines: string[] = [];
  lines.push(`# ${env.SITE_NAME}`);
  lines.push("");
  lines.push(
    `> Plain-English reviews of trending open-source developer tools and projects — searchable, organized by programming language and field, and translated into 10 languages.`
  );
  lines.push("");
  lines.push(
    `${env.SITE_NAME} publishes concise write-ups of notable open-source projects (frameworks, CLIs, libraries, dev tools): what each one is, why it matters, and how to use it. Content is in English plus Spanish, German, Chinese, Japanese, French, Portuguese, Italian, Dutch, and Polish.`
  );

  if (sections.length) {
    lines.push("");
    lines.push("## Sections");
    for (const s of sections) {
      lines.push(`- [${s.title}](${abs(`/sections/${s.slug}`)}): ${clean(s.description)}`);
    }
  }

  if (latest.length) {
    lines.push("");
    lines.push("## Latest projects");
    for (const a of latest) {
      const desc = clean(a.excerpt_en, 120);
      lines.push(`- [${a.title_en}](${abs(articlePath(a.language, a.slug))})${desc ? `: ${desc}` : ""}`);
    }
  }

  if (languages.length) {
    lines.push("");
    lines.push("## Browse by language");
    for (const l of languages) {
      lines.push(`- [${l.language}](${abs(`/${l.language}`)})`);
    }
  }

  lines.push("");
  lines.push("## Optional");
  lines.push(`- [All pages (sitemap)](${abs("/sitemap.xml")})`);
  lines.push(`- [Home](${abs("/")})`);
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
