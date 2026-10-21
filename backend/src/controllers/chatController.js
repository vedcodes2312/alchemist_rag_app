import { ragService } from '../services/ragService.js';

/**
 * Chat controller handling user questions about The Alchemist.
 * Delegates to ragService to perform semantic retrieval, Gemini grounding,
 * quote verification, and citation building.
 */
export async function handleChat(req, res, next) {
  try {
    const { question } = req.body;
    const result = await ragService.answerQuestion(question);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
