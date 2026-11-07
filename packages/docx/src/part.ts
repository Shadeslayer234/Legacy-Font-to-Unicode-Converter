import type { FontMapping, Script } from "@lk-unicode/core";
import type { StyleSheet } from "./styles.js";
import {
  MC,
  W,
  childElements,
  createW,
  ensureRPrChild,
  ensureRunRPr,
  isOn,
  removeWAttr,
  setText,
  setWAttr,
  wAttr,
  wChild,
} from "./xml.js";

export interface PartContext {
  styles: StyleSheet;
  /** The mapping for a font name, if it is a legacy font. */
  lookup(font: string): FontMapping | undefined;
  convert(text: string, mapping: FontMapping): string;
  unicodeFont(script: Script): string;
  /** Text runs seen per font name. */
  tally(font: string, mapping: FontMapping | undefined): void;
}

/** A piece of legacy-font text: the contents of a w:t / w:delText, or a w:sym character. */
interface Unit {
  el: Element;
  run: Element;
  pStyle: string | undefined;
  text: string;
  mapping: FontMapping;
}

/** Zero-width markers that sit between runs without breaking the text (spell-check marks, bookmarks…). */
const MARKERS = new Set([
  "bookmarkStart", "bookmarkEnd", "proofErr", "permStart", "permEnd",
  "commentRangeStart", "commentRangeEnd", "moveFromRangeStart", "moveFromRangeEnd",
  "moveToRangeStart", "moveToRangeEnd", "pPr", "sdtPr", "sdtEndPr",
]);
/** Wrappers whose runs continue the surrounding text. */
const TRANSPARENT = new Set(["hyperlink", "smartTag", "sdt", "sdtContent", "fldSimple", "customXml", "dir", "bdo"]);
/** Wrappers whose runs must not join the text around them: tracked insertions and deletions. */
const SEPARATE = new Set(["ins", "del", "moveFrom", "moveTo"]);

/**
 * Convert the legacy-font text in one XML part (body, header, footnotes…).
 * Returns whether anything changed.
 */
export function convertPart(doc: Document, ctx: PartContext): boolean {
  let changed = false;
  // Includes paragraphs inside tables and text boxes; each is handled on its own.
  const paragraphs = Array.from(doc.getElementsByTagNameNS(W, "p"));
  for (const p of paragraphs) {
    const pPr = wChild(p, "pPr");
    const pStyle = wAttr(wChild(pPr, "pStyle"), "val");
    for (const group of collectGroups(p, pStyle, ctx)) {
      convertGroup(group, ctx);
      changed = true;
    }
    // The paragraph mark's own font (it decides the height of an empty line).
    const markRPr = wChild(pPr, "rPr");
    if (markRPr && rewriteFonts(markRPr, ctx)) changed = true;
  }
  return changed;
}

/**
 * Split a paragraph into runs of text that belong together: consecutive
 * pieces in the same legacy mapping, not separated by a tab, break, field,
 * picture, tracked change or text in another font.
 */
function collectGroups(p: Element, pStyle: string | undefined, ctx: PartContext): Unit[][] {
  const groups: Unit[][] = [];
  let current: Unit[] = [];
  const flush = () => {
    if (current.length) groups.push(current);
    current = [];
  };
  const push = (unit: Unit) => {
    if (current.length && current[0]!.mapping !== unit.mapping) flush();
    current.push(unit);
  };

  const visitRun = (run: Element) => {
    const rPr = wChild(run, "rPr");
    const chain = ctx.styles.chain(rPr, pStyle);
    const ascii = ctx.styles.font(chain, "ascii");
    const hAnsi = ctx.styles.font(chain, "hAnsi");
    // Legacy fonts are applied to the ASCII and Windows-1252 ranges; Word normally sets both.
    const asciiMapping = ascii ? ctx.lookup(ascii) : undefined;
    const hAnsiMapping = !asciiMapping && hAnsi ? ctx.lookup(hAnsi) : undefined;
    const mapping = asciiMapping ?? hAnsiMapping;
    const font = asciiMapping ? ascii : hAnsiMapping ? hAnsi : ascii ?? hAnsi;
    let counted = false;

    for (const child of childElements(run)) {
      if (child.namespaceURI !== W) {
        flush();
        continue;
      }
      switch (child.localName) {
        case "rPr":
        case "lastRenderedPageBreak":
          break;
        case "t":
        case "delText": {
          const text = child.textContent ?? "";
          if (!text) break;
          if (!counted && font) ctx.tally(font, mapping);
          counted = true;
          if (mapping) push({ el: child, run, pStyle, text, mapping });
          else flush();
          break;
        }
        case "sym": {
          // A symbol-font character: w:font names the font, w:char its code,
          // often in the F000 private range that Word uses for symbol fonts.
          const symFont = wAttr(child, "font");
          const code = parseInt(wAttr(child, "char") ?? "", 16);
          const symMapping = symFont ? ctx.lookup(symFont) : undefined;
          if (symFont) ctx.tally(symFont, symMapping);
          if (symMapping && Number.isFinite(code)) {
            const text = String.fromCharCode(code >= 0xf000 ? code - 0xf000 : code);
            push({ el: child, run, pStyle, text, mapping: symMapping });
          } else {
            flush();
          }
          break;
        }
        default:
          // w:tab, w:br, w:drawing, w:fldChar, w:footnoteReference…
          flush();
      }
    }
  };

  const visit = (el: Element) => {
    for (const child of childElements(el)) {
      if (child.namespaceURI === MC && child.localName === "AlternateContent") {
        // Choice and Fallback hold the same content twice; keep them apart.
        for (const branch of childElements(child)) {
          flush();
          visit(branch);
        }
        flush();
      } else if (child.namespaceURI !== W) {
        flush();
      } else if (child.localName === "r") {
        visitRun(child);
      } else if (MARKERS.has(child.localName)) {
        // No effect on the text.
      } else if (TRANSPARENT.has(child.localName)) {
        visit(child);
      } else if (SEPARATE.has(child.localName)) {
        flush();
        visit(child);
        flush();
      } else {
        flush();
      }
    }
  };

  visit(p);
  flush();
  return groups;
}

/** How far a cut between two pieces may move to land between syllables. */
const MAX_SHIFT = 8;

/**
 * Convert a group as one text, then hand the result back to its pieces.
 *
 * Word often splits a word across runs, sometimes mid-syllable (a kombuva in
 * one run, its consonant in the next). Each boundary is kept where converting
 * the two sides separately gives the same text as converting them together;
 * otherwise it moves by a few characters to the nearest place where that is
 * true. If there is none, the next piece's text joins the current one.
 */
function convertGroup(units: Unit[], ctx: PartContext): void {
  const mapping = units[0]!.mapping;
  const conv = (s: string) => (s ? ctx.convert(s, mapping) : "");
  const full = units.map((u) => u.text).join("");
  const outs = units.map(() => "");

  let cut = 0; // start of the text not yet handed out
  let owner = 0; // piece that receives it
  let rest = conv(full);
  let pos = 0;
  for (let j = 0; j < units.length - 1; j++) {
    pos += units[j]!.text.length;
    const next = findCut(full, cut, pos, rest, conv);
    if (next === undefined) continue;
    outs[owner] = conv(full.slice(cut, next.at));
    cut = next.at;
    rest = next.rest;
    owner = j + 1;
  }
  outs[owner] = rest;

  const runs = new Map<Element, Unit>();
  units.forEach((unit, i) => {
    writeUnit(unit, outs[i]!);
    runs.set(unit.run, unit);
  });
  for (const unit of runs.values()) switchRunFont(unit, ctx);
}

function findCut(
  full: string,
  start: number,
  boundary: number,
  rest: string,
  conv: (s: string) => string,
): { at: number; rest: string } | undefined {
  for (let d = 0; d <= MAX_SHIFT; d++) {
    for (const at of d === 0 ? [boundary] : [boundary - d, boundary + d]) {
      if (at < start || at > full.length) continue;
      const tail = conv(full.slice(at));
      if (conv(full.slice(start, at)) + tail === rest) return { at, rest: tail };
    }
  }
  return undefined;
}

function writeUnit(unit: Unit, text: string): void {
  if (unit.el.localName !== "sym") {
    setText(unit.el, text);
    return;
  }
  if (text) {
    const t = createW(unit.el.ownerDocument, "t");
    setText(t, text);
    unit.run.replaceChild(t, unit.el);
  } else {
    unit.run.removeChild(unit.el);
  }
}

/**
 * Give a converted run a Unicode font. Sinhala and Tamil are complex scripts,
 * so Word draws them with the run's complex-script properties (w:cs font,
 * w:bCs, w:iCs, w:szCs). The legacy text was drawn with the plain ones, so
 * they are copied across where they differ.
 */
function switchRunFont(unit: Unit, ctx: PartContext): void {
  const { run, pStyle, mapping } = unit;
  const chain = ctx.styles.chain(wChild(run, "rPr"), pStyle);
  const want = {
    b: isOn(ctx.styles.prop(chain, "b")) ?? false,
    bCs: isOn(ctx.styles.prop(chain, "bCs")) ?? false,
    i: isOn(ctx.styles.prop(chain, "i")) ?? false,
    iCs: isOn(ctx.styles.prop(chain, "iCs")) ?? false,
    // Font sizes are in half-points; Word's default is 10 pt.
    sz: wAttr(ctx.styles.prop(chain, "sz"), "val") ?? "20",
    szCs: wAttr(ctx.styles.prop(chain, "szCs"), "val") ?? "20",
  };

  const rPr = ensureRunRPr(run);
  setFonts(ensureRPrChild(rPr, "rFonts"), ctx.unicodeFont(mapping.script));
  if (want.b !== want.bCs) setToggle(ensureRPrChild(rPr, "bCs"), want.b);
  if (want.i !== want.iCs) setToggle(ensureRPrChild(rPr, "iCs"), want.i);
  if (want.sz !== want.szCs) setWAttr(ensureRPrChild(rPr, "szCs"), "val", want.sz);
}

function setFonts(rFonts: Element, font: string): void {
  for (const slot of ["ascii", "hAnsi", "cs"]) setWAttr(rFonts, slot, font);
  for (const theme of ["asciiTheme", "hAnsiTheme", "cstheme"]) removeWAttr(rFonts, theme);
  if (wAttr(rFonts, "hint") === "eastAsia") removeWAttr(rFonts, "hint");
}

function setToggle(el: Element, on: boolean): void {
  if (on) removeWAttr(el, "val");
  else setWAttr(el, "val", "0");
}

/**
 * Switch a w:rPr that names a legacy font directly (in a style, the document
 * defaults or a paragraph mark) to the Unicode font, so text typed later
 * comes out in Unicode too. Returns whether it changed.
 */
export function rewriteFonts(rPr: Element, ctx: PartContext): boolean {
  const rFonts = wChild(rPr, "rFonts");
  const name = wAttr(rFonts, "ascii") ?? wAttr(rFonts, "hAnsi");
  const mapping = name ? ctx.lookup(name) : undefined;
  if (!rFonts || !mapping) return false;
  setFonts(rFonts, ctx.unicodeFont(mapping.script));
  for (const [plain, cs] of [["b", "bCs"], ["i", "iCs"]] as const) {
    const el = wChild(rPr, plain);
    if (el && !wChild(rPr, cs)) setToggle(ensureRPrChild(rPr, cs), isOn(el)!);
  }
  const sz = wAttr(wChild(rPr, "sz"), "val");
  if (sz && !wChild(rPr, "szCs")) setWAttr(ensureRPrChild(rPr, "szCs"), "val", sz);
  return true;
}
