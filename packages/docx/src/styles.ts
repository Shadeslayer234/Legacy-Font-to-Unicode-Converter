import { A, W, childElements, wAttr, wChild } from "./xml.js";

/** A font slot of w:rFonts. Legacy fonts draw ASCII (ascii) and Windows-1252 (hAnsi) characters. */
export type FontSlot = "ascii" | "hAnsi" | "cs";

const THEME_ATTR: Record<FontSlot, string> = { ascii: "asciiTheme", hAnsi: "hAnsiTheme", cs: "cstheme" };

interface Style {
  type: string;
  basedOn?: string;
  rPr?: Element;
}

interface ThemeFonts {
  major: { latin?: string; cs?: string; ea?: string };
  minor: { latin?: string; cs?: string; ea?: string };
}

/**
 * Run-property inheritance in a document:
 * direct run properties → character style chain → paragraph style chain
 * (or the default paragraph style) → document defaults.
 */
export class StyleSheet {
  private styles = new Map<string, Style>();
  private defaultParagraph?: string;
  private docDefaults?: Element;
  private theme: ThemeFonts = { major: {}, minor: {} };

  constructor(styles?: Document, theme?: Document) {
    if (styles) this.readStyles(styles);
    if (theme) this.readTheme(theme);
  }

  private readStyles(doc: Document): void {
    const root = doc.documentElement;
    this.docDefaults = wChild(wChild(wChild(root, "docDefaults"), "rPrDefault"), "rPr");
    for (const el of childElements(root)) {
      if (el.namespaceURI !== W || el.localName !== "style") continue;
      const id = wAttr(el, "styleId");
      if (!id) continue;
      const type = wAttr(el, "type") ?? "paragraph";
      this.styles.set(id, { type, basedOn: wAttr(wChild(el, "basedOn"), "val"), rPr: wChild(el, "rPr") });
      const isDefault = ["1", "true", "on"].includes(wAttr(el, "default") ?? "");
      if (type === "paragraph" && isDefault) this.defaultParagraph = id;
    }
  }

  private readTheme(doc: Document): void {
    const scheme = doc.getElementsByTagNameNS(A, "fontScheme")[0];
    if (!scheme) return;
    for (const kind of ["major", "minor"] as const) {
      const group = scheme.getElementsByTagNameNS(A, `${kind}Font`)[0];
      if (!group) continue;
      for (const slot of ["latin", "cs", "ea"] as const) {
        const face = group.getElementsByTagNameNS(A, slot)[0]?.getAttribute("typeface");
        if (face) this.theme[kind][slot] = face;
      }
    }
  }

  private styleChain(id: string | undefined, out: Element[]): void {
    const seen = new Set<string>();
    while (id && !seen.has(id)) {
      seen.add(id);
      const style = this.styles.get(id);
      if (!style) break;
      if (style.rPr) out.push(style.rPr);
      id = style.basedOn;
    }
  }

  /**
   * Every w:rPr that can set a run's properties, most specific first.
   * `rPr` is the run's own w:rPr; `pStyle` the paragraph's style id.
   */
  chain(rPr: Element | undefined, pStyle: string | undefined): Element[] {
    const out: Element[] = [];
    if (rPr) out.push(rPr);
    this.styleChain(wAttr(wChild(rPr, "rStyle"), "val"), out);
    this.styleChain(pStyle ?? this.defaultParagraph, out);
    if (this.docDefaults) out.push(this.docDefaults);
    return out;
  }

  /** The font a run uses for one slot, following themes. */
  font(chain: Element[], slot: FontSlot): string | undefined {
    for (const rPr of chain) {
      const rFonts = wChild(rPr, "rFonts");
      if (!rFonts) continue;
      const theme = wAttr(rFonts, THEME_ATTR[slot]);
      if (theme) return this.themeFont(theme);
      const name = wAttr(rFonts, slot);
      if (name) return name;
    }
    return undefined;
  }

  private themeFont(value: string): string | undefined {
    const fonts = value.startsWith("major") ? this.theme.major : this.theme.minor;
    if (value.endsWith("Bidi")) return fonts.cs;
    if (value.endsWith("EastAsia")) return fonts.ea;
    return fonts.latin;
  }

  /** The nearest element `local` (e.g. "b", "sz") along the chain. */
  prop(chain: Element[], local: string): Element | undefined {
    for (const rPr of chain) {
      const el = wChild(rPr, local);
      if (el) return el;
    }
    return undefined;
  }
}
