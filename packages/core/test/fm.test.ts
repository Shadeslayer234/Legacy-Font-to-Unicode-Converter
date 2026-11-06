import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { convert, listMappings, REPAYA_MARK } from "../src/index.js";

// Words typed with the FM keyboard, as the FM Abhaya glyphs show them.
const fm = (text: string) => convert(text, { from: "fm" });

describe("FM", () => {
  it.each([
    ["wdhqfndajka", "ආයුබෝවන්", "kombuva + aela-pilla + hal composes to ෝ"],
    ["› ,xld", "ශ්‍රී ලංකා", "ready-made ශ්‍රී glyph"],
    ["Y=S", "ශ්‍රී", "ශ්‍රී typed from parts"],
    ["fld<U", "කොළඹ", "kombuva before the consonant"],
    ["m=Yakh", "ප්‍රශ්නය", "rakaransaya"],
    ["jsµdj", "විද්‍යාව", "ready-made ද්‍ය"],
    ["úµdj", "විද්‍යාව", "ready-made වි"],
    ["fËa;=h", "ක්‍ෂේත්‍රය", "kombuva moves past the whole ක්‍ෂ conjunct"],
    ["ffi", "සෛ", "two kombuvas are kombu deka"],
    ["ft", "ඓ", "kombuva + එ"],
    ["T!I", "ඖෂ", "ඔ + gayanukitta"],
    ["Ou_h", "ධර්‍මය", "repaya typed after its consonant"],
    ["ldh_d,h", "කාර්‍යාලය", "repaya before a vowel sign"],
    ["ldhd_,h", "කාර්‍යාලය", "repaya after a vowel sign"],
    ["f.or", "ගෙදර", "plain kombuva word"],
    ["2024 j¾I", "2024 වර්ෂ", "digits pass through; ready-made ර්"],
  ])("%s → %s (%s)", (input, expected) => {
    expect(fm(input)).toBe(expected.normalize("NFC"));
  });

  it("drops the designer's signature glyph", () => {
    expect(fm("lÛl")).toBe("කක");
  });

  it("never leaves a repaya marker in the output", () => {
    const keys = Object.keys(listMappings().find((m) => m.id === "fm")!.map);
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...keys, " ")), (parts) => {
        const out = fm(parts.join(""));
        expect(out).not.toContain(REPAYA_MARK);
        expect(out).toBe(out.normalize("NFC"));
      }),
    );
  });
});
