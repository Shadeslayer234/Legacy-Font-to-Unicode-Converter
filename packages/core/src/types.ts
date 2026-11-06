/** Script a mapping produces. Decides which reordering rules apply. */
export type Script = "sinh" | "taml";

/**
 * One legacy font's character table, as stored in `mappings/*.json`.
 * Keys are the characters the legacy font draws a glyph for; values are the
 * Unicode text that glyph means, written in *visual* (typed) order.
 * The engine fixes the order afterwards.
 */
export interface FontMapping {
  /** Short id used in the API, e.g. "fm". */
  id: string;
  /** Human-readable name, e.g. "FM Abhaya family". */
  name: string;
  script: Script;
  /** Font names (as Word stores them) this mapping applies to. */
  fonts: string[];
  /** Id of a mapping this one extends; only differing entries are listed. */
  parent?: string;
  /**
   * Legacy sequence → Unicode. A repaya glyph typed after its consonant maps
   * to U+E000 (REPAYA_MARK); the engine moves it in front as ර්‍.
   */
  map: Record<string, string>;
}

export interface ConvertOptions {
  /** Mapping id, e.g. "fm", "dl", "bamini". */
  from: string;
}

export interface ToLegacyOptions {
  /** Mapping id to convert into. V1 supports "fm" only. */
  to: string;
}
