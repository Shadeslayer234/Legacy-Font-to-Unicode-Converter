/** WordprocessingML main namespace (the `w:` prefix). */
export const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
/** DrawingML namespace (the `a:` prefix), used by the theme part. */
export const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
/** Markup-compatibility namespace (the `mc:` prefix). */
export const MC = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const XML_NS = "http://www.w3.org/XML/1998/namespace";

const ELEMENT_NODE = 1;

/** Child elements, in order. (xmldom has no `children`, so walk childNodes.) */
export function childElements(el: Element): Element[] {
  const out: Element[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === ELEMENT_NODE) out.push(n as Element);
  }
  return out;
}

export const isW = (el: Element, local: string) => el.namespaceURI === W && el.localName === local;

export function wChild(el: Element | null | undefined, local: string): Element | undefined {
  if (!el) return undefined;
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === ELEMENT_NODE && isW(n as Element, local)) return n as Element;
  }
  return undefined;
}

/** A `w:` attribute, or undefined when it is absent. */
export function wAttr(el: Element | null | undefined, local: string): string | undefined {
  if (!el || !el.hasAttributeNS(W, local)) return undefined;
  return el.getAttributeNS(W, local) ?? undefined;
}

export function setWAttr(el: Element, local: string, value: string): void {
  el.setAttributeNS(W, `w:${local}`, value);
}

export function removeWAttr(el: Element, local: string): void {
  if (el.hasAttributeNS(W, local)) el.removeAttributeNS(W, local);
}

export function createW(doc: Document, local: string): Element {
  return doc.createElementNS(W, `w:${local}`);
}

/** Replace an element's text, keeping leading and trailing spaces. */
export function setText(el: Element, text: string): void {
  while (el.firstChild) el.removeChild(el.firstChild);
  if (text) el.appendChild(el.ownerDocument.createTextNode(text));
  el.setAttributeNS(XML_NS, "xml:space", "preserve");
}

/**
 * Order of the children of w:rPr in the schema (CT_RPr). Word rejects a file
 * whose run properties are out of order, so new ones are inserted in place.
 */
const RPR_ORDER = [
  "rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike",
  "outline", "shadow", "emboss", "imprint", "noProof", "snapToGrid", "vanish", "webHidden",
  "color", "spacing", "w", "kern", "position", "sz", "szCs", "highlight", "u", "effect",
  "bdr", "shd", "fitText", "vertAlign", "rtl", "cs", "em", "lang", "eastAsianLayout",
  "specVanish", "oMath", "rPrChange",
];

/** Get w:rPr's child `local`, creating it in schema order if it is missing. */
export function ensureRPrChild(rPr: Element, local: string): Element {
  const existing = wChild(rPr, local);
  if (existing) return existing;
  const el = createW(rPr.ownerDocument, local);
  const rank = RPR_ORDER.indexOf(local);
  const before = childElements(rPr).find((c) => c.namespaceURI === W && RPR_ORDER.indexOf(c.localName) > rank);
  rPr.insertBefore(el, before ?? null);
  return el;
}

/** The run's w:rPr, created as its first child if missing. */
export function ensureRunRPr(run: Element): Element {
  const existing = wChild(run, "rPr");
  if (existing) return existing;
  const rPr = createW(run.ownerDocument, "rPr");
  run.insertBefore(rPr, run.firstChild);
  return rPr;
}

/** On/off properties (w:b, w:i…): present means on unless w:val says otherwise. */
export function isOn(el: Element | undefined): boolean | undefined {
  if (!el) return undefined;
  const val = wAttr(el, "val");
  return val === undefined || !["0", "false", "off"].includes(val);
}
