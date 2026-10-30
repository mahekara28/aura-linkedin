/* Shared by the extension and the standalone preview. No network access. */
(function () {
  "use strict";

  const KEY = "auraSettings";
  const DEFAULTS = Object.freeze({ theme: "bloom", enabled: true, decorations: true, motion: true });
  const THEMES = Object.freeze([
    Object.freeze({ id: "bloom", name: "Girly Pop Pink" }),
    Object.freeze({ id: "orbit", name: "Cosmic / Space" }),
    Object.freeze({ id: "shinobi", name: "F1 / Motorsport Luxury" }),
    Object.freeze({ id: "marvel", name: "Marvel-inspired" })
  ]);
  const themeIds = new Set(THEMES.map((theme) => theme.id));
  const legacyThemes = Object.freeze({ midnight: "shinobi", craft: "orbit" });
  const hasExtensionStorage = Boolean(globalThis.chrome?.storage?.local);
  const localListeners = new Set();
  let memorySettings = { ...DEFAULTS };
  let useMemoryStorage = false;

  function normalize(raw) {
    const value = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const candidate = Object.prototype.hasOwnProperty.call(value, "theme") ? value.theme : undefined;
    const theme = typeof candidate === "string" && Object.prototype.hasOwnProperty.call(legacyThemes, candidate)
      ? legacyThemes[candidate] : candidate;
    return {
      theme: themeIds.has(theme) ? theme : DEFAULTS.theme,
      enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULTS.enabled,
      decorations: typeof value.decorations === "boolean" ? value.decorations : DEFAULTS.decorations,
      motion: typeof value.motion === "boolean" ? value.motion : DEFAULTS.motion
    };
  }

  async function read() {
    if (hasExtensionStorage) {
      const stored = await chrome.storage.local.get(KEY);
      return normalize(stored[KEY]);
    }

    if (!useMemoryStorage) {
      try {
        const storage = globalThis.localStorage;
        if (storage) {
          const raw = storage.getItem(KEY);
          try {
            memorySettings = normalize(raw ? JSON.parse(raw) : null);
          } catch (_error) {
            memorySettings = { ...DEFAULTS };
          }
        }
      } catch (_error) {
        // Private/file previews may deny localStorage. Continue in memory.
        useMemoryStorage = true;
      }
    }
    return { ...memorySettings };
  }

  // Serialize writes from one popup so quick consecutive controls cannot undo each other.
  let pendingSave = Promise.resolve();
  function save(patch) {
    const safePatch = patch && typeof patch === "object" && !Array.isArray(patch) ? { ...patch } : {};
    const operation = pendingSave.then(async () => {
      const next = normalize({ ...await read(), ...safePatch });
      if (hasExtensionStorage) {
        await chrome.storage.local.set({ [KEY]: next });
      } else {
        memorySettings = next;
        if (!useMemoryStorage) {
          try {
            globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
          } catch (_error) {
            // Retain the complete preview state if browser storage denies writes.
            useMemoryStorage = true;
          }
        }
        localListeners.forEach((listener) => listener({ ...next }));
      }
      return { ...next };
    });
    pendingSave = operation.catch(() => {});
    return operation;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("A settings listener must be a function.");
    if (hasExtensionStorage) {
      const onChanged = (changes, areaName) => {
        if (areaName === "local" && Object.prototype.hasOwnProperty.call(changes, KEY)) {
          listener(normalize(changes[KEY].newValue));
        }
      };
      chrome.storage.onChanged.addListener(onChanged);
      return () => chrome.storage.onChanged.removeListener(onChanged);
    }

    localListeners.add(listener);
    const onStorage = (event) => {
      if (event.key !== KEY && event.key !== null) return;
      try {
        memorySettings = normalize(event.newValue ? JSON.parse(event.newValue) : null);
      } catch (_error) {
        memorySettings = { ...DEFAULTS };
      }
      listener({ ...memorySettings });
    };
    globalThis.addEventListener?.("storage", onStorage);
    return () => {
      localListeners.delete(listener);
      globalThis.removeEventListener?.("storage", onStorage);
    };
  }

  globalThis.AuraSettings = Object.freeze({ DEFAULTS, THEMES, normalize, read, save, subscribe });
})();
