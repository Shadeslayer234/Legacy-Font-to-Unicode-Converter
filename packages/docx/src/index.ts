import { strFromU8, strToU8, unzipSync, zipSync, type Unzipped } from "fflate";

/**
 * DOM implementation to use. Browsers pass nothing (globals are used);
 * Node passes `@xmldom/xmldom`'s DOMParser and XMLSerializer.
 */
export interface XmlImpl {
  DOMParser: new () => { parseFromString(xml: string, type: string): Document };
  XMLSerializer: new () => { serializeToString(node: Node): string };
}

export interface ConvertDocxOptions {
  xml?: XmlImpl;
}

/** Parts that can hold text: body, headers, footers, footnotes, endnotes, comments. */
const TEXT_PART = /^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/;

export function textParts(files: Unzipped): string[] {
  return Object.keys(files).filter((name) => TEXT_PART.test(name)).sort();
}

function resolveXml(opts: ConvertDocxOptions): XmlImpl {
  if (opts.xml) return opts.xml;
  const g = globalThis as Partial<XmlImpl>;
  if (g.DOMParser && g.XMLSerializer) return g as XmlImpl;
  throw new Error("No DOMParser available: pass { xml } (e.g. from @xmldom/xmldom) in Node");
}

/**
 * Convert a .docx file. Week 3 fills in the per-run work:
 * resolve each run's font (run → paragraph style → docDefaults), convert runs
 * whose font has a mapping, switch them to a Unicode font, and handle
 * syllables split across runs.
 *
 * For now it unzips, parses each text part and writes the file back unchanged.
 */
export function convertDocx(input: Uint8Array, opts: ConvertDocxOptions = {}): Uint8Array {
  const { DOMParser, XMLSerializer } = resolveXml(opts);
  const files = unzipSync(input);
  for (const name of textParts(files)) {
    const doc = new DOMParser().parseFromString(strFromU8(files[name]!), "application/xml");
    // TODO(week 3): walk w:r runs and convert legacy-font text.
    files[name] = strToU8(new XMLSerializer().serializeToString(doc));
  }
  return zipSync(files);
}
