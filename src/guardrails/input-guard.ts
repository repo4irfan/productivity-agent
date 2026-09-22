const MAX_MESSAGE_CHARS = 2000;

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,                 // OpenAI-style keys
  /\b(api[_-]?key|password|passwd|secret|token)\s*[:=]\s*\S+/i,
];

export type InputVerdict =
  | { ok: true; skipMemory: boolean }
  | { ok: false; reply: string };

export function checkInput(message: string): InputVerdict {
  if (message.length > MAX_MESSAGE_CHARS) {
    return {
      ok: false,
      reply: `That message is too long (${message.length} characters). Please keep it under ${MAX_MESSAGE_CHARS}.`,
    };
  }

  const containsSecret = SECRET_PATTERNS.some((pattern) => pattern.test(message));

  return { ok: true, skipMemory: containsSecret };
}