import crypto from 'node:crypto';
import { getSupabaseClient } from '../config/supabaseClient.js';

export class ChatHistoryService {
  constructor() {
    this.supabase = null;
  }

  #getClient() {
    if (!this.supabase) {
      try {
        this.supabase = getSupabaseClient();
      } catch (_err) {
        return null;
      }
    }
    return this.supabase;
  }

  /**
   * Lists all chat sessions ordered by most recently updated.
   * Gracefully returns [] if database tables are not yet created.
   *
   * @returns {Promise<Array<{ id: string, title: string, created_at: string, updated_at: string }>>}
   */
  async listSessions() {
    const client = this.#getClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('chat_sessions')
        .select('id, title, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') return [];
        console.warn('[CHAT_HISTORY] listSessions error:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('[CHAT_HISTORY] listSessions unexpected error:', err.message);
      return [];
    }
  }

  /**
   * Retrieves a single chat session with all messages in chronological order.
   *
   * @param {string} sessionId
   * @returns {Promise<{ id: string, title: string, messages: Array } | null>}
   */
  async getSession(sessionId) {
    const client = this.#getClient();
    if (!client || !sessionId) return null;

    try {
      const { data: session, error: sessionErr } = await client
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionErr || !session) return null;

      const { data: messages, error: msgErr } = await client
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (msgErr) return null;

      return {
        ...session,
        messages: (messages || []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          interpretation: m.interpretation || null,
          sources: m.sources || [],
          status: m.status,
          createdAt: m.created_at,
        })),
      };
    } catch (err) {
      console.warn('[CHAT_HISTORY] getSession error:', err.message);
      return null;
    }
  }

  /**
   * Records a user question and assistant answer turn.
   * Auto-creates the session if not existing.
   *
   * @param {object} params
   * @param {string} [params.sessionId]
   * @param {string} [params.title]
   * @param {string} params.userQuestion
   * @param {object} params.assistantResult
   * @returns {Promise<string>} - Effective session ID
   */
  async recordTurn({ sessionId, title, userQuestion, assistantResult }) {
    const client = this.#getClient();
    const effectiveSessionId = sessionId || crypto.randomUUID();
    const sessionTitle =
      title ||
      (userQuestion.length > 45 ? `${userQuestion.slice(0, 42).trim()}...` : userQuestion);

    if (!client) return effectiveSessionId;

    try {
      // 1. Upsert session
      const { error: sessionErr } = await client
        .from('chat_sessions')
        .upsert(
          {
            id: effectiveSessionId,
            title: sessionTitle,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (sessionErr) {
        if (sessionErr.code === 'PGRST205') return effectiveSessionId;
        console.warn('[CHAT_HISTORY] Failed to upsert session:', sessionErr.message);
        return effectiveSessionId;
      }

      // 2. Insert user message
      await client.from('chat_messages').insert({
        session_id: effectiveSessionId,
        role: 'user',
        content: userQuestion,
      });

      // 3. Insert assistant message
      await client.from('chat_messages').insert({
        session_id: effectiveSessionId,
        role: 'assistant',
        content: assistantResult.answer || '',
        interpretation: assistantResult.interpretation || null,
        sources: assistantResult.sources || [],
        status: assistantResult.status || 'answered',
      });

      return effectiveSessionId;
    } catch (err) {
      console.warn('[CHAT_HISTORY] recordTurn unexpected error:', err.message);
      return effectiveSessionId;
    }
  }

  /**
   * Deletes a chat session and all cascading messages.
   *
   * @param {string} sessionId
   * @returns {Promise<boolean>}
   */
  async deleteSession(sessionId) {
    const client = this.#getClient();
    if (!client || !sessionId) return false;

    try {
      const { error } = await client
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) {
        console.warn('[CHAT_HISTORY] deleteSession error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[CHAT_HISTORY] deleteSession unexpected error:', err.message);
      return false;
    }
  }
}

export const chatHistoryService = new ChatHistoryService();
