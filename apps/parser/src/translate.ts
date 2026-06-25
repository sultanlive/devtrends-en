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

const RU_EN_SYSTEM = `You are a professional technical translator. You translate developer-focused articles from Russian to natural, fluent English written for an English-speaking software audience.

STRICT RULES:
- Preserve ALL HTML tags, structure, and attributes (href, id, class, src, alt) EXACTLY. Do not add, remove, or reorder tags.
- Inside <code> and <pre>: keep all code, shell commands, file paths, identifiers, and string literals byte-for-byte. The ONLY exception is human-language COMMENTS — translate the comment text (e.g. after //, #, --, ;, or inside /* */ and <!-- -->) into English, leaving the comment markers and all surrounding code unchanged.
- Keep product, library, tool, and brand names as-is (e.g. Rclone, Go, Docker, S3).
- Translate prose naturally; do not translate technical jargon into awkward calques.
- Do not invent content or add commentary.

Fields: "title" (plain text), "body_html" (translated HTML, same structure), "excerpt" (1-2 sentence summary, ~160 chars), "meta_description" (SEO description, max 160 chars).`;

/**
 * Pull the JSON object out of the model's reply. Reasoning models (e.g.
 * MiniMax) prepend a <think>…</think> block and may wrap JSON in code fences,
 * so we strip those before parsing.
 */
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
 * One OpenAI structured-output call. Provider is selected by env
 * (OPENAI_BASE_URL / OPENAI_MODEL / OPENAI_API_KEY). We request a JSON-schema
 * response but parse/validate the content ourselves so reasoning models that
 * emit a <think> preamble still work.
 */
async function structuredTranslate(env: Env, system: string, user: string): Promise<TranslatedArticle> {
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL || undefined,
  });

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
    body_html: parsed.body_html,
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
  const user =
    `Translate this article to English.\n\n` +
    `TITLE (Russian):\n${title}\n\n` +
    `BODY_HTML (Russian):\n${bodyHtml}`;
  return structuredTranslate(env, RU_EN_SYSTEM, user);
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
    `STRICT RULES:\n` +
    `- Preserve ALL HTML tags, structure, and attributes EXACTLY.\n` +
    `- Inside <code> and <pre>: keep all code, commands, paths, identifiers, and string literals byte-for-byte. The ONLY exception is human-language COMMENTS — translate the comment text (after //, #, --, ;, or inside /* */ and <!-- -->) into ${langName}, leaving the comment markers and surrounding code unchanged.\n` +
    `- Keep product, library, tool, and brand names as-is.\n` +
    `- Do not invent content or add commentary.\n\n` +
    `Fields: "title", "body_html" (same HTML structure), "excerpt", "meta_description".`;
  const user =
    `TITLE (English):\n${en.title}\n\n` +
    `EXCERPT (English):\n${en.excerpt}\n\n` +
    `META (English):\n${en.meta_description}\n\n` +
    `BODY_HTML (English):\n${en.body_html}`;
  return structuredTranslate(env, system, user);
}
