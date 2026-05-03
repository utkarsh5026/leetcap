/**
 * MV3 requires a `service_worker` entry. This extension performs capture and clipboard writes in the content script
 * (`clipboardWrite` is sufficient there); keep this module empty so no duplicate logic runs in the service worker.
 */
export {};
