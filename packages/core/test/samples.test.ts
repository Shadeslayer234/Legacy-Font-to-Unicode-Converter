import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convert, listMappings } from "../src/index.js";

/**
 * Golden samples: real text typed in a legacy font, with the Unicode a
 * person has checked by eye. One file per mapping: test/samples/<id>.json,
 * an array of { "legacy", "unicode", "source" }.
 */
interface Sample {
  legacy: string;
  unicode: string;
  /** Where the text came from, e.g. "school exam paper, FM Abhaya, 2019". */
  source: string;
}

const dir = join(import.meta.dirname, "samples");

for (const mapping of listMappings()) {
  const file = join(dir, `${mapping.id}.json`);
  describe(`${mapping.id} samples`, () => {
    if (!existsSync(file)) {
      it.todo(`add real ${mapping.name} text to test/samples/${mapping.id}.json`);
      return;
    }
    const samples = JSON.parse(readFileSync(file, "utf8")) as Sample[];
    samples.forEach((s, n) => {
      it(`#${n + 1} ${s.source}`, () => {
        expect(convert(s.legacy, { from: mapping.id })).toBe(s.unicode.normalize("NFC"));
      });
    });
  });
}

it("every samples file belongs to a known mapping", () => {
  if (!existsSync(dir)) return;
  const ids = new Set(listMappings().map((m) => m.id));
  const orphans = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length))
    .filter((id) => !ids.has(id));
  expect(orphans).toEqual([]);
});
