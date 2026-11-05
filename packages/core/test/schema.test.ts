import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import schema from "../mappings/schema.json" with { type: "json" };

// Every mappings/*.json file (except the schema) must match the schema.
// This test is what CI runs to validate contributed fonts.
const dir = join(import.meta.dirname, "..", "mappings");
const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "schema.json");

describe("mapping files", () => {
  const ajv = new Ajv2020({ allErrors: true });
  const validate = ajv.compile(schema);

  it("schema compiles", () => {
    expect(validate).toBeTypeOf("function");
  });

  for (const file of files) {
    it(`${file} matches the schema`, () => {
      const data = JSON.parse(readFileSync(join(dir, file), "utf8"));
      const ok = validate(data);
      expect(validate.errors ?? []).toEqual([]);
      expect(ok).toBe(true);
    });
  }
});
