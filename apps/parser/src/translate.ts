import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Env, TranslatedArticle } from "./types";

/** Locale code -> language name for translation prompts. */
export const LOCALE_LANG: Record<string, string> = {
  es: "Spanish",
  de: "German",
  zh: "Simplified Chinese",
  ja: "Japanese",
  fr: "French",
  pt: "Portuguese",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
};

// Structured-output schema: the model must return exactly these fields.
const TranslationSchema = z.object({
  title: z.string(),
  body_html: z.string(),
  excerpt: z.string(),
  meta_description: z.string(),
});

// Private-use-area delimiters wrap each placeholder index so tokens never
// collide with real numbers (years, versions) when restoring.
const PH_OPEN = String.fromCharCode(0xe000);
const PH_CLOSE = String.fromCharCode(0xe001);

const CODE_RULES =
  `STRICT RULES:\n` +
  `- Preserve ALL HTML tags, structure, and attributes EXACTLY. Do not add, remove, or reorder tags.\n` +
  `- The text contains placeholder tokens: a special marker character, a number, and a closing marker (they stand in for code and URLs). Reproduce each token EXACTLY as it appears — do not translate it, add spaces inside or around it, change the number, reorder, or drop it.\n` +
  `- Keep product, library, tool, and brand names unchanged (e.g. Rclone, Go, Docker, S3).\n` +
  `- Do not invent content or add commentary.\n` +
  `Fields: "title" (plain text), "body_html" (translated HTML, same tags + placeholders), "excerpt" (~160 chars), "meta_description" (<=160 chars).`;

const RU_EN_SYSTEM =
  `You are a professional technical translator. Translate developer-focused articles from Russian to natural, fluent English for an English-speaking software audience. Never leave Russian text untranslated.\n\n` +
  CODE_RULES;

/**
 * Hide code blocks and URL attribute values behind placeholder tokens so the
 * model cannot rewrite/space-out code or break links. Returns the masked text
 * and a restore fn that puts the originals back.
 */
function protectHtml(html: string): { masked: string; restore: (s: string) => string } {
  const store: string[] = [];
  const keep = (orig: string): string => {
    const token = `${PH_OPEN}${store.length}${PH_CLOSE}`;
    store.push(orig);
    return token;
  };
  let masked = html;
  masked = masked.replace(/<pre[\s\S]*?<\/pre>/gi, (m) => keep(m)); // whole code blocks
  masked = masked.replace(/<code[\s\S]*?<\/code>/gi, (m) => keep(m)); // inline code
  masked = masked.replace(/\b(href|src)=("|')(.*?)\2/gi, (_m, attr, q, url) => `${attr}=${q}${keep(url)}${q}`);
  const re = new RegExp(`${PH_OPEN}(\\d+)${PH_CLOSE}`, "g");
  const restore = (s: string): string => s.replace(re, (_m, i) => store[Number(i)] ?? "");
  return { masked, restore };
}

function extractJsonObject(content: string): string {
  let s = content ?? "";
  const end = s.lastIndexOf("</think>");
  if (end !== -1) s = s.slice(end + "</think>".length);
  s = s.trim();
  if (s.startsWith("```")) s = s.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last > first) s = s.slice(first, last + 1);
  return s;
}

/**
 * One structured-output translation call. Code/URLs in `bodyHtml` are masked
 * before sending and restored after, so the model only ever rewrites prose.
 */
async function structuredTranslate(
  env: Env,
  system: string,
  intro: string,
  bodyHtml: string
): Promise<TranslatedArticle> {
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL || undefined,
    timeout: 180_000, // bound a slow/hung LLM call (per request)
    maxRetries: 0,
  });

  const { masked, restore } = protectHtml(bodyHtml);
  const user = `${intro}\n\nBODY_HTML:\n${masked}`;

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.2,
    max_tokens: 16000,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: zodResponseFormat(TranslationSchema, "translation"),
  });

  const message = completion.choices[0]?.message;
  if (message?.refusal) throw new Error(`LLM refused: ${message.refusal}`);
  const content = message?.content ?? "";
  if (!content) throw new Error("LLM returned empty content");

  let obj: unknown;
  try {
    obj = JSON.parse(extractJsonObject(content));
  } catch {
    throw new Error("could not parse JSON from model output");
  }
  const parsed = TranslationSchema.parse(obj);

  return {
    title: parsed.title,
    body_html: restore(parsed.body_html),
    excerpt: parsed.excerpt.slice(0, 300),
    meta_description: (parsed.meta_description || parsed.excerpt).slice(0, 200),
  };
}

/** Translate one article (Russian source -> English). */
export async function translateArticle(
  env: Env,
  title: string,
  bodyHtml: string
): Promise<TranslatedArticle> {
  const intro = `Translate this article to English.\n\nTITLE (Russian):\n${title}`;
  return structuredTranslate(env, RU_EN_SYSTEM, intro, bodyHtml);
}

/** Translate the already-English article into a target locale (e.g. "de"). */
export async function translateToLocale(
  env: Env,
  locale: string,
  en: TranslatedArticle
): Promise<TranslatedArticle> {
  const langName = LOCALE_LANG[locale] ?? locale;
  const system =
    `You are a professional technical translator. Translate the developer article from English into ${langName}, ` +
    `written naturally for a ${langName}-speaking software audience.\n\n` +
    CODE_RULES;
  const intro =
    `TITLE (English):\n${en.title}\n\n` +
    `EXCERPT (English):\n${en.excerpt}\n\n` +
    `META (English):\n${en.meta_description}`;
  return structuredTranslate(env, system, intro, en.body_html);
}
