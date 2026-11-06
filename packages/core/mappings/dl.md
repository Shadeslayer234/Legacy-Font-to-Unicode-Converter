# DL mapping notes

`dl.json` was written from DL Paras (family name `DL-Paras..`, as the font file reports it).
Each glyph was rendered next to the FM Abhaya glyph for the candidate Unicode text and next
to that text in a Unicode Sinhala font, and whole words were typed in DL and compared with
the converted result.

## How DL is typed

DL shares most of its keyboard with FM: kombuva `f` comes first, repaya `_` comes after its
consonant, `a`/`A`/`®` are hal kirima, `d` is aela-pilla, `e`/`E` are ැ/ෑ, `s`/`S` are ි/ී.
Glyphs from 0xA1 up that match FM's ready-made syllables at the same code point were kept.

Where DL differs from FM:

- `ෘ` is `D`, `ණ` is `K`, `ඟ` is `H`, `ථ` is `:`, `ල` is `,`, `ළ` is `<`.
- `+` and `=` are two small shapes of ු; `%` and `q` are the bowl and bracket shapes, `Q` is ූ.
- `/` and `?` are ready-made රැ and රෑ.
- Punctuation moves: `"` draws a comma, `'` a full stop, `(` a colon, `)` a hyphen, `$` a slash,
  `&` and `^` the parentheses, `@` a question mark, `` ` `` an exclamation mark, `]` a percent sign,
  `}` an equals sign, `†`/`‡` square brackets, `∙` a semicolon.
- `•` is ශ්‍රී, `Ì` is ක්‍ෂ, `™` is ඤු, `š` is දි, `Ÿ` is කි, `“` and `”` are ණී and ණි.
- `Û` draws the designer's initials and is dropped.

## Glyphs left unmapped

| Character | What the glyph looks like |
|---|---|
| `F`, `J` | Left halves of a letter with a loop, as in FM's `C`/`F`/`J` |
| `¬` (U+00AC) | A න-like shape joined to ද; possibly ඦ, not confirmed |
| `¯` `°` `±` `ƒ` (U+00AF, B0, B1, 0192) | ද with a small ැ / ෑ-like mark; possibly දෘ / දෲ |
| `µ` `¹` `º` `»` `æ` (U+00B5, B9–BB, E6) | ද or ළ with a small letter written below it |
| `¿` `Ï` `ˆ` `…` (U+00BF, CF, 02C6, 2026) | ළ / ඵ-like shapes with extra loops |
| `Ë` `Õ` `×` `Ø` `Ù` `û` `ü` (U+00CB, D5, D7–D9, FB, FC) | ඩ / හ / ජ shapes that don't match FM's glyph at that code point |
| `Œ`, `œ` (U+0152, U+0153) | Low bracket strokes like `q` |
| `–`, `—`, `‘`, `‰` (U+2013, 2014, 2018, 2030) | ජ් / curl / අ-like / ජි-like shapes |
| `¡` (U+00A1), `‹`, `›` | Draw ®, × and ÷ |

Boxes (the font's "no glyph" shape) sit at `Z`, `z`, `¦`, `²`, `³`, `¸`, `½`, `Ã`, `Š`, `‚`, `„`.
