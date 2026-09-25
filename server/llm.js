import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { SYSTEM_PROMPT, LEARN_PROMPT, SUMMARY_PROMPT } from './prompts.js';

export const client = new Anthropic();

const supportsAdaptive = (model) => !/haiku|claude-3|sonnet-4-5|opus-4-5|opus-4-1|opus-4-0|sonnet-4-0/.test(model);

/**
 * Stream a consultant answer. Calls onText(delta) for each text chunk and
 * resolves with { text, usage, stopReason, model }.
 */
export async function streamAnswer(messages, { onText, signal } = {}) {
  const params = {
    model: config.chatModel,
    max_tokens: 32000,
    // Byte-stable system prompt, cached: repeated questions pay ~10% for it.
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages,
  };
  if (supportsAdaptive(config.chatModel)) {
    params.thinking = { type: 'adaptive' };
    params.output_config = { effort: config.chatEffort };
  }

  let stream;
  if (config.enableFallbacks) {
    // Server-side refusal fallback: if a safety classifier declines, the API reroutes in the same call.
    stream = client.beta.messages.stream(
      { ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' },
      { signal },
    );
  } else {
    stream = client.messages.stream(params, { signal });
  }

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') onText?.(event.delta.text);
  }
  const msg = await stream.finalMessage();
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { text, usage: msg.usage, stopReason: msg.stop_reason, model: msg.model };
}

async function utility(system, content, maxTokens = 1024) {
  const msg = await client.messages.create({
    model: config.utilityModel,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content }],
  });
  return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

export async function extractLearnings(question, answer) {
  const raw = await utility(
    LEARN_PROMPT,
    `<user_message>\n${question}\n</user_message>\n<assistant_reply_excerpt>\n${answer.slice(0, 2500)}\n</assistant_reply_excerpt>`,
    800,
  );
  const json = raw.match(/\{[\s\S]*\}/);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json[0]);
    return (parsed.memories || []).filter((m) => m?.text && m.text.length > 12).slice(0, 5);
  } catch {
    return [];
  }
}

export async function summarise(previousSummary, turns) {
  const transcript = turns.map((t) => `${t.role.toUpperCase()}: ${t.content.slice(0, 1500)}`).join('\n\n');
  return utility(SUMMARY_PROMPT, `${previousSummary ? `Previous summary:\n${previousSummary}\n\n` : ''}New turns:\n${transcript}`, 600);
}
