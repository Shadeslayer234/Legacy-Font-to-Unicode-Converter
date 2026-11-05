import { createConverter, resolveMapping, type Converter } from "./engine.js";
import type { ConvertOptions, FontMapping, ToLegacyOptions } from "./types.js";

export type { ConvertOptions, FontMapping, Script, ToLegacyOptions } from "./types.js";
export { createConverter, resolveMapping } from "./engine.js";
export { reorder } from "./reorder.js";

// Built-in mappings are added here as they are written (Week 1: FM).
const BUILT_IN: FontMapping[] = [];

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

/** Find the mapping for a font name as Word stores it, e.g. "FMAbhaya". */
export function mappingForFont(fontName: string): FontMapping | undefined {
  const wanted = fontName.trim().toLowerCase();
  for (const m of registry.values()) {
    if (m.fonts.some((f) => f.toLowerCase() === wanted)) return m;
  }
  return undefined;
}

function converterFor(id: string): Converter {
  let c = cache.get(id);
  if (!c) {
    const mapping = registry.get(id);
    if (!mapping) throw new Error(`Unknown font mapping "${id}"`);
    c = createConverter(resolveMapping(mapping, (pid) => registry.get(pid)));
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
