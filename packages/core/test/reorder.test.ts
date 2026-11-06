import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { reorder } from "../src/index.js";

const KA = "ක"; // ක
const KOMBUVA = "ෙ"; // ෙ
const KOMBU_DEKA = "ෛ"; // ෛ
const RAKARANSAYA = "්‍ර"; // ්‍ර
const YANSAYA = "්‍ය"; // ්‍ය

const T_KA = "க"; // க
const T_SSA = "ஷ"; // ஷ
const T_VIRAMA = "்"; // ்
const T_E = "ெ"; // ெ

describe("reorder (Sinhala)", () => {
  it("moves kombuva after the consonant", () => {
    expect(reorder(KOMBUVA + KA, "sinh")).toBe(KA + KOMBUVA);
  });

  it("moves kombuva past rakaransaya and yansaya", () => {
    expect(reorder(KOMBUVA + KA + RAKARANSAYA, "sinh")).toBe(KA + RAKARANSAYA + KOMBUVA);
    expect(reorder(KOMBUVA + KA + YANSAYA, "sinh")).toBe(KA + YANSAYA + KOMBUVA);
  });

  it("reads two typed kombuvas as kombu deka", () => {
    expect(reorder(KOMBUVA + KOMBUVA + KA, "sinh")).toBe(KA + KOMBU_DEKA);
  });

  it("leaves a kombuva with no consonant after it in place", () => {
    expect(reorder(KOMBUVA, "sinh")).toBe(KOMBUVA);
    expect(reorder(KOMBUVA + " " + KA, "sinh")).toBe(KOMBUVA + " " + KA);
  });

  it("moves a repaya in front of its syllable, or leaves it when there is none", () => {
    const REPAYA = "ර්‍"; // ර්‍
    expect(reorder(KA + "", "sinh")).toBe(REPAYA + KA);
    expect(reorder(KA + YANSAYA + "ා", "sinh")).toBe(REPAYA + KA + YANSAYA + "ා");
    expect(reorder("", "sinh")).toBe(REPAYA);
    expect(reorder(" ", "sinh")).toBe(" " + REPAYA);
  });

  it("handles several syllables in a row", () => {
    expect(reorder(KOMBUVA + KA + KOMBUVA + KA, "sinh")).toBe(KA + KOMBUVA + KA + KOMBUVA);
  });
});

describe("reorder (Tamil)", () => {
  it("moves a vowel sign past the whole of க்ஷ", () => {
    const ksha = T_KA + T_VIRAMA + T_SSA;
    expect(reorder(T_E + ksha, "taml")).toBe(ksha + T_E);
  });

  it("only rearranges characters, never adds or drops them", () => {
    const alphabet = fc.constantFrom(T_KA, T_SSA, T_VIRAMA, T_E, "ே", "ை", "ா", " ");
    fc.assert(
      fc.property(fc.array(alphabet), (parts) => {
        const input = parts.join("");
        const sorted = (s: string) => Array.from(s).sort().join("");
        expect(sorted(reorder(input, "taml"))).toBe(sorted(input));
      }),
    );
  });
});

describe("reorder (any script)", () => {
  it("is the identity on text with no prebase signs", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const clean = s.replace(/[ෙෛெ-ை]/gu, "");
        expect(reorder(clean, "sinh")).toBe(clean);
        expect(reorder(clean, "taml")).toBe(clean);
      }),
    );
  });
});
