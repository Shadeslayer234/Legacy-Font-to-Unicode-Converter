import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { convert, listMappings, type FontMapping } from "@lk-unicode/core";
import "./Converter.css";

export const LABEL_KEYS = [
  "font_label",
  "script_sinh",
  "script_taml",
  "input_label",
  "input_placeholder",
  "output_label",
  "output_empty",
  "char_count",
  "paste",
  "paste_blocked",
  "sample",
  "clear",
  "copy",
  "copied",
  "copy_failed",
  "download",
  "no_fonts",
] as const;

export type ConverterLabels = Record<(typeof LABEL_KEYS)[number], string>;

/** Short names for the font picker; anything else falls back to the mapping's name. */
const SHORT_NAME: Record<string, string> = { fm: "FM", dl: "DL", bamini: "Bamini" };

/** Example text per mapping, typed with that font's keyboard. */
const SAMPLE: Record<string, string> = {
  fm: "wdhqfndajka › ,xld", // ආයුබෝවන් ශ්‍රී ලංකා
  dl: "wdhqfndajka • ,xld", // ආයුබෝවන් ශ්‍රී ලංකා
  bamini: "tzf;fk; jkpo; ehL", // வணக்கம் தமிழ் நாடு
};

const STORAGE_KEY = "lk-unicode:from";

/** Unicode output is tagged with its language so screen readers and fonts pick it up. */
const LANG = { sinh: "si", taml: "ta" } as const;

function storedFont(): string | null {
  try {
    return new URLSearchParams(location.search).get("from") ?? localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function pickDefault(mappings: FontMapping[], locale: string): string {
  const preferred = locale === "ta" ? "taml" : "sinh";
  return (mappings.find((m) => m.script === preferred) ?? mappings[0])?.id ?? "";
}

type Status = { kind: "ok" | "error"; text: string } | null;

export default function Converter({ labels, locale }: { labels: ConverterLabels; locale: string }) {
  const mappings = listMappings();
  const [from, setFrom] = useState(() => pickDefault(mappings, locale));
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const statusTimer = useRef<number>(undefined);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLOutputElement>(null);

  // Restore the last font after hydration, so server and client render the same markup.
  useEffect(() => {
    const saved = storedFont();
    if (saved && mappings.some((m) => m.id === saved)) setFrom(saved);
  }, []);

  function chooseFont(id: string) {
    setFrom(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Private mode or blocked storage: the choice just isn't remembered.
    }
  }

  const mapping = mappings.find((m) => m.id === from);

  const result = useMemo((): { text: string; error?: string } => {
    if (!from || !input) return { text: "" };
    try {
      return { text: convert(input, { from }) };
    } catch (err) {
      return { text: "", error: (err as Error).message };
    }
  }, [from, input]);

  function flash(next: Status) {
    setStatus(next);
    clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(null), next?.kind === "error" ? 5000 : 1800);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.text);
      flash({ kind: "ok", text: labels.copied });
    } catch {
      // Select the result so Ctrl+C works straight away.
      if (outputRef.current) getSelection()?.selectAllChildren(outputRef.current);
      flash({ kind: "error", text: labels.copy_failed });
    }
  }

  async function paste() {
    try {
      setInput(await navigator.clipboard.readText());
    } catch {
      flash({ kind: "error", text: labels.paste_blocked });
    }
    inputRef.current?.focus();
  }

  function clear() {
    setInput("");
    inputRef.current?.focus();
  }

  function download() {
    const url = URL.createObjectURL(new Blob([result.text], { type: "text/plain;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `unicode-${from}.txt` });
    a.click();
    URL.revokeObjectURL(url);
  }

  const count = (text: string) => labels.char_count.replace("{count}", [...text].length.toLocaleString(locale));
  const sample = SAMPLE[from];

  if (!mappings.length) return <p class="notice">{labels.no_fonts}</p>;

  return (
    <section class="converter">
      <fieldset class="fonts">
        <legend>{labels.font_label}</legend>
        <div class="font-options">
          {mappings.map((m) => (
            <label class="font-option">
              <input
                type="radio"
                name="from"
                value={m.id}
                checked={m.id === from}
                onChange={() => chooseFont(m.id)}
              />
              <span class="font-name" title={m.name}>
                {SHORT_NAME[m.id] ?? m.name}
              </span>
              <span class="font-script">{m.script === "taml" ? labels.script_taml : labels.script_sinh}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div class="panes">
        <div class="pane">
          <div class="pane-head">
            <label for="legacy-input">{labels.input_label}</label>
            <span class="count">{input && count(input)}</span>
          </div>
          <textarea
            id="legacy-input"
            ref={inputRef}
            value={input}
            placeholder={labels.input_placeholder}
            onInput={(e) => setInput(e.currentTarget.value)}
            spellcheck={false}
            autocapitalize="off"
            autocomplete="off"
          />
          <div class="actions">
            <button type="button" onClick={paste}>
              {labels.paste}
            </button>
            {sample && (
              <button type="button" onClick={() => setInput(sample)}>
                {labels.sample}
              </button>
            )}
            <button type="button" class="quiet" onClick={clear} disabled={!input}>
              {labels.clear}
            </button>
          </div>
        </div>

        <div class="pane">
          <div class="pane-head">
            <span id="output-label">{labels.output_label}</span>
            <span class="count">{result.text && count(result.text)}</span>
          </div>
          <output
            class="result"
            ref={outputRef}
            aria-labelledby="output-label"
            lang={mapping ? LANG[mapping.script] : undefined}
            data-empty={result.text ? undefined : ""}
            tabIndex={0}
          >
            {result.text || (result.error ? "" : labels.output_empty)}
          </output>
          {result.error && (
            <p class="notice error" role="alert">
              {result.error}
            </p>
          )}
          <div class="actions">
            <button type="button" class="primary" onClick={copy} disabled={!result.text}>
              {labels.copy}
            </button>
            <button type="button" onClick={download} disabled={!result.text}>
              {labels.download}
            </button>
            <span class={`status ${status?.kind ?? ""}`} role="status">
              {status?.text}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
