# Bamini mapping notes

`bamini.json` was written from the Bamini font file (family name `Bamini`). Each glyph was
rendered next to the candidate Unicode text, and whole words were typed in Bamini and compared
with the converted result.

## How Bamini is typed

- ெ (`n`), ே (`N`) and ை (`i`) come before their consonant; the engine moves them.
  ொ and ோ are typed ெ/ே + consonant + ா (`h`) and come out composed.
- ௌ is typed ெ + consonant + ள (`s`). The engine joins ெ + ள into ௌ unless the ள carries a
  vowel sign or pulli of its own, as in கெளுத்தி.
- Pulli (்) is `;`, ி is `p`, ீ is `P`.
- Many ு forms are ready-made glyphs (`F` கு, `J` து, …). `}` is the stroke that extends them to ூ,
  so `J}` is தூ; some ூ forms are ready-made as well (`$` கூ, `#` சூ, `%` மூ, `&` ரூ, `*` ழூ, `^` டூ).
- Grantha letters take separate signs: `{` is ு and `_` is ூ (`[{` ஜு). `+` is a lower ூ hook.
- `,` is இ, so a comma is typed `>`; `@` draws a semicolon. `'`/`"` draw “ and ”, `~`/`|` draw ‘ and ’.
- `=` is ஸ்ரீ, `/` is ஃ, `H` is ர்.
- `©` draws the designer's signature and is dropped.

## Glyphs left unmapped

Bamini has no glyphs above 0x7E apart from the signature, and every glyph below it is mapped.
`:` and `?` draw themselves and pass through unchanged.
