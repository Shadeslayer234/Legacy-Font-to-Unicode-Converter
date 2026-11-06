import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { convert, listMappings, mappingForFont, REPAYA_MARK } from "../src/index.js";

// Words typed with the DL keyboard, checked by rendering them in DL Paras.
const dl = (text: string) => convert(text, { from: "dl" });

describe("DL", () => {
  it.each([
    ["wdhqfndajka", "ආයුබෝවන්", "kombuva + aela-pilla + hal composes to ෝ"],
    ["fld<U", "කොළඹ", "kombuva before the consonant"],
    ["lshkak", "කියන්න", "ි and hal"],
    ["uyK", "මහණ", "ණ is K"],
    ["nqoaO", "බුද්ධ", "ධ is O"],
    ["ldhd_,h", "කාර්‍යාලය", "repaya typed after its consonant"],
    ["ffi", "සෛ", "two kombuvas are kombu deka"],
    ["ft", "ඓ", "kombuva + එ"],
    ["ta", "ඒ", "එ + hal"],
    ["wE", "ඈ", "අ + ෑ"],
    ["T!", "ඖ", "ඔ + gayanukitta"],
    ["• ,xld", "ශ්‍රී ලංකා", "ready-made ශ්‍රී glyph"],
    ["Ì", "ක්‍ෂ", "ready-made ක්‍ෂ"],
    ["ìoHd", "බිදඟා", "ready-made බි; ඟ is H"],
  ])("%s → %s (%s)", (input, expected) => {
    expect(dl(input)).toBe(expected.normalize("NFC"));
  });

  it("drops the designer's signature glyph", () => {
    expect(dl("lÛl")).toBe("කක");
  });

  it("is found by the font name the file reports", () => {
    expect(mappingForFont("DL-Paras..")?.id).toBe("dl");
  });

  it("never leaves a repaya marker in the output", () => {
    const keys = Object.keys(listMappings().find((m) => m.id === "dl")!.map);
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...keys, " ")), (parts) => {
        const out = dl(parts.join(""));
        expect(out).not.toContain(REPAYA_MARK);
        expect(out).toBe(out.normalize("NFC"));
      }),
    );
  });
});
