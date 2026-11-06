import { describe, expect, it } from "vitest";
import { convert, mappingForFont } from "../src/index.js";

// Words typed with the Bamini keyboard, checked by rendering them in Bamini.
const bamini = (text: string) => convert(text, { from: "bamini" });

describe("Bamini", () => {
  it.each([
    ["jkpo;", "தமிழ்", "ி after its consonant; pulli is ;"],
    ["ehL", "நாடு", "ready-made டு"],
    ["tzf;fk;", "வணக்கம்", "pulli on several consonants"],
    ["nfh", "கொ", "ெ + க + ா composes to ொ"],
    ["Nfh", "கோ", "ே + க + ா composes to ோ"],
    ["Nf", "கே", "ே typed before the consonant"],
    ["if", "கை", "ை typed before the consonant"],
    ["nfs", "கௌ", "ெ + க + ள is ௌ"],
    ["nkhopfs", "மொழிகள", "ள after a consonant without ெ stays a letter"],
    ["nfSj;jp", "கெளுத்தி", "ள with its own vowel sign stays a letter"],
    ["J}", "தூ", "ு glyph + extension stroke is ூ"],
    ["$", "கூ", "ready-made கூ"],
    ["[{", "ஜு", "grantha ு"],
    ["=", "ஸ்ரீ", "ready-made ஸ்ரீ"],
    ["/", "ஃ", "aytham"],
  ])("%s → %s (%s)", (input, expected) => {
    expect(bamini(input)).toBe(expected.normalize("NFC"));
  });

  it("types a comma with > because , is இ", () => {
    expect(bamini(",d>")).toBe("இன,");
  });

  it("drops the designer's signature glyph", () => {
    expect(bamini("f©f")).toBe("கக");
  });

  it("is found by font name", () => {
    expect(mappingForFont("Bamini")?.id).toBe("bamini");
  });
});
