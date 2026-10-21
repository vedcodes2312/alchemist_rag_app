import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { normalizeForEmbedding } from './ingestion/normalize.js';
import {
  GROUNDED_SYSTEM_INSTRUCTION,
  CORRECTIVE_QUOTE_INSTRUCTION,
  buildUserPrompt,
} from '../prompts/groundedAnswer.js';

/**
 * Resolves configured model name to the active API identifier.
 */
function resolveModelName(model) {
  if (model === 'gemini-3.8-flash' || model === 'gemini-3-flash') {
    return 'gemini-3-flash-preview';
  }
  return model || 'gemini-3-flash-preview';
}

/**
 * Extracts double-quoted spans of >= 4 words from text.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function extractQuotes(text) {
  if (!text || typeof text !== 'string') return [];
  const regex = /["“]([^"”]+)["”]/g;
  const quotes = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const rawQuote = match[1].trim();
    const words = rawQuote.split(/\s+/).filter(Boolean);
    if (words.length >= 4) {
      quotes.push(rawQuote);
    }
  }
  return quotes;
}

/**
 * Verifies that all extracted quotes appear verbatim in at least one candidate passage.
 *
 * @param {string[]} quotes
 * @param {Array<{ content: string }>} candidates
 * @returns {boolean}
 */
export function verifyQuotes(quotes, candidates) {
  if (quotes.length === 0) return true;
  const candidateCorpus = candidates.map((c) => normalizeForEmbedding(c.content).toLowerCase());

  for (const quote of quotes) {
    const normQuote = normalizeForEmbedding(quote).toLowerCase();
    const found = candidateCorpus.some((text) => text.includes(normQuote));
    if (!found) {
      return false;
    }
  }
  return true;
}

/**
 * Service for grounded answer generation via Gemini with strict anti-hallucination controls.
 */
export class LLMService {
  constructor(options = {}) {
    this.apiKey = options.apiKey || env.GEMINI_API_KEY;
    this.modelName = resolveModelName(options.modelName || env.GEMINI_MODEL);
    this.timeoutMs = options.timeoutMs || env.LLM_TIMEOUT_MS;
    this.ai = this.apiKey ? new GoogleGenAI({ apiKey: this.apiKey }) : null;
  }

  /**
   * Generates a grounded answer for a question and retrieved passages.
   *
   * @param {string} question - User question
   * @param {Array<{ id: string, chapter: string | null, content: string, similarity: number }>} candidates - Retrieved chunks
   * @returns {Promise<{ sufficient: boolean, answer: string, interpretation: string | null, usedEvidence: string[], warnings: string[] }>}
   */
  async generateGroundedAnswer(question, candidates) {
    if (!this.ai) {
      throw new AppError(
        'INTERNAL_ERROR',
        500,
        'Gemini API key is not configured on the server.'
      );
    }

    if (!candidates || candidates.length === 0) {
      return {
        sufficient: false,
        answer: '',
        interpretation: null,
        usedEvidence: [],
        warnings: [],
      };
    }

    const { promptText, labelMap } = buildUserPrompt(question, candidates);
    const warnings = [];

    // First attempt
    let rawResult = await this.#callModel(GROUNDED_SYSTEM_INSTRUCTION, promptText);
    let parsed = this.#parseAndValidate(rawResult);

    if (!parsed.sufficient) {
      return {
        sufficient: false,
        answer: '',
        interpretation: null,
        usedEvidence: [],
        warnings: [],
      };
    }

    // Verify verbatim quotes
    const quotes = [
      ...extractQuotes(parsed.answer),
      ...(parsed.interpretation ? extractQuotes(parsed.interpretation) : []),
    ];

    const quotesVerified = verifyQuotes(quotes, candidates);

    if (!quotesVerified) {
      // Retry once with corrective instruction
      const correctivePrompt = `${promptText}\n\n[CORRECTION REQUIRED]: ${CORRECTIVE_QUOTE_INSTRUCTION}`;
      try {
        const retryRaw = await this.#callModel(GROUNDED_SYSTEM_INSTRUCTION, correctivePrompt);
        const retryParsed = this.#parseAndValidate(retryRaw);

        if (retryParsed.sufficient) {
          const retryQuotes = [
            ...extractQuotes(retryParsed.answer),
            ...(retryParsed.interpretation ? extractQuotes(retryParsed.interpretation) : []),
          ];
          if (verifyQuotes(retryQuotes, candidates)) {
            parsed = retryParsed;
          } else {
            // Still unverified after retry: accept with warning
            parsed = retryParsed;
            warnings.push('UNVERIFIED_QUOTATION');
          }
        }
      } catch (_err) {
        // If corrective retry fails, keep first parsed response with warning
        warnings.push('UNVERIFIED_QUOTATION');
      }
    }

    // Filter usedEvidence to only retain valid labels present in labelMap
    const validUsedLabels = (parsed.usedEvidence || []).filter((label) => labelMap.has(label));

    // If no valid evidence labels remain, mark as insufficient
    if (validUsedLabels.length === 0) {
      return {
        sufficient: false,
        answer: '',
        interpretation: null,
        usedEvidence: [],
        warnings: [],
      };
    }

    return {
      sufficient: true,
      answer: parsed.answer,
      interpretation: parsed.interpretation || null,
      usedEvidence: validUsedLabels,
      warnings,
    };
  }

  /**
   * Calls the Gemini API with timeout and error mapping.
   */
  async #callModel(systemInstruction, userContent) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: userContent,
        config: {
          systemInstruction,
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              sufficient: { type: 'BOOLEAN' },
              answer: { type: 'STRING' },
              interpretation: { type: 'STRING', nullable: true },
              usedEvidence: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: ['sufficient', 'answer', 'usedEvidence'],
          },
        },
      });

      return response.text;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AppError(
          'LLM_TIMEOUT',
          504,
          `Gemini request timed out after ${this.timeoutMs}ms`,
          { cause: err }
        );
      }

      const status = err.status || err.statusCode || 500;
      const message = err.message || '';

      if (status === 429 || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
        throw new AppError(
          'LLM_RATE_LIMITED',
          429,
          'Gemini rate limit exceeded. Please wait a moment before trying again.',
          { cause: err }
        );
      }

      throw new AppError(
        'LLM_ERROR',
        502,
        `Gemini API error: ${message}`,
        { cause: err }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parses and validates structured JSON output from Gemini.
   */
  #parseAndValidate(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      throw new AppError(
        'LLM_BAD_RESPONSE',
        502,
        'Failed to parse structured JSON from model response.',
        { cause: err }
      );
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new AppError('LLM_BAD_RESPONSE', 502, 'Model response is not a valid JSON object.');
    }

    return {
      sufficient: Boolean(parsed.sufficient),
      answer: typeof parsed.answer === 'string' ? parsed.answer.trim() : '',
      interpretation: typeof parsed.interpretation === 'string' && parsed.interpretation.trim() ? parsed.interpretation.trim() : null,
      usedEvidence: Array.isArray(parsed.usedEvidence) ? parsed.usedEvidence : [],
    };
  }
}

export const llmService = new LLMService();
