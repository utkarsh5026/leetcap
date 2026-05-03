/**
 * MAIN-world hook: reads `window.monaco` models and answers `lc-meta-capture:req-code` from the isolated bridge.
 * Installs once per page load (guarded by `INSTALL_KEY` on `window`).
 */
type MonacoModel = {
  getValue(): string;
  uri: { toString(): string };
};

type MonacoNs = {
  editor: {
    getModels(): MonacoModel[];
  };
};

const INSTALL_KEY = "__lcMetaCaptureMainWorldBridge";
const REQ = "lc-meta-capture:req-code";
const RESP = "lc-meta-capture:resp-code";

/**
 * Chooses the “main” editor buffer: drops submission/output URIs, then prefers the longest remaining model text.
 */
function pickEditorModel(): string | undefined {
  const monaco = (window as unknown as { monaco?: MonacoNs }).monaco;
  if (!monaco?.editor) return undefined;
  const models = monaco.editor.getModels();
  if (!models || models.length === 0) return undefined;

  const filtered = models.filter((m) => {
    const u = m.uri?.toString?.() ?? "";
    const low = u.toLowerCase();
    if (low.includes("submission")) return false;
    if (low.includes("output")) return false;
    return true;
  });
  const list = filtered.length > 0 ? filtered : models;

  let best: { model: MonacoModel; len: number } | undefined;
  for (const model of list) {
    const len = model.getValue().length;
    if (!best || len > best.len) best = { model, len };
  }
  const text = best?.model.getValue();
  return text && text.length > 0 ? text : undefined;
}

/** Registers the request listener once; responds with `{ reqId, code }` (code may be `undefined`). */
function install(): void {
  const w = window as unknown as Record<string, boolean>;
  if (w[INSTALL_KEY]) return;
  w[INSTALL_KEY] = true;

  window.addEventListener(REQ, ((ev: Event) => {
    const e = ev as CustomEvent<{ reqId?: string }>;
    const reqId = e.detail?.reqId;
    if (typeof reqId !== "string" || reqId.length === 0) return;

    let code: string | undefined;
    try {
      code = pickEditorModel();
    } catch {
      code = undefined;
    }

    window.dispatchEvent(new CustomEvent(RESP, { detail: { reqId, code } }));
  }) as EventListener);
}

install();
