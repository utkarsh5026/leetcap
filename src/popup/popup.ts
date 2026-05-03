import type { CaptureResult } from "../content/types";

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

function setDifficulty(el: HTMLElement, value: string | undefined): void {
  el.classList.remove(
    "popup__value--easy",
    "popup__value--medium",
    "popup__value--hard",
  );
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

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function fetchFromContent(
  tabId: number,
): Promise<CaptureResult | undefined> {
  try {
    return (await chrome.tabs.sendMessage(tabId, {
      type: "lc-meta-capture/getCurrent",
    })) as CaptureResult;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const titleEl = $("title");
  const diffEl = $("difficulty");
  const tagsEl = $("tags");
  const langEl = $("language");
  const hintEl = $("hint");

  const tab = await getActiveTab();
  if (!tab?.url || !/^https:\/\/leetcode\.com\/problems\//.test(tab.url)) {
    setStatus("not on a problem");
    setMissing(titleEl);
    setMissing(diffEl);
    renderTags(tagsEl, undefined);
    setMissing(langEl);
    hintEl.textContent = "open a leetcode problem to use this";
    return;
  }

  setStatus("reading page");
  const result =
    tab.id !== undefined ? await fetchFromContent(tab.id) : undefined;

  if (!result) {
    setStatus("no response");
    setMissing(titleEl);
    setMissing(diffEl);
    renderTags(tagsEl, undefined);
    setMissing(langEl);
    hintEl.textContent = "reload the leetcode tab and try again";
    return;
  }

  if (result.kind === "failure") {
    setStatus("selectors failed");
    setMissing(titleEl);
    setMissing(diffEl);
    renderTags(tagsEl, undefined);
    setMissing(langEl);
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

  hintEl.textContent =
    data.runtimeMs !== undefined
      ? "metadata captured — submit again to refresh"
      : "submit to capture full metadata";
}

void main();
