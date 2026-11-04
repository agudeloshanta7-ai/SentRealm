/** Character count aligned with AppShell / core display rules. */

export function countLineChars(text: string): number {
  let count = 0;
  for (const ch of text) {
    if (/[\u4e00-\u9fff\u3400-\u4dbfA-Za-z0-9]/.test(ch)) count += 1;
  }
  return count;
}

export function formatLineNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export function parsePunctuationKeep(raw: string): string[] {
  return parsePunctuationTokens(raw);
}

export function formatPunctuationKeep(tokens: string[]): string {
  return formatPunctuationTokens(tokens);
}

export function parsePunctuationTokens(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (/\s+/u.test(raw)) {
    const tokens = raw.split(/\s+/u).filter((t) => t.length > 0);
    return [...new Set(tokens)];
  }
  return [...new Set(Array.from(raw).filter((token) => !/\s/u.test(token)))];
}

export function formatPunctuationTokens(tokens?: string[]): string {
  return (tokens ?? []).join(" ");
}

export function resolvePunctuationSettings(partial: {
  keep: string[];
  hard: string[];
  candidates: string[];
  removeOnly: string[];
}) {
  const keep = [...new Set(partial.keep)];
  const keepSet = new Set(keep);

  const hard = [...new Set(partial.hard)].filter((t) => !keepSet.has(t));
  const hardSet = new Set(hard);

  const candidates = [...new Set(partial.candidates)].filter(
    (t) => !keepSet.has(t) && !hardSet.has(t),
  );
  const candidateSet = new Set(candidates);

  const removeOnly = [...new Set(partial.removeOnly)].filter(
    (t) => !keepSet.has(t) && !hardSet.has(t) && !candidateSet.has(t),
  );

  return {
    punctuation_keep: keep,
    punctuation_hard_breaks: hard,
    punctuation_candidates: candidates,
    punctuation_remove_only: removeOnly,
    punctuation_remove: [...hard, ...candidates, ...removeOnly],
  };
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return iso;

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;

  return date.toLocaleString();
}

export function suggestTitleFromText(text: string, maxLen = 28): string {
  const firstLine = text.split("\n").find((line) => line.trim())?.trim() ?? "";
  if (!firstLine) return "";
  return firstLine.length <= maxLen ? firstLine : firstLine.slice(0, maxLen);
}
