import { reorder } from "./reorder.js";
import { buildTrie, translate, type Trie } from "./trie.js";
import type { FontMapping } from "./types.js";

export interface Converter {
  mapping: FontMapping;
  convert(text: string): string;
}

/** Merge a mapping with its parent chain, child entries winning. */
export function resolveMapping(
  mapping: FontMapping,
  lookup: (id: string) => FontMapping | undefined,
): FontMapping {
  if (!mapping.parent) return mapping;
  const parent = lookup(mapping.parent);
  if (!parent) {
    throw new Error(`Mapping "${mapping.id}" extends unknown parent "${mapping.parent}"`);
  }
  const base = resolveMapping(parent, lookup);
  return { ...mapping, map: { ...base.map, ...mapping.map } };
}

/** Legacy → Unicode: lookup tree, then reordering, then NFC. */
export function createConverter(mapping: FontMapping): Converter {
  const trie: Trie = buildTrie(mapping.map);
  return {
    mapping,
    convert(text) {
      return reorder(translate(trie, text), mapping.script).normalize("NFC");
    },
  };
}
