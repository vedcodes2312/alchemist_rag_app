import { ragService } from '../services/ragService.js';
import { chatHistoryService } from '../services/chatHistoryService.js';

/**
 * Chat controller handling user questions about The Alchemist,
 * with database-backed conversation history persistence.
 */
export async function handleChat(req, res, next) {
  try {
    const { question, sessionId, title } = req.body;
    const result = await ragService.answerQuestion(question);

    // Persist to database if configured
    const effectiveSessionId = await chatHistoryService.recordTurn({
      sessionId,
      title,
      userQuestion: question,
      assistantResult: result,
    });

    res.status(200).json({
      ...result,
      sessionId: effectiveSessionId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Returns all saved chat sessions ordered by most recently updated.
 */
export async function listSessions(req, res, next) {
  try {
    const sessions = await chatHistoryService.listSessions();
    res.status(200).json({ sessions });
  } catch (err) {
    next(err);
  }
}

/**
 * Returns full message history for a specific chat session.
 */
export async function getSession(req, res, next) {
  try {
    const { id } = req.params;
    const session = await chatHistoryService.getSession(id);
    if (!session) {
      return res.status(404).json({
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Conversation not found.',
        },
      });
    }
    res.status(200).json({ session });
  } catch (err) {
    next(err);
  }
}

/**
 * Deletes a chat session and all cascading messages.
 */
export async function deleteSession(req, res, next) {
  try {
    const { id } = req.params;
    await chatHistoryService.deleteSession(id);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}
