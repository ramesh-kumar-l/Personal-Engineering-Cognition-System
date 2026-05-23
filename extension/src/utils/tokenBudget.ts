// Rough char-to-token ratio for most languages: ~4 chars per token
const CHARS_PER_TOKEN = 4;

export function charsToTokens(chars: number): number {
  return Math.ceil(chars / CHARS_PER_TOKEN);
}

export function tokensToChars(tokens: number): number {
  return tokens * CHARS_PER_TOKEN;
}

export function truncateToChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 20) + '\n... [truncated]';
}
