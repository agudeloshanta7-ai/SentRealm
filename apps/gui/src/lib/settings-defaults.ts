/** Mirrors sentrealm_core.models defaults for GUI-only restore. */

export const DEFAULT_PUNCTUATION_HARD_BREAK: string[] = [
  "。",
  "！",
  "？",
  "!",
  "?",
];

export const DEFAULT_PUNCTUATION_CANDIDATES: string[] = [
  "，",
  ",",
  "；",
  ";",
  "：",
  ":",
  "、",
  "——",
  "…",
  "“",
  "”",
  "‘",
  "’",
  '"',
  "'",
  "（",
  "）",
  "(",
  ")",
];

export const DEFAULT_PUNCTUATION_REMOVE_ONLY: string[] = ["％"];

export const DEFAULT_PUNCTUATION_KEEP: string[] = ["%", "."];

export const DEFAULT_PUNCTUATION_REMOVE: string[] = [
  ...DEFAULT_PUNCTUATION_HARD_BREAK,
  ...DEFAULT_PUNCTUATION_CANDIDATES,
  ...DEFAULT_PUNCTUATION_REMOVE_ONLY,
];

export const PRESET_MAX_CHARS = {
  landscape: 15,
  portrait: 10,
} as const;

/** Mirrors sentrealm_core.models.DEFAULT_MIN_CHARS */
export const DEFAULT_MIN_CHARS = 5;

export const DEFAULT_DOCUMENT_TITLES = ["未命名文稿", "新建文稿"] as const;
