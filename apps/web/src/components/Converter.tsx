import { useMemo, useState } from "preact/hooks";
import { convert, listMappings } from "@lk-unicode/core";
import "./Converter.css";

export interface ConverterLabels {
  fontLabel: string;
  inputLabel: string;
  inputPlaceholder: string;
  outputLabel: string;
  copy: string;
  copied: string;
  swap: string;
  noFonts: string;
}

export default function Converter({ labels }: { labels: ConverterLabels }) {
  const mappings = listMappings();
  const [from, setFrom] = useState(mappings[0]?.id ?? "");
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    if (!from || !input) return "";
    try {
      return convert(input, { from });
    } catch (err) {
      return (err as Error).message;
    }
  }, [from, input]);

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section class="converter">
      <div class="toolbar">
        <label>
          {labels.fontLabel}{" "}
          <select value={from} onChange={(e) => setFrom(e.currentTarget.value)} disabled={!mappings.length}>
            {mappings.map((m) => (
              <option value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        {/* Week 4: Unicode → FM */}
        <button type="button" disabled>
          {labels.swap}
        </button>
      </div>
      {!mappings.length && <p class="notice">{labels.noFonts}</p>}
      <div class="panes">
        <label class="pane">
          <span>{labels.inputLabel}</span>
          <textarea
            value={input}
            placeholder={labels.inputPlaceholder}
            onInput={(e) => setInput(e.currentTarget.value)}
            spellcheck={false}
          />
        </label>
        <div class="pane">
          <span>{labels.outputLabel}</span>
          <output aria-live="polite">{output}</output>
          <button type="button" class="primary" onClick={copy} disabled={!output}>
            {copied ? labels.copied : labels.copy}
          </button>
        </div>
      </div>
    </section>
  );
}
