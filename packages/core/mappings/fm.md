# FM mapping notes

`fm.json` was written by rendering every glyph in FM Abhaya (`scripts/glyph-sheet.py`)
and comparing each one with Unicode Sinhala rendered in a shaping browser.

## How FM is typed

- Kombuva (`f`) comes before its consonant; two kombuvas (`ff`) are kombu deka.
- Repaya (`_`) comes after its consonant; the table maps it to U+E000 and the engine moves it.
- Yansaya is `H`, rakaransaya is `=`. `q`/`%` are the two shapes of ු, `Q`/`+` of ූ.
- Several independent vowels are two glyphs: ආ `wd`, ඇ `we`, ඈ `wE`, ඌ `W!`, ඎ `RD`,
  ඒ `ta`, ඓ `ft`, ඕ `Ta` (or the ready-made `´`), ඖ `T!`.
- Glyphs from 0xA1 up are ready-made syllables (දු, ජී, ක්‍ෂ, ශ්‍රී …). Their `ි` and `ී`
  forms differ by a small closed circle on the top stroke.

## Glyphs left unmapped

These pass through unchanged until someone confirms what they are, ideally from a
real document that uses them.

| Character | What the glyph looks like |
|---|---|
| `C`, `F`, `J` | Left halves of a letter (the ක-like hook), with no right half |
| U+2020, U+2026 | That left half joined to ඵ / ව shapes |
| U+2021, U+02C6 | ඤ-like forms without the left loop; U+02C6 with a ු curl |
| `` ` `` | Small "(" stroke, like the left loop of ඟ / ඬ on its own |
| U+201E, U+0160 | ව and ධ with that left loop (no Unicode letter) |
| U+2030, U+2039 | The same with ි |
| `¿` (U+00BF) | ඵ with an extra outer loop |
| `¶` (U+00B6), `·` (U+00B7), U+2219 | Small marks at x-height |
| U+0153 | Yansaya-like shape with ී |
| U+2013 | Small raised kombuva-like mark |
| U+0178 | Small raised circle |
| `¤` (U+00A4) | Short low dash |

The font list (`fonts`) is from memory apart from `FMAbhaya`, which the font file reports
as its family name. Check each one against its font file.
