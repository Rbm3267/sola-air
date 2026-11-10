/**
 * One line per model call, so token use shows up in the Vercel runtime logs.
 * It holds the mode, the model and three counts. It never holds the prompt,
 * the answer, the key or the visitor's address.
 */
export interface UsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

export function usageRecord(mode: string, model: string, meta: UsageMetadata | undefined | null) {
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const input = n(meta?.promptTokenCount);
  const output = n(meta?.candidatesTokenCount);
  const thinking = n(meta?.thoughtsTokenCount);
  return {
    event: 'ai_usage',
    mode,
    model,
    inputTokens: input,
    outputTokens: output,
    thinkingTokens: thinking,
    // The API's own total when it gives one; the sum of the parts otherwise.
    totalTokens: n(meta?.totalTokenCount) || input + output + thinking
  };
}
