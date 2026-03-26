// server/src/services/TranslationService.ts
// Generates both literal (learning) and natural (coherent) translations
// in a single LLM call for efficiency and consistency.

import OpenAI from 'openai';
import { LanguageCode, TranslationResult, SUPPORTED_LANGUAGES } from '../types';

/**
 * TranslationService abstraction.
 * Pluggable: swap OpenAI for DeepL + LLM, Claude, or any other provider.
 */
export interface ITranslationService {
  translateLiteral(text: string, sourceLang: LanguageCode, targetLang: LanguageCode): Promise<string>;
  translateNatural(text: string, sourceLang: LanguageCode, targetLang: LanguageCode): Promise<string>;
  translateBoth(text: string, sourceLang: LanguageCode, targetLang: LanguageCode): Promise<TranslationResult>;
}

/**
 * OpenAI-powered translation service.
 * Uses GPT-4o-mini to generate both translation variants in one shot.
 */
export class OpenAITranslationService implements ITranslationService {
  private client: OpenAI;
  private model: string;

  constructor(model = 'gpt-4o-mini') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * Generate both literal and natural translations in a single API call.
   * This is the primary method — always prefer this over calling literal/natural separately.
   */
  async translateBoth(
    text: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode
  ): Promise<TranslationResult> {
    const sourceName = SUPPORTED_LANGUAGES[sourceLang];
    const targetName = SUPPORTED_LANGUAGES[targetLang];

    const systemPrompt = `You are a professional translator and language teacher. You will receive text in ${sourceName} and must translate it to ${targetName} in TWO different ways.

CRITICAL: Respond ONLY with valid JSON. No markdown, no backticks, no explanation.

Response format:
{"literal":"...","natural":"..."}

Translation rules:

1. LITERAL translation (for language learners):
   - Follow the source language's word order as closely as possible
   - Preserve particles, markers, and grammatical structures from the source
   - Keep function words that show how the source language works
   - If the source uses SOV order, keep SOV order in the translation
   - Add brief bracketed notes for untranslatable grammar: [topic marker], [politeness particle]
   - The goal: a learner should be able to map each word/phrase back to the original

2. NATURAL translation:
   - Translate into perfect, idiomatic ${targetName}
   - Use natural word order for ${targetName}
   - Choose natural expressions and idioms
   - The goal: it should read as if a native ${targetName} speaker said it

Examples for Thai → English:

Source: "ผม ไป ตลาด เมื่อวาน"
Literal: "I go market yesterday"
Natural: "I went to the market yesterday."

Source: "คุณ กิน ข้าว แล้ว หรือ ยัง"
Literal: "You eat rice already or not-yet [question particle]"
Natural: "Have you eaten yet?"

Source: "เขา ไม่ ชอบ กิน ผัก เลย"
Literal: "He/she not like eat vegetable at-all [emphasis]"
Natural: "He doesn't like eating vegetables at all."`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from translation API');
      }

      const parsed = JSON.parse(content) as TranslationResult;

      if (!parsed.literal || !parsed.natural) {
        throw new Error('Invalid translation response structure');
      }

      return parsed;
    } catch (error) {
      console.error('[TranslationService] Error translating:', error);

      // Fallback: return the original text for both
      return {
        literal: `[Translation error] ${text}`,
        natural: `[Translation error] ${text}`,
      };
    }
  }

  /**
   * Generate only a literal translation.
   * Less efficient than translateBoth — use only if you specifically need just one.
   */
  async translateLiteral(
    text: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode
  ): Promise<string> {
    const result = await this.translateBoth(text, sourceLang, targetLang);
    return result.literal;
  }

  /**
   * Generate only a natural translation.
   * Less efficient than translateBoth — use only if you specifically need just one.
   */
  async translateNatural(
    text: string,
    sourceLang: LanguageCode,
    targetLang: LanguageCode
  ): Promise<string> {
    const result = await this.translateBoth(text, sourceLang, targetLang);
    return result.natural;
  }
}

/**
 * Normalise raw STT output before translation.
 * Fixes common STT artifacts, adds punctuation, trims whitespace.
 */
export function normaliseTranscript(raw: string): string {
  let cleaned = raw.trim();

  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove common STT filler words (English)
  cleaned = cleaned.replace(/\b(um|uh|hmm|erm)\b/gi, '');

  // Re-collapse spaces after removal
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Capitalise first letter if not already
  if (cleaned.length > 0) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }

  // Ensure sentence ends with punctuation
  if (cleaned.length > 0 && !/[.!?。！？]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned;
}
