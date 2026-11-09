# Legacy Font to Unicode Converter

Convert text typed in old Sinhala and Tamil fonts (FM, DL, Bamini) into
Unicode that works everywhere, from pasted text or whole Word files. Everything
runs in the browser; nothing is uploaded.

## Packages

| Path | What it is |
|---|---|
| `packages/core` | The converter library. TypeScript, no runtime dependencies. Font tables live in `mappings/*.json`. |
| `packages/docx` | Converts legacy-font text inside `.docx` files, keeping formatting. |
| `packages/cli` | Command-line tool (`lk-unicode`). |
| `apps/web` | The website: Astro + one Preact component, offline-capable, in Sinhala, Tamil and English. |

> Package names (`@lk-unicode/*`) are placeholders. `fontconv` is already taken on npm.

## Getting started

Requires Node 20+ and pnpm (run through Corepack: `corepack pnpm …`).

```bash
corepack pnpm install
corepack pnpm -r --filter "./packages/**" build
corepack pnpm test
corepack pnpm dev        # website at http://localhost:4321
```

Browser tests (first time: `corepack pnpm --filter web exec playwright install`):

```bash
corepack pnpm --filter web test:e2e
```

## Adding a font

Add `packages/core/mappings/<id>.json` matching `mappings/schema.json`.
A font that differs only slightly from its family sets `"parent"` and lists
only the entries that differ. CI validates every mapping file against the schema.

Mapping tables must be written from the font files themselves, not copied from
other converters, so the project can stay MIT-licensed. To see what a font
draws for each key, render a labelled sheet of its glyphs (needs Pillow):

```bash
python packages/core/scripts/glyph-sheet.py path/to/FMAbhaya.ttf fm-abhaya.png
```

It also prints the font's family name, which goes in the mapping's `fonts` list.

Map values are written in the order the glyphs are typed; the engine moves
pre-base vowel signs (ෙ, ெ, ே, ை) after their consonant and NFC-normalizes.
Two kombuvas typed before a consonant become ෛ.

Add real text with its checked Unicode to `packages/core/test/samples/<id>.json`
(an array of `{ "legacy", "unicode", "source" }`); every sample runs as a test.

## Word files

```bash
node packages/cli/dist/cli.js letter.docx      # writes letter.unicode.docx
```

```ts
import { convertDocx } from "@lk-unicode/docx";
const { data, report } = convertDocx(bytes); // in Node, pass { xml: { DOMParser, XMLSerializer } } from @xmldom/xmldom
```

Each run's font is found the way Word finds it: the run, its character style,
the paragraph style chain, the document defaults and theme fonts. Runs in a
font with a mapping are converted and switched to Iskoola Pota (Sinhala) or
Latha (Tamil), change with `unicodeFonts`. Bold, italic and size are copied to
Word's complex-script settings, which Sinhala and Tamil use. Words that Word
split across runs are converted as one piece, and the cut is moved to a
syllable boundary so each run keeps its formatting. Headers, footers,
footnotes, endnotes, comments and text boxes are included; styles that name a
legacy font are switched too. Old `.doc` files throw a `DocxError` with code
`legacy-doc`. Not handled yet: list numbering text and table-style fonts.

## Releasing

`pnpm changeset` to describe a change; merging to `main` opens a version PR,
and merging that publishes to npm with provenance.

## License

MIT
