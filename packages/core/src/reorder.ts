import type { Script } from "./types.js";

const ZWJ = "‍";

interface ScriptRules {
  /** Vowel signs typed before the consonant in legacy fonts. */
  prebase: Set<string>;
  isConsonant: (ch: string) => boolean;
  virama: string;
  /** Consonants that join with virama + ZWJ (yansaya, rakaransaya). */
  joiners: Set<string>;
}

const RULES: Record<Script, ScriptRules> = {
  sinh: {
    // kombuva ෙ, kombu deka ෛ
    prebase: new Set(["ෙ", "ෛ"]),
    isConsonant: (ch) => ch >= "ක" && ch <= "ෆ",
    virama: "්",
    joiners: new Set(["ය", "ර"]), // ය, ර
  },
  taml: {
    // ெ ே ை
    prebase: new Set(["ெ", "ே", "ை"]),
    isConsonant: (ch) => ch >= "க" && ch <= "ஹ",
    virama: "்",
    joiners: new Set(),
  },
};

/**
 * Move pre-base vowel signs from before the consonant (typed order) to after
 * the consonant cluster (Unicode order). Composition such as
 * consonant + ෙ + ා → consonant + ො is left to NFC normalization.
 */
export function reorder(text: string, script: Script): string {
  const rules = RULES[script];
  const chars = Array.from(text);
  const out: string[] = [];
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i]!;
    const next = chars[i + 1];
    if (rules.prebase.has(ch) && next !== undefined && rules.isConsonant(next)) {
      out.push(next);
      let j = i + 2;
      // Keep a yansaya / rakaransaya attached to its consonant.
      if (
        chars[j] === rules.virama &&
        chars[j + 1] === ZWJ &&
        rules.joiners.has(chars[j + 2] ?? "")
      ) {
        out.push(chars[j]!, chars[j + 1]!, chars[j + 2]!);
        j += 3;
      }
      out.push(ch);
      i = j;
    } else {
      out.push(ch);
      i += 1;
    }
  }
  return out.join("");
}
