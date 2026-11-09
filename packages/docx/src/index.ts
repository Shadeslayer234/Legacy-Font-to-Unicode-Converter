import { strFromU8, strToU8, unzipSync, zipSync, type Unzipped } from "fflate";
import { convert, mappingForFont, type FontMapping, type Script } from "@lk-unicode/core";
import { convertPart, rewriteFonts, type PartContext } from "./part.js";
import { StyleSheet } from "./styles.js";
import { W } from "./xml.js";

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
  /** Unicode font given to converted text, per script. */
  unicodeFonts?: Partial<Record<Script, string>>;
  /** Which mapping a font name uses. Defaults to the built-in font lists. */
  mappingForFont?: (font: string) => FontMapping | undefined;
}

/** Fonts that come with Windows and Office. */
export const DEFAULT_UNICODE_FONTS: Record<Script, string> = {
  sinh: "Iskoola Pota",
  taml: "Latha",
};

export interface FontUse {
  /** Font name as the file stores it. */
  font: string;
  /** Mapping id when the text was converted; absent when it was left alone. */
  mapping?: string;
  /** Text runs in this font. */
  runs: number;
}

export interface DocxReport {
  /** Fonts found on text, most used first. */
  fonts: FontUse[];
  /** Parts of the file that were changed, e.g. "word/document.xml". */
  parts: string[];
}

export interface DocxResult {
  data: Uint8Array;
  report: DocxReport;
}

export type DocxErrorCode = "legacy-doc" | "not-docx";

export class DocxError extends Error {
  constructor(
    readonly code: DocxErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DocxError";
  }
}

/** Parts that can hold text: body, headers, footers, footnotes, endnotes, comments. */
const TEXT_PART = /^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/;
const STYLE_PARTS = ["word/styles.xml", "word/stylesWithEffects.xml"];

export function textParts(files: Unzipped): string[] {
  return Object.keys(files).filter((name) => TEXT_PART.test(name)).sort();
}

function resolveXml(opts: ConvertDocxOptions): XmlImpl {
  if (opts.xml) return opts.xml;
  const g = globalThis as Partial<XmlImpl>;
  if (g.DOMParser && g.XMLSerializer) return g as XmlImpl;
  throw new Error("No DOMParser available: pass { xml } (e.g. from @xmldom/xmldom) in Node");
}

const startsWith = (data: Uint8Array, bytes: number[]) => bytes.every((b, i) => data[i] === b);

function unzip(input: Uint8Array): Unzipped {
  // Word 97–2003 .doc files are OLE compound files, not zip archives.
  if (startsWith(input, [0xd0, 0xcf, 0x11, 0xe0])) {
    throw new DocxError("legacy-doc", "This is an old .doc file. Open it in Word and save it as .docx first.");
  }
  let files: Unzipped;
  try {
    files = unzipSync(input);
  } catch {
    throw new DocxError("not-docx", "This file is not a .docx Word document.");
  }
  if (!files["word/document.xml"]) {
    throw new DocxError("not-docx", "This file is not a .docx Word document.");
  }
  return files;
}

/**
 * Convert the legacy-font text in a .docx file to Unicode.
 *
 * Each run's font is found by following Word's inheritance (the run, its
 * character style, the paragraph style, the document defaults, theme fonts).
 * Runs in a font with a mapping are converted and switched to a Unicode font;
 * everything else, formatting included, is left as it was. Body, headers,
 * footers, footnotes, endnotes, comments and text boxes are all covered.
 */
export function convertDocx(input: Uint8Array, opts: ConvertDocxOptions = {}): DocxResult {
  const { DOMParser, XMLSerializer } = resolveXml(opts);
  const files = unzip(input);

  const parse = (name: string): Document | undefined => {
    const data = files[name];
    if (!data) return undefined;
    let doc: Document;
    try {
      doc = new DOMParser().parseFromString(strFromU8(data), "application/xml");
    } catch {
      throw new DocxError("not-docx", `The file is damaged: ${name} is not valid XML.`);
    }
    if (doc.getElementsByTagName("parsererror").length > 0) {
      throw new DocxError("not-docx", `The file is damaged: ${name} is not valid XML.`);
    }
    return doc;
  };
  const write = (name: string, doc: Document) => {
    let xml = new XMLSerializer().serializeToString(doc);
    // Keep the XML declaration, which some parsers drop when serializing.
    const decl = /^﻿?(<\?xml[^?]*\?>)/.exec(strFromU8(files[name]!.subarray(0, 200)));
    if (decl && !xml.startsWith("<?xml")) xml = `${decl[1]}\r\n${xml}`;
    files[name] = strToU8(xml);
    parts.push(name);
  };

  const themeName = Object.keys(files).find((n) => /^word\/theme\/theme\d*\.xml$/.test(n));
  const styles = new StyleSheet(parse("word/styles.xml"), themeName ? parse(themeName) : undefined);
  const fonts = { ...DEFAULT_UNICODE_FONTS, ...opts.unicodeFonts };
  const usage = new Map<string, FontUse>();
  const parts: string[] = [];

  const ctx: PartContext = {
    styles,
    lookup: opts.mappingForFont ?? mappingForFont,
    convert: (text, mapping) => convert(text, { from: mapping.id }),
    unicodeFont: (script) => fonts[script],
    tally(font, mapping) {
      const use = usage.get(font) ?? { font, runs: 0, ...(mapping && { mapping: mapping.id }) };
      use.runs += 1;
      usage.set(font, use);
    },
  };

  for (const name of textParts(files)) {
    const doc = parse(name)!;
    if (convertPart(doc, ctx)) write(name, doc);
  }

  // Styles that name a legacy font switch too, so new text typed in them is Unicode.
  for (const name of STYLE_PARTS) {
    const doc = parse(name);
    if (!doc) continue;
    let changed = false;
    for (const rFonts of Array.from(doc.getElementsByTagNameNS(W, "rFonts"))) {
      const rPr = rFonts.parentNode as Element | null;
      if (rPr && rewriteFonts(rPr, ctx)) changed = true;
    }
    if (changed) write(name, doc);
  }

  const report: DocxReport = {
    fonts: [...usage.values()].sort((a, b) => b.runs - a.runs || a.font.localeCompare(b.font)),
    parts,
  };
  // Unchanged files are returned as they came, byte for byte.
  return { data: parts.length ? zipSync(files) : input, report };
}
