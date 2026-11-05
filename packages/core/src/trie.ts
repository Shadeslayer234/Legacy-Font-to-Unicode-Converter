/**
 * A lookup tree over the mapping keys, so the engine always takes the
 * longest legacy sequence that matches at each position.
 */
interface TrieNode {
  next: Map<string, TrieNode>;
  value?: string;
}

export interface Trie {
  root: TrieNode;
}

export function buildTrie(map: Record<string, string>): Trie {
  const root: TrieNode = { next: new Map() };
  for (const [key, value] of Object.entries(map)) {
    if (key.length === 0) continue;
    let node = root;
    for (const ch of key) {
      let child = node.next.get(ch);
      if (!child) {
        child = { next: new Map() };
        node.next.set(ch, child);
      }
      node = child;
    }
    node.value = value;
  }
  return { root };
}

/**
 * Replace every mapped sequence in `input`, longest match first.
 * Characters with no mapping (spaces, digits, English) pass through unchanged.
 */
export function translate(trie: Trie, input: string): string {
  const chars = Array.from(input);
  let out = "";
  let i = 0;
  while (i < chars.length) {
    let node = trie.root;
    let matchLen = 0;
    let matchValue: string | undefined;
    for (let j = i; j < chars.length; j++) {
      const child = node.next.get(chars[j]!);
      if (!child) break;
      node = child;
      if (node.value !== undefined) {
        matchLen = j - i + 1;
        matchValue = node.value;
      }
    }
    if (matchValue !== undefined) {
      out += matchValue;
      i += matchLen;
    } else {
      out += chars[i];
      i += 1;
    }
  }
  return out;
}
