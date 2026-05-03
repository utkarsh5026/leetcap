import type { CaptureResult, CapturedData } from "../content/types";
import {
  FILENAME_CONVENTIONS,
  type FilenameConvention,
  suggestedFilename,
} from "./suggest-filename";

/**
 * Toolbar popup: resolves the active tab, asks the LeetCode content script for a fresh {@link CaptureResult},
 * renders metadata rows, and wires the suggested-filename picker plus clipboard copy (requires `clipboardWrite`).
 */

/** @throws {Error} When no element exists for `id` (popup HTML must stay in sync with these ids). */
const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
};

function setMissing(el: HTMLElement, text = "—"): void {
  el.textContent = text;
  el.classList.add("popup__value--missing");
}

function setValue(el: HTMLElement, text: string): void {
  el.textContent = text;
  el.classList.remove("popup__value--missing");
}

function renderTags(container: HTMLElement, tags: string[] | undefined): void {
  container.innerHTML = "";
  if (!tags || tags.length === 0) {
    const span = document.createElement("span");
    span.className = "popup__value popup__value--missing";
    span.textContent = "—";
    container.appendChild(span);
    return;
  }
  for (const tag of tags) {
    const chip = document.createElement("span");
    chip.className = "popup__tag";
    chip.textContent = tag;
    container.appendChild(chip);
  }
}

function setStatus(text: string): void {
  $("status").textContent = text;
}

/**
 * Shows difficulty text and toggles `popup__value--{easy|medium|hard}` from a substring match on the label
 * (LeetCode wording can include extra words around “Easy” / “Medium” / “Hard”).
 */
function setDifficulty(el: HTMLElement, value: string | undefined): void {
  el.classList.remove("popup__value--easy", "popup__value--medium", "popup__value--hard");
  if (!value) {
    setMissing(el);
    return;
  }
  setValue(el, value);
  const lc = value.toLowerCase();
  if (lc === "easy") el.classList.add("popup__value--easy");
  else if (lc === "medium") el.classList.add("popup__value--medium");
  else if (lc === "hard") el.classList.add("popup__value--hard");
}

/** Active tab in the window that opened the popup (undefined if none). */
async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Runs `capture()` in the target tab via `lc-meta-capture/getCurrent`.
 *
 * @returns The serialized capture, or `undefined` if the tab has no receiver (e.g. content script not injected yet) or the channel throws.
 */
async function fetchFromContent(tabId: number): Promise<CaptureResult | undefined> {
  try {
    return (await chrome.tabs.sendMessage(tabId, {
      type: "lc-meta-capture/getCurrent",
    })) as CaptureResult;
  } catch {
    return undefined;
  }
}

/** Visible label for the filename copy control before/after transient “copied” / “failed” feedback. */
const COPY_FILENAME_LABEL = "copy";

/**
 * Fills the naming-style `<select>`, keeps the `<code>` preview in sync, and attaches a copy-button click handler
 * that writes the preview string with `navigator.clipboard.writeText` (guarded against placeholder state).
 */
function setupFilenameUI(
  conventionSelect: HTMLSelectElement,
  filenameEl: HTMLElement,
  copyFilenameBtn: HTMLButtonElement,
  data: CapturedData,
): void {
  conventionSelect.innerHTML = "";
  for (const { value, label } of FILENAME_CONVENTIONS) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    conventionSelect.appendChild(opt);
  }
  conventionSelect.disabled = false;
  copyFilenameBtn.disabled = false;
  copyFilenameBtn.textContent = COPY_FILENAME_LABEL;

  let copyFeedbackTimer: number | undefined;

  const renderName = (): void => {
    const conv = conventionSelect.value as FilenameConvention;
    setValue(filenameEl, suggestedFilename(data, conv));
  };

  conventionSelect.onchange = renderName;
  renderName();

  copyFilenameBtn.onclick = async () => {
    const text = filenameEl.textContent?.trim() ?? "";
    if (!text || text === "—" || filenameEl.classList.contains("popup__value--missing")) return;
    try {
      await navigator.clipboard.writeText(text);
      copyFilenameBtn.textContent = "copied";
      copyFilenameBtn.disabled = true;
      if (copyFeedbackTimer !== undefined) window.clearTimeout(copyFeedbackTimer);
      copyFeedbackTimer = window.setTimeout(() => {
        copyFilenameBtn.textContent = COPY_FILENAME_LABEL;
        copyFilenameBtn.disabled = false;
        copyFeedbackTimer = undefined;
      }, 1500);
    } catch (err) {
      console.error("[leetcap popup] clipboard write failed:", err);
      copyFilenameBtn.textContent = "failed";
      window.setTimeout(() => {
        copyFilenameBtn.textContent = COPY_FILENAME_LABEL;
      }, 1500);
    }
  };
}

/** Clears convention options, disables controls, drops the copy handler, and marks the filename preview as empty. */
function resetFilenameUI(
  conventionSelect: HTMLSelectElement,
  filenameEl: HTMLElement,
  copyFilenameBtn: HTMLButtonElement,
): void {
  conventionSelect.innerHTML = "";
  conventionSelect.disabled = true;
  copyFilenameBtn.disabled = true;
  copyFilenameBtn.textContent = COPY_FILENAME_LABEL;
  copyFilenameBtn.onclick = null;
  setMissing(filenameEl);
}

/**
 * Loads once per popup open: validates URL is a LeetCode problem page, pulls capture state from the tab,
 * then either renders failure/empty UI or the latest {@link CapturedData} plus filename tooling.
 */
async function main(): Promise<void> {
  const titleEl = $("title");
  const diffEl = $("difficulty");
  const tagsEl = $("tags");
  const langEl = $("language");
  const hintEl = $("hint");
  const conventionSelect = document.getElementById("filename-convention") as HTMLSelectElement;
  const filenameEl = $("suggested-filename");
  const copyFilenameBtn = $("copy-suggested-filename") as HTMLButtonElement;

  const tab = await getActiveTab();
  if (!tab?.url || !/^https:\/\/leetcode\.com\/problems\//.test(tab.url)) {
    setStatus("not on a problem");
    setMissing(titleEl);
    setMissing(diffEl);
    renderTags(tagsEl, undefined);
    setMissing(langEl);
    resetFilenameUI(conventionSelect, filenameEl, copyFilenameBtn);
    hintEl.textContent = "open a leetcode problem to use this";
    return;
  }

  setStatus("reading page");
  const result = tab.id !== undefined ? await fetchFromContent(tab.id) : undefined;

  if (!result) {
    setStatus("no response");
    setMissing(titleEl);
    setMissing(diffEl);
    renderTags(tagsEl, undefined);
    setMissing(langEl);
    resetFilenameUI(conventionSelect, filenameEl, copyFilenameBtn);
    hintEl.textContent = "reload the leetcode tab and try again";
    return;
  }

  if (result.kind === "failure") {
    setStatus("selectors failed");
    setMissing(titleEl);
    setMissing(diffEl);
    renderTags(tagsEl, undefined);
    setMissing(langEl);
    resetFilenameUI(conventionSelect, filenameEl, copyFilenameBtn);
    hintEl.textContent = `missing: ${result.missingSelectors.join(", ")}`;
    return;
  }

  const { data } = result;
  setStatus("ready");
  setValue(titleEl, data.problemTitle);
  setDifficulty(diffEl, data.difficulty);
  renderTags(tagsEl, data.topics);
  if (data.language) setValue(langEl, data.language);
  else setMissing(langEl);

  setupFilenameUI(conventionSelect, filenameEl, copyFilenameBtn, data);

  hintEl.textContent =
    data.runtimeMs !== undefined
      ? "metadata captured — submit again to refresh"
      : "submit to capture full metadata";
}

void main();
