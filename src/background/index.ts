// Manifest v3 requires a service_worker entry, but this extension does all of
// its work in the content script — clipboard writes succeed there with the
// `clipboardWrite` permission. Keep this file empty intentionally; do not
// invent reasons for the background worker to exist.
export {};
