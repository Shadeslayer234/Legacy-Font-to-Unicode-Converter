import { describe, expect, it } from "vitest";
import { convert, listMappings, mappingForFont, registerMapping } from "../src/index.js";

describe("registry", () => {
  it("ships the FM, DL and Bamini mappings", () => {
    expect(listMappings().map((m) => m.id)).toEqual(expect.arrayContaining(["fm", "dl", "bamini"]));
  });

  it("finds a mapping by font name however Word spells it", () => {
    for (const name of ["FMAbhaya", "FM Abhaya", "fm-abhaya", " fmabhaya "]) {
      expect(mappingForFont(name)?.id).toBe("fm");
    }
    expect(mappingForFont("Times New Roman")).toBeUndefined();
  });

  it("refuses to convert with an empty table instead of returning the input", () => {
    registerMapping({ id: "empty", name: "Empty", script: "sinh", fonts: ["Empty"], map: {} });
    expect(() => convert("abc", { from: "empty" })).toThrow(/no character entries/);
  });

  it("throws for an unknown mapping", () => {
    expect(() => convert("abc", { from: "nope" })).toThrow(/Unknown font mapping/);
  });

  it("uses a registered mapping and its parent", () => {
    registerMapping({ id: "base", name: "Base", script: "sinh", fonts: ["Base"], map: { k: "ක" } });
    registerMapping({
      id: "variant",
      name: "Variant",
      script: "sinh",
      fonts: ["Variant"],
      parent: "base",
      map: { m: "ම" },
    });
    expect(convert("km", { from: "variant" })).toBe("කම");
  });
});
