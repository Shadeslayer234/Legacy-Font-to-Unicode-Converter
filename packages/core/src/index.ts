import { createConverter, resolveMapping, type Converter } from "./engine.js";
import type { ConvertOptions, FontMapping, ToLegacyOptions } from "./types.js";
import fm from "../mappings/fm.json" with { type: "json" };

export type { ConvertOptions, FontMapping, Script, ToLegacyOptions } from "./types.js";
export { createConverter, resolveMapping } from "./engine.js";
export { reorder, REPAYA_MARK } from "./reorder.js";

// One import per mappings/*.json file. DL and Bamini arrive in Week 2.
const BUILT_IN: FontMapping[] = [fm as FontMapping];

const registry = new Map<string, FontMapping>(BUILT_IN.map((m) => [m.id, m]));
const cache = new Map<string, Converter>();

/** Add or replace a mapping at runtime (e.g. a community font). */
export function registerMapping(mapping: FontMapping): void {
  registry.set(mapping.id, mapping);
  cache.clear();
}

export function listMappings(): FontMapping[] {
  return [...registry.values()];
}

/** "FM Abhaya", "FM-Abhaya" and "fmabhaya" all name the same font. */
const fontKey = (name: string) => name.toLowerCase().replace(/[\s_-]+/g, "");

/** Find the mapping for a font name as Word stores it, e.g. "FMAbhaya". */
export function mappingForFont(fontName: string): FontMapping | undefined {
  const wanted = fontKey(fontName);
  for (const m of registry.values()) {
    if (m.fonts.some((f) => fontKey(f) === wanted)) return m;
  }
  return undefined;
}

function converterFor(id: string): Converter {
  let c = cache.get(id);
  if (!c) {
    const mapping = registry.get(id);
    if (!mapping) throw new Error(`Unknown font mapping "${id}"`);
    const resolved = resolveMapping(mapping, (pid) => registry.get(pid));
    // Converting with an empty table would silently return the input unchanged.
    if (Object.keys(resolved.map).length === 0) {
      throw new Error(`Font mapping "${id}" has no character entries yet`);
    }
    c = createConverter(resolved);
    cache.set(id, c);
  }
  return c;
}

/** Convert legacy-font text to Unicode. */
export function convert(text: string, options: ConvertOptions): string {
  return converterFor(options.from).convert(text);
}

/** Convert Unicode text to a legacy font encoding. V1: FM only. */
export function toLegacy(_text: string, options: ToLegacyOptions): string {
  throw new Error(`Reverse conversion to "${options.to}" is not implemented yet`);
}
