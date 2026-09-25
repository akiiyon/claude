// Conversation orchestration: retrieve -> answer (streamed) -> learn in background.
import { store } from './store.js';
import { config } from './config.js';
import { search, addMemory } from './knowledge.js';
import { buildUserTurn } from './prompts.js';
import { streamAnswer, extractLearnings, summarise } from './llm.js';

export function getOrCreateConversation(id, firstQuestion) {
  if (id) {
    const c = store.get('conversations', id);
    if (c) return c;
  }
  return store.insert('conversations', {
    title: firstQuestion.slice(0, 70) + (firstQuestion.length > 70 ? '…' : ''),
    messages: [], summary: '', summarizedUpTo: 0,
  });
}

// Recent turns are sent verbatim; older ones live in a rolling summary (token economy).
function historyMessages(conv) {
  const recent = conv.messages.slice(conv.summarizedUpTo).slice(-config.historyTurns * 2);
  return recent.map((m) => ({ role: m.role, content: m.content }));
}

export async function answer({ conversationId, question, docIds, send, signal }) {
  const conv = getOrCreateConversation(conversationId, question);
  send('conversation', { id: conv.id, title: conv.title });

  // Retrieval query includes the previous question so follow-ups ("and for PSP?") stay on topic.
  const lastUser = [...conv.messages].reverse().find((m) => m.role === 'user');
  const retrievalQuery = question.length < 80 && lastUser ? `${lastUser.content}\n${question}` : question;
  const sources = await search(retrievalQuery, { docIds });
  const publicSources = sources.map(({ text, score, ...s }, i) => ({ n: i + 1, ...s, preview: text.slice(0, 400) }));
  send('sources', publicSources);

  const messages = [...historyMessages(conv), { role: 'user', content: buildUserTurn({ question, sources, summary: conv.summary }) }];

  let result;
  try {
    result = await streamAnswer(messages, { signal, onText: (t) => send('delta', t) });
  } catch (e) {
    if (!conv.messages.length) store.remove('conversations', (c) => c.id === conv.id);
    throw e;
  }
  if (result.stopReason === 'refusal') send('delta', '\n\n_The request was declined by the model safety system. Please rephrase._');

  const assistantMsg = {
    id: crypto.randomUUID(), role: 'assistant', content: result.text,
    sources: publicSources,
    at: new Date().toISOString(),
  };
  conv.messages.push({ id: crypto.randomUUID(), role: 'user', content: question, at: new Date().toISOString() }, assistantMsg);
  store.update('conversations', conv.id, { messages: conv.messages });

  send('done', {
    messageId: assistantMsg.id,
    usage: {
      input: result.usage?.input_tokens, output: result.usage?.output_tokens,
      cacheRead: result.usage?.cache_read_input_tokens, cacheWrite: result.usage?.cache_creation_input_tokens,
    },
  });

  // Growth loop, off the request path.
  learn(conv, question, result.text).catch((e) => console.warn('learn failed:', e.message));
  compact(conv).catch((e) => console.warn('summary failed:', e.message));
}

async function learn(conv, question, answerText) {
  const items = await extractLearnings(question, answerText);
  for (const it of items) {
    await addMemory({ kind: it.kind, text: it.text, conversationId: conv.id, origin: 'auto' });
  }
}

async function compact(conv) {
  const unsummarised = conv.messages.length - conv.summarizedUpTo;
  if (unsummarised <= config.historyTurns * 2 + 2) return;
  const cut = conv.messages.length - config.historyTurns * 2;
  const summary = await summarise(conv.summary, conv.messages.slice(conv.summarizedUpTo, cut));
  store.update('conversations', conv.id, { summary, summarizedUpTo: cut });
}

/** Feedback closes the loop: good answers become reusable knowledge, corrections become high-priority memories. */
export async function recordFeedback({ conversationId, messageId, rating, comment }) {
  const conv = store.get('conversations', conversationId);
  const idx = conv?.messages.findIndex((m) => m.id === messageId) ?? -1;
  if (idx < 0) throw new Error('Message not found');
  const msg = conv.messages[idx];
  const q = conv.messages[idx - 1]?.content || '';
  msg.rating = rating;
  store.update('conversations', conv.id, { messages: conv.messages });
  store.insert('feedback', { conversationId, messageId, rating, comment: comment || null });

  if (rating === 'up') {
    const refs = (msg.sources || []).filter((s) => s.code || s.title).slice(0, 4)
      .map((s) => `${s.code || s.title}${s.clause ? ` Cl. ${s.clause}` : ''}`).join('; ');
    await addMemory({
      kind: 'validated_answer', origin: 'feedback', conversationId,
      text: `Q: ${q.slice(0, 300)}\nValidated answer (summary): ${msg.content.slice(0, 1200)}${refs ? `\nBased on: ${refs}` : ''}`,
    });
  }
  if (rating === 'down' && comment) {
    await addMemory({ kind: 'correction', origin: 'feedback', conversationId, text: `Correction for "${q.slice(0, 200)}": ${comment}` });
  }
}
