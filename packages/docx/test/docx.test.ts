import { describe, expect, it } from "vitest";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { convertDocx, DocxError, type XmlImpl } from "../src/index.js";

const xml = { DOMParser, XMLSerializer } as unknown as XmlImpl;
const NS = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"`;
const DECL = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n`;

const font = (name: string) => `<w:rFonts w:ascii="${name}" w:hAnsi="${name}"/>`;
/** A run; `props` goes inside w:rPr. */
const r = (text: string, props = "") =>
  `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${text}</w:t></w:r>`;
const fm = (text: string, extra = "") => r(text, font("FMAbhaya") + extra);
const p = (inner: string, pPr = "") => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${inner}</w:p>`;

function makeDocx(body: string, extra: Record<string, string> = {}): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`${DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`),
    "word/document.xml": strToU8(`${DECL}<w:document ${NS}><w:body>${body}</w:body></w:document>`),
  };
  for (const [name, content] of Object.entries(extra)) files[name] = strToU8(DECL + content);
  return zipSync(files);
}

const styles = (inner: string) => `<w:styles ${NS}>${inner}</w:styles>`;

function run(body: string, extra?: Record<string, string>) {
  const { data, report } = convertDocx(makeDocx(body, extra), { xml });
  const files = unzipSync(data);
  const part = (name: string) => strFromU8(files[name]!);
  const doc = (name = "word/document.xml") => new DOMParser().parseFromString(part(name), "application/xml");
  /** Text of each paragraph's runs, as an array per paragraph. */
  const runs = (name?: string) =>
    Array.from(doc(name).getElementsByTagName("w:p")).map((para) =>
      Array.from(para.getElementsByTagName("w:r"))
        .map((rr) => Array.from(rr.getElementsByTagName("w:t")).map((t) => t.textContent).join("")),
    );
  return { report, part, doc, runs };
}

describe("convertDocx", () => {
  it("converts runs in a legacy font and leaves other runs alone", () => {
    const { runs, part, report } = run(p(fm("wdhqfndajka") + r(" Hello", font("Times New Roman"))));
    expect(runs()).toEqual([["ආයුබෝවන්", " Hello"]]);
    expect(part("word/document.xml")).toContain('w:ascii="Iskoola Pota"');
    expect(part("word/document.xml")).toContain('w:cs="Iskoola Pota"');
    expect(part("word/document.xml")).toContain('w:ascii="Times New Roman"');
    expect(report.fonts).toEqual([
      { font: "FMAbhaya", mapping: "fm", runs: 1 },
      { font: "Times New Roman", runs: 1 },
    ]);
  });

  it("keeps the XML declaration and spaces at the ends of text", () => {
    const { part } = run(p(fm(" f.or ")));
    expect(part("word/document.xml").startsWith("<?xml")).toBe(true);
    expect(part("word/document.xml")).toMatch(/<w:t xml:space="preserve"> ගෙදර <\/w:t>/);
  });

  it("converts Bamini to Tamil with the Tamil font", () => {
    const { runs, part } = run(p(r("jkpo;", font("Bamini"))));
    expect(runs()).toEqual([["தமிழ்"]]);
    expect(part("word/document.xml")).toContain('w:cs="Latha"');
  });

  it("uses the Unicode fonts passed in", () => {
    const { data } = convertDocx(makeDocx(p(fm("f.or"))), { xml, unicodeFonts: { sinh: "Noto Sans Sinhala" } });
    expect(strFromU8(unzipSync(data)["word/document.xml"]!)).toContain('w:cs="Noto Sans Sinhala"');
  });

  describe("font inheritance", () => {
    it("from the paragraph style and its basedOn chain", () => {
      const { runs } = run(p(r("f.or"), `<w:pStyle w:val="Child"/>`), {
        "word/styles.xml": styles(
          `<w:style w:type="paragraph" w:styleId="Base"><w:rPr>${font("FM Abhaya")}</w:rPr></w:style>` +
            `<w:style w:type="paragraph" w:styleId="Child"><w:basedOn w:val="Base"/></w:style>`,
        ),
      });
      expect(runs()).toEqual([["ගෙදර"]]);
    });

    it("from the default paragraph style", () => {
      const { runs } = run(p(r("f.or")), {
        "word/styles.xml": styles(
          `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:rPr>${font("FMAbhaya")}</w:rPr></w:style>`,
        ),
      });
      expect(runs()).toEqual([["ගෙදර"]]);
    });

    it("from the document defaults", () => {
      const { runs } = run(p(r("f.or")), {
        "word/styles.xml": styles(`<w:docDefaults><w:rPrDefault><w:rPr>${font("FMAbhaya")}</w:rPr></w:rPrDefault></w:docDefaults>`),
      });
      expect(runs()).toEqual([["ගෙදර"]]);
    });

    it("from a character style, which beats the paragraph style", () => {
      const { runs } = run(p(r("f.or", `<w:rStyle w:val="Sinhala"/>`) + r("f.or"), `<w:pStyle w:val="English"/>`), {
        "word/styles.xml": styles(
          `<w:style w:type="paragraph" w:styleId="English"><w:rPr>${font("Arial")}</w:rPr></w:style>` +
            `<w:style w:type="character" w:styleId="Sinhala"><w:rPr>${font("FMAbhaya")}</w:rPr></w:style>`,
        ),
      });
      expect(runs()).toEqual([["ගෙදර", "f.or"]]);
    });

    it("direct formatting beats the styles", () => {
      const { runs } = run(p(r("f.or", font("Arial"))), {
        "word/styles.xml": styles(`<w:docDefaults><w:rPrDefault><w:rPr>${font("FMAbhaya")}</w:rPr></w:rPrDefault></w:docDefaults>`),
      });
      expect(runs()).toEqual([["f.or"]]);
    });

    it("through theme fonts", () => {
      const theme =
        `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:themeElements><a:fontScheme name="x">` +
        `<a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="FMAbhaya"/></a:minorFont>` +
        `</a:fontScheme></a:themeElements></a:theme>`;
      const { runs, part } = run(
        p(r("f.or", `<w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/>`) + r("f.or", `<w:rFonts w:asciiTheme="majorHAnsi"/>`)),
        { "word/theme/theme1.xml": theme },
      );
      expect(runs()).toEqual([["ගෙදර", "f.or"]]);
      // The theme attribute would override the new font, so it is removed.
      expect(part("word/document.xml")).not.toContain('w:asciiTheme="minorHAnsi"');
    });
  });

  describe("split runs", () => {
    it("joins a kombuva typed in one run with its consonant in the next", () => {
      const { runs } = run(p(fm("wdhqf") + fm("ndajka", "<w:b/>")));
      expect(runs()[0]!.join("")).toBe("ආයුබෝවන්");
      // The cut moves to the syllable boundary, so the bold run keeps බෝවන්.
      expect(runs()).toEqual([["ආයු", "බෝවන්"]]);
    });

    it("ignores spell-check and bookmark marks between runs", () => {
      const { runs } = run(
        p(`${fm("f")}<w:proofErr w:type="spellStart"/><w:bookmarkStart w:id="0" w:name="x"/>${fm(".or")}<w:bookmarkEnd w:id="0"/>`),
      );
      expect(runs()[0]!.join("")).toBe("ගෙදර");
    });

    it("follows text into hyperlinks", () => {
      const { runs } = run(p(`${fm("f")}<w:hyperlink r:id="x" xmlns:r="urn:r">${fm(".or")}</w:hyperlink>`));
      expect(runs()[0]!.join("")).toBe("ගෙදර");
    });

    it("does not join text across a tab", () => {
      const { runs } = run(p(`<w:r><w:rPr>${font("FMAbhaya")}</w:rPr><w:t>f</w:t><w:tab/><w:t>.or</w:t></w:r>`));
      expect(runs()[0]!.join("")).toBe("ෙගදර");
    });

    it("does not join text in different fonts", () => {
      const { runs } = run(p(fm("f") + r(".or", font("Arial"))));
      expect(runs()).toEqual([["ෙ", ".or"]]);
    });

    it("does not join a tracked deletion with the text after it", () => {
      const { runs } = run(p(`<w:del w:id="1" w:author="a"><w:r><w:rPr>${font("FMAbhaya")}</w:rPr><w:delText>f</w:delText></w:r></w:del>${fm(".or")}`));
      const d = run(p(`<w:del w:id="1" w:author="a"><w:r><w:rPr>${font("FMAbhaya")}</w:rPr><w:delText>f</w:delText></w:r></w:del>`));
      expect(d.part("word/document.xml")).toContain(">ෙ</w:delText>");
      expect(runs()[0]).toEqual(["", "ගදර"]);
    });
  });

  it("converts headers, footers, footnotes and endnotes", () => {
    const part = (tag: string) => `<w:${tag} ${NS}>${p(fm("f.or"))}</w:${tag}>`;
    const extra = {
      "word/header1.xml": part("hdr"),
      "word/footer2.xml": part("ftr"),
      "word/footnotes.xml": `<w:footnotes ${NS}><w:footnote w:id="1">${p(fm("f.or"))}</w:footnote></w:footnotes>`,
      "word/endnotes.xml": `<w:endnotes ${NS}><w:endnote w:id="1">${p(fm("f.or"))}</w:endnote></w:endnotes>`,
    };
    const { runs, report } = run(p(fm("f.or")), extra);
    for (const name of Object.keys(extra)) expect(runs(name)).toEqual([["ගෙදර"]]);
    expect(report.parts.sort()).toEqual(["word/document.xml", ...Object.keys(extra)].sort());
  });

  it("converts text boxes, both the drawing and its VML fallback", () => {
    const box = `<w:txbxContent>${p(fm("f.or"))}</w:txbxContent>`;
    const { part } = run(
      p(
        `${fm("wdhqfndajka")}<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing>${box}</w:drawing></mc:Choice>` +
          `<mc:Fallback><w:pict>${box}</w:pict></mc:Fallback></mc:AlternateContent></w:r>`,
      ),
    );
    const xmlText = part("word/document.xml");
    expect(xmlText.match(/ගෙදර/g)).toHaveLength(2);
    expect(xmlText).toContain("ආයුබෝවන්");
  });

  it("converts w:sym characters in a legacy font", () => {
    const { part } = run(p(`${fm("f")}<w:r><w:sym w:font="FMAbhaya" w:char="F02E"/></w:r>${fm("or")}`));
    expect(part("word/document.xml")).not.toContain("w:sym");
    expect(part("word/document.xml").replace(/<[^>]+>/g, "").trim()).toBe("ගෙදර");
  });

  describe("complex-script formatting", () => {
    it("copies bold, italic and size to their complex-script versions", () => {
      const { part } = run(p(fm("f.or", `<w:b/><w:i/><w:sz w:val="28"/>`)));
      expect(part("word/document.xml")).toContain(
        `<w:rPr><w:rFonts w:ascii="Iskoola Pota" w:hAnsi="Iskoola Pota" w:cs="Iskoola Pota"/><w:b/><w:bCs/><w:i/><w:iCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>`,
      );
    });

    it("includes formatting inherited from styles", () => {
      const { part } = run(p(fm("f.or"), `<w:pStyle w:val="Heading1"/>`), {
        "word/styles.xml": styles(`<w:style w:type="paragraph" w:styleId="Heading1"><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>`),
      });
      expect(part("word/document.xml")).toMatch(/<w:bCs\/><w:szCs w:val="32"\/><\/w:rPr>/);
    });

    it("creates w:rPr for a run without one", () => {
      const { part } = run(p(r("f.or")), {
        "word/styles.xml": styles(`<w:docDefaults><w:rPrDefault><w:rPr>${font("FMAbhaya")}<w:sz w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults>`),
      });
      expect(part("word/document.xml")).toContain(`<w:r><w:rPr><w:rFonts w:ascii="Iskoola Pota"`);
    });
  });

  it("switches legacy fonts in styles and paragraph marks to the Unicode font", () => {
    const { part } = run(p(fm("f.or"), `<w:rPr>${font("FMAbhaya")}</w:rPr>`), {
      "word/styles.xml": styles(
        `<w:docDefaults><w:rPrDefault><w:rPr>${font("Calibri")}</w:rPr></w:rPrDefault></w:docDefaults>` +
          `<w:style w:type="paragraph" w:styleId="S"><w:rPr>${font("FMAbhaya")}<w:b/><w:sz w:val="30"/></w:rPr></w:style>`,
      ),
    });
    expect(part("word/styles.xml")).toContain(
      `<w:rFonts w:ascii="Iskoola Pota" w:hAnsi="Iskoola Pota" w:cs="Iskoola Pota"/><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/>`,
    );
    expect(part("word/styles.xml")).toContain('w:ascii="Calibri"');
    expect(part("word/document.xml")).toContain(`<w:pPr><w:rPr><w:rFonts w:ascii="Iskoola Pota"`);
  });

  it("returns a file with no legacy text unchanged", () => {
    const input = makeDocx(p(r("Hello", font("Arial"))));
    const { data, report } = convertDocx(input, { xml });
    expect(data).toBe(input);
    expect(report).toEqual({ fonts: [{ font: "Arial", runs: 1 }], parts: [] });
  });

  it("rejects old .doc files with a clear error", () => {
    const doc = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
    expect(() => convertDocx(doc, { xml })).toThrow(DocxError);
    try {
      convertDocx(doc, { xml });
    } catch (err) {
      expect((err as DocxError).code).toBe("legacy-doc");
    }
  });

  it("rejects files that are not .docx", () => {
    for (const data of [strToU8("hello"), zipSync({ "a.txt": strToU8("x") })]) {
      expect(() => convertDocx(data, { xml })).toThrow(expect.objectContaining({ code: "not-docx" }));
    }
  });
});
