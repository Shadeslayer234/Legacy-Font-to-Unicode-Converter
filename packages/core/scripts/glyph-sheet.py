"""Draw every glyph of a legacy font on one sheet, labelled with its key.

Mapping tables must be written from the font files themselves. This shows
what the font draws for each character, so each entry in mappings/<id>.json
can be written by looking at the glyph:

    python glyph-sheet.py FMAbhaya.ttf fm-abhaya.png

Needs Pillow (pip install Pillow). Prints the font's family name, which is
the name Word stores in a .docx and belongs in the mapping's "fonts" list.
"""

import sys

from PIL import Image, ImageDraw, ImageFont

# Printable ASCII and Latin-1: where legacy Sinhala and Tamil fonts put glyphs.
CODES = [c for c in range(0x21, 0x100) if not 0x7F <= c <= 0xA0]
COLS = 16
CELL_W, CELL_H = 96, 120
GLYPH_SIZE = 56


def bitmap(font, ch):
    mask = font.getmask(ch)
    return mask.size, bytes(mask)


def glyph_drawn(font, ch):
    """True when the font has its own glyph, not blank or its "missing" box."""
    size, data = bitmap(font, ch)
    if not any(data):
        return False
    return (size, data) != bitmap(font, "￿")


def main(font_path, out_path):
    font = ImageFont.truetype(font_path, GLYPH_SIZE)
    # Some legacy fonts are "symbol" fonts with glyphs at U+F0xx instead.
    offset = 0
    if not any(glyph_drawn(font, chr(c)) for c in CODES):
        font = ImageFont.truetype(font_path, GLYPH_SIZE, encoding="symb")
        offset = 0xF000

    family, style = font.getname()
    print(f"Family name: {family} ({style})")

    label = ImageFont.load_default(size=14)
    rows = -(-len(CODES) // COLS)
    sheet = Image.new("RGB", (COLS * CELL_W, rows * CELL_H), "white")
    draw = ImageDraw.Draw(sheet)

    empty = []
    for n, code in enumerate(CODES):
        x, y = (n % COLS) * CELL_W, (n // COLS) * CELL_H
        draw.rectangle([x, y, x + CELL_W - 1, y + CELL_H - 1], outline="#bbbbbb")
        ch = chr(code + offset)
        text = f"{code:02X} {chr(code)}" if code < 0x7F else f"{code:02X}"
        draw.text((x + 4, y + 2), text, fill="#c00000", font=label)
        if glyph_drawn(font, ch):
            draw.text((x + CELL_W // 2, y + 70), ch, fill="black", font=font, anchor="mm")
        else:
            empty.append(code)
            draw.line([x, y, x + CELL_W, y + CELL_H], fill="#eeeeee")

    sheet.save(out_path)
    print(f"Wrote {out_path}: {len(CODES) - len(empty)} glyphs, {len(empty)} empty slots")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
