import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { convert, listMappings } from "@lk-unicode/core";
import { convertDocx, type XmlImpl } from "@lk-unicode/docx";

const HELP = `Usage:
  lk-unicode <input> [--from fm] [--out file]   convert a .docx or text file
  echo "text" | lk-unicode --from fm             convert text from stdin
  lk-unicode --list                              list available fonts

Options:
  -f, --from <id>   legacy font mapping (needed for text; .docx auto-detects)
  -o, --out <file>  output file (default: <input>.unicode.<ext>, or stdout)
  -l, --list        list font mappings
  -h, --help        show this help`;

function main(): void {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      from: { type: "string", short: "f" },
      out: { type: "string", short: "o" },
      list: { type: "boolean", short: "l" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) return void console.log(HELP);
  if (values.list) {
    const maps = listMappings();
    if (maps.length === 0) console.log("(no font mappings built in yet)");
    for (const m of maps) console.log(`${m.id}\t${m.name}`);
    return;
  }

  const input = positionals[0];

  if (input?.toLowerCase().endsWith(".docx")) {
    const out = values.out ?? input.replace(/\.docx$/i, ".unicode.docx");
    const xml = { DOMParser, XMLSerializer } as unknown as XmlImpl;
    const { data, report } = convertDocx(readFileSync(input), { xml });
    for (const use of report.fonts) {
      const what = use.mapping ? `converted (${use.mapping})` : "left as is";
      console.error(`  ${use.font}: ${use.runs} run${use.runs === 1 ? "" : "s"}, ${what}`);
    }
    if (!report.parts.length) {
      console.error("No FM, DL or Bamini text found; nothing written.");
      process.exit(2);
    }
    writeFileSync(out, data);
    console.error(`Wrote ${out}`);
    return;
  }

  if (!values.from) {
    console.error("Missing --from for text input.\n\n" + HELP);
    process.exit(1);
  }
  const text = readFileSync(input ?? 0, "utf8");
  const result = convert(text, { from: values.from });
  if (values.out) writeFileSync(values.out, result, "utf8");
  else process.stdout.write(result);
}

try {
  main();
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
