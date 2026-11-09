import { useEffect, useRef, useState } from "preact/hooks";
import type { FontUse } from "@lk-unicode/docx";
import "./DocxConverter.css";

export const DOCX_LABEL_KEYS = [
  "docx_title",
  "docx_hint",
  "docx_choose",
  "docx_drop",
  "docx_working",
  "docx_done",
  "docx_kept",
  "docx_download",
  "docx_none",
  "docx_legacy_doc",
  "docx_not_docx",
  "docx_failed",
] as const;

export type DocxLabels = Record<(typeof DOCX_LABEL_KEYS)[number], string>;

const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type State =
  | { kind: "idle" }
  | { kind: "working"; name: string }
  | { kind: "done"; name: string; url: string; filename: string; converted: FontUse[]; kept: FontUse[] }
  | { kind: "none"; name: string; kept: FontUse[] }
  | { kind: "error"; name: string; message: string };

const list = (fonts: FontUse[]) => fonts.map((f) => f.font).join(", ");

export default function DocxConverter({ labels }: { labels: DocxLabels }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Free the previous download when a new file replaces it.
  const url = state.kind === "done" ? state.url : undefined;
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  async function handle(file: File | undefined) {
    if (!file) return;
    const name = file.name;
    setState({ kind: "working", name });
    // Let the "Converting…" message paint before the work starts.
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      // Loaded on first use, so the text converter doesn't wait for it.
      const { convertDocx, DocxError } = await import("@lk-unicode/docx");
      try {
        const { data, report } = convertDocx(new Uint8Array(await file.arrayBuffer()));
        const converted = report.fonts.filter((f) => f.mapping);
        const kept = report.fonts.filter((f) => !f.mapping);
        if (!converted.length) return setState({ kind: "none", name, kept });
        const blob = new Blob([data as Uint8Array<ArrayBuffer>], { type: DOCX_TYPE });
        const filename = name.replace(/\.docx$/i, "") + ".unicode.docx";
        setState({ kind: "done", name, url: URL.createObjectURL(blob), filename, converted, kept });
      } catch (err) {
        const code = err instanceof DocxError ? err.code : undefined;
        const message =
          code === "legacy-doc" ? labels.docx_legacy_doc : code === "not-docx" ? labels.docx_not_docx : labels.docx_failed;
        setState({ kind: "error", name, message });
      }
    } catch {
      setState({ kind: "error", name, message: labels.docx_failed });
    } finally {
      // Choosing the same file again should run again.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section class="docx" aria-labelledby="docx-title">
      <h2 id="docx-title">{labels.docx_title}</h2>
      <p class="docx-hint">{labels.docx_hint}</p>

      <label
        class="dropzone"
        data-dragging={dragging ? "" : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handle(e.dataTransfer?.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={`.docx,${DOCX_TYPE}`}
          onChange={(e) => void handle(e.currentTarget.files?.[0])}
        />
        <span class="dropzone-button">{labels.docx_choose}</span>
        <span class="dropzone-text">{labels.docx_drop}</span>
      </label>

      <div class="docx-result" role="status" aria-live="polite">
        {state.kind === "working" && <p class="file">{labels.docx_working}</p>}
        {state.kind === "done" && (
          <>
            <p class="file" lang="en">
              {state.name}
            </p>
            <p class="ok">{labels.docx_done.replace("{fonts}", list(state.converted))}</p>
            {state.kept.length > 0 && <p class="kept">{labels.docx_kept.replace("{fonts}", list(state.kept))}</p>}
            <a class="download" href={state.url} download={state.filename}>
              {labels.docx_download}
            </a>
          </>
        )}
        {state.kind === "none" && (
          <>
            <p class="file" lang="en">
              {state.name}
            </p>
            <p class="error">{labels.docx_none}</p>
            {state.kept.length > 0 && <p class="kept">{labels.docx_kept.replace("{fonts}", list(state.kept))}</p>}
          </>
        )}
        {state.kind === "error" && (
          <>
            <p class="file" lang="en">
              {state.name}
            </p>
            <p class="error" role="alert">
              {state.message}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
