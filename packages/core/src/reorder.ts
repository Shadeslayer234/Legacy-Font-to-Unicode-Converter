import type { Script } from "./types.js";

const ZWJ = "‍";

/**
 * Mapping value for a repaya glyph (ර්‍ drawn above a consonant) that is
 * typed after its consonant. The engine moves it in front of the consonant
 * and writes it as ර්‍. A plain "ර්‍" in a mapping value could not be told
 * apart from ර followed by yansaya (්‍ය), so a marker is used instead.
 */
export const REPAYA_MARK = "";

interface ScriptRules {
  /** Vowel signs typed before the consonant in legacy fonts. */
  prebase: Set<string>;
  isConsonant: (ch: string) => boolean;
  /**
   * How many characters after the consonant at `chars[i]` belong to the same
   * cluster (and so must stay in front of a moved vowel sign).
   */
  clusterTail: (chars: string[], i: number) => number;
  /** Two copies of a prebase sign typed in a row that mean one sign. */
  doubled?: { sign: string; becomes: string };
}

const SINH_KOMBUVA = "ෙ"; // ෙ
const SINH_KOMBU_DEKA = "ෛ"; // ෛ
const SINH_VIRAMA = "්"; // ්
const SINH_RA = "ර"; // ර

const TAML_VIRAMA = "்"; // ்
const TAML_KA = "க"; // க
const TAML_SSA = "ஷ"; // ஷ

const isSinhConsonant = (ch: string | undefined) =>
  ch !== undefined && ch >= "ක" && ch <= "ෆ"; // ක … ෆ

/** Signs that can follow a Sinhala consonant within its syllable. */
const isSinhSign = (ch: string | undefined) =>
  ch !== undefined &&
  ((ch >= "්" && ch <= "ෟ") || ch === "ෲ" || ch === "ෳ" || ch === ZWJ);

const RULES: Record<Script, ScriptRules> = {
  sinh: {
    prebase: new Set([SINH_KOMBUVA, SINH_KOMBU_DEKA]),
    isConsonant: isSinhConsonant,
    // ්‍ + consonant joins it to the one before: yansaya (්‍ය), rakaransaya
    // (්‍ර) and conjuncts such as ක්‍ෂ. A vowel sign goes after all of it.
    clusterTail: (chars, i) => {
      let j = i + 1;
      while (chars[j] === SINH_VIRAMA && chars[j + 1] === ZWJ && isSinhConsonant(chars[j + 2])) {
        j += 3;
      }
      return j - (i + 1);
    },
    // Many legacy fonts have no kombu deka glyph: it is typed as two kombuvas.
    doubled: { sign: SINH_KOMBUVA, becomes: SINH_KOMBU_DEKA },
  },
  taml: {
    prebase: new Set(["ெ", "ே", "ை"]), // ெ ே ை
    isConsonant: (ch) => ch >= "க" && ch <= "ஹ", // க … ஹ
    // க்ஷ is one letter: a vowel sign goes after the whole of it.
    clusterTail: (chars, i) =>
      chars[i] === TAML_KA && chars[i + 1] === TAML_VIRAMA && chars[i + 2] === TAML_SSA ? 2 : 0,
  },
};

/**
 * Put pre-base vowel signs and repaya in Unicode order:
 *
 * - A vowel sign typed before its consonant (ෙ, ெ, ே, ை) moves after the
 *   consonant cluster. Composition such as ක + ෙ + ා → කො is left to NFC.
 * - A repaya typed after its consonant (REPAYA_MARK) moves in front of the
 *   syllable as ර්‍.
 *
 * A sign with nothing to attach to (end of text, a space, a typo) stays put.
 */
export function reorder(text: string, script: Script): string {
  const moved = movePrebase(Array.from(text), RULES[script]);
  return (script === "sinh" ? moveRepaya(moved) : joinTamilAu(moved)).join("");
}

const TAML_E = "ெ"; // ெ
const TAML_LLA = "ள"; // ள
const TAML_AU = "ௌ"; // ௌ
const isTamlSign = (ch: string | undefined) => ch !== undefined && ch >= "ா" && ch <= "்"; // ா … ்

/**
 * Legacy Tamil fonts have no ௌ glyph: கௌ is typed ெ + க + ள, which after
 * moving the ெ reads க + ெ + ள. Join those into ௌ, unless the ள carries a
 * vowel sign or pulli of its own and so is a real letter (கெளுத்தி).
 */
function joinTamilAu(chars: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const prev = out[out.length - 1];
    if (
      chars[i] === TAML_E &&
      chars[i + 1] === TAML_LLA &&
      !isTamlSign(chars[i + 2]) &&
      prev !== undefined &&
      RULES.taml.isConsonant(prev)
    ) {
      out.push(TAML_AU);
      i += 1;
    } else {
      out.push(chars[i]!);
    }
  }
  return out;
}

function movePrebase(chars: string[], rules: ScriptRules): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < chars.length) {
    let sign = chars[i]!;
    let c = i + 1; // index of the consonant the sign belongs to
    if (rules.doubled && sign === rules.doubled.sign && chars[c] === sign) {
      sign = rules.doubled.becomes;
      c += 1;
    }
    const consonant = chars[c];
    if (rules.prebase.has(chars[i]!) && consonant !== undefined && rules.isConsonant(consonant)) {
      const end = c + 1 + rules.clusterTail(chars, c);
      out.push(...chars.slice(c, end), sign);
      i = end;
    } else {
      out.push(chars[i]!);
      i += 1;
    }
  }
  return out;
}

function moveRepaya(chars: string[]): string[] {
  const out: string[] = [];
  for (const ch of chars) {
    if (ch !== REPAYA_MARK) {
      out.push(ch);
      continue;
    }
    // Walk back over the syllable's signs and joined consonants to its start.
    let k = out.length;
    while (k > 0 && isSinhSign(out[k - 1])) k -= 1;
    while (k > 0 && isSinhConsonant(out[k - 1])) {
      k -= 1;
      if (out[k - 1] === ZWJ && out[k - 2] === SINH_VIRAMA && isSinhConsonant(out[k - 3])) {
        k -= 2;
      } else {
        break;
      }
    }
    const atSyllable = k < out.length && isSinhConsonant(out[k]);
    out.splice(atSyllable ? k : out.length, 0, SINH_RA, SINH_VIRAMA, ZWJ);
  }
  return out;
}
