import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createConverter, resolveMapping, type FontMapping } from "../src/index.js";

// A tiny made-up mapping that exercises the engine. NOT a real FM table.
const toy: FontMapping = {
  id: "toy",
  name: "Toy Sinhala",
  script: "sinh",
  fonts: ["ToyFont"],
  map: {
    k: "ක", // ක
    m: "ම", // ම
    f: "ෙ", // ෙ (kombuva, typed before the consonant)
    a: "ා", // ා
    ff: "ෛ", // ෛ — longer match must win over two "f"
    "%": "්‍ය", // yansaya
  },
};

const toyTamil: FontMapping = {
  id: "toy-ta",
  name: "Toy Tamil",
  script: "taml",
  fonts: ["ToyTamil"],
  map: { k: "க", e: "ெ", a: "ா" },
};

describe("engine", () => {
  const c = createConverter(toy);

  it("maps characters", () => {
    expect(c.convert("km")).toBe("කම");
  });

  it("moves kombuva after the consonant", () => {
    expect(c.convert("fk")).toBe("කෙ");
  });

  it("composes kombuva + aela-pilla into ො via NFC", () => {
    expect(c.convert("fka")).toBe("කො"); // කො
  });

  it("prefers the longest match", () => {
    expect(c.convert("ffk")).toBe("කෛ");
  });

  it("keeps yansaya attached when reordering", () => {
    expect(c.convert("fk%")).toBe("ක්‍යෙ"); // ක්‍යෙ
  });

  it("leaves unmapped text (English, digits) untouched", () => {
    expect(c.convert("Hello 123")).toBe("Hello 123");
  });

  it("reorders Tamil prebase signs and composes ொ", () => {
    expect(createConverter(toyTamil).convert("eka")).toBe("கொ"); // கொ
  });

  it("merges parent mappings", () => {
    const child: FontMapping = { ...toy, id: "child", parent: "toy", map: { k: "X" } };
    const merged = resolveMapping(child, (id) => (id === "toy" ? toy : undefined));
    expect(merged.map.k).toBe("X");
    expect(merged.map.m).toBe("ම");
  });

  it("never throws and always returns NFC", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = c.convert(s);
        expect(out).toBe(out.normalize("NFC"));
      }),
    );
  });
});
