/* Aura popup: choices save immediately and stay in sync with the theme studio. */
(() => {
  "use strict";

  const settings = window.AuraSettings;
  const form = document.getElementById("theme-form");
  const picker = document.getElementById("theme-picker");
  const enabledToggle = document.getElementById("enabled-toggle");
  const decorationsToggle = document.getElementById("decorations-toggle");
  const motionToggle = document.getElementById("motion-toggle");
  const motionNote = document.getElementById("motion-note");
  const motionDescription = document.getElementById("motion-description");
  const motionDescriptions = Object.freeze({
    bloom: "Satin light on page arrival",
    orbit: "Galaxy drift on page arrival",
    shinobi: "Track sweep on page arrival",
    marvel: "Alloy light on page arrival"
  });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const enabledLabel = document.getElementById("enabled-label");
  const status = document.getElementById("save-status");
  const statusText = document.getElementById("status-text");
  const retryButton = document.getElementById("retry-save");
  let retryAction = null;
  const themeInputs = Array.from(form.querySelectorAll('input[name="theme"]'));
  let current = { theme: "bloom", enabled: true, decorations: true, motion: true };
  let lastSaved = { ...current };
  let saveQueue = Promise.resolve();
  let pendingCount = 0;
  let latestChange = 0;


  function setStatus(message, state = "saved", retry = null) {
    status.dataset.state = state;
    statusText.textContent = message;
    retryAction = retry;
    retryButton.hidden = !retry;
    form.setAttribute("aria-busy", String(state === "loading" || state === "saving"));
  }
  retryButton.addEventListener("click", () => retryAction?.());

  function savedMessage() {
    return current.enabled ? "Saved" : "Paused · original LinkedIn";
  }

  function render(next) {
    current = { ...current, ...next };
    document.documentElement.dataset.uiTheme = current.theme;
    document.documentElement.dataset.enabled = String(current.enabled);
    document.documentElement.dataset.motion = String(current.motion);
    enabledToggle.checked = current.enabled;
    decorationsToggle.checked = current.decorations;
    motionToggle.checked = current.motion;
    motionDescription.textContent = motionDescriptions[current.theme] || motionDescriptions.bloom;
    enabledLabel.textContent = current.enabled ? "Theme on" : "Theme off";
    themeInputs.forEach((input) => { input.checked = input.value === current.theme; });
  }

  function update(patch) {
    const changeId = ++latestChange;
    render(patch);
    pendingCount += 1;
    setStatus("Saving…", "saving");

    // Serialize rapid changes so the most recent choice is always the saved one.
    saveQueue = saveQueue.catch(() => {}).then(async () => {
      try {
        const saved = await settings.save(patch);
        lastSaved = { ...saved };
        if (changeId === latestChange) {
          render(saved);
          setStatus(savedMessage());
        }
      } catch (error) {
        if (changeId === latestChange) {
          render(lastSaved);
          setStatus("Couldn't save your changes.", "error", () => update(patch));
        }
        console.warn("Aura could not save preferences.", error);
      } finally {
        pendingCount -= 1;
      }
    });
  }

  function openStudio(event) {
    // Normal href navigation also makes the popup usable in a local preview.
    if (typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.openOptionsPage === "function") {
      event.preventDefault();
      try {
        const result = chrome.runtime.openOptionsPage();
        if (result && typeof result.catch === "function") {
          result.catch(() => setStatus("Couldn't open the studio. Try again.", "error"));
        }
      } catch (error) {
        setStatus("Couldn't open the studio. Try again.", "error");
      }
    } else if (window.parent !== window) {
      event.preventDefault();
      window.parent.location.href = event.currentTarget.href;
    }
  }

  form.addEventListener("submit", (event) => event.preventDefault());
  themeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) update({ theme: input.value, enabled: true });
    });
  });
  enabledToggle.addEventListener("change", () => update({ enabled: enabledToggle.checked }));
  decorationsToggle.addEventListener("change", () => update({ decorations: decorationsToggle.checked }));
  motionToggle.addEventListener("change", () => update({ motion: motionToggle.checked }));
  function showMotionPreference() { motionNote.hidden = !reducedMotion.matches; }
  showMotionPreference();
  reducedMotion.addEventListener("change", showMotionPreference);
  document.getElementById("studio-link").addEventListener("click", openStudio);
  document.getElementById("brand-link").addEventListener("click", openStudio);

  async function initialize() {
    if (!settings) {
      setStatus("Preferences unavailable. Reload Aura.", "error");
      return;
    }
    let settingsRevision = 0;
    if (typeof settings.subscribe === "function") {
      const unsubscribe = settings.subscribe((next) => {
        settingsRevision += 1;
        lastSaved = { ...next };
        if (pendingCount === 0) {
          render(next);
          setStatus(savedMessage());
        }
      });
      window.addEventListener("pagehide", () => {
        if (typeof unsubscribe === "function") unsubscribe();
      }, { once: true });
    }
    // A new subscription value wins over an older initial or retry read.
    async function loadPreferences() {
      const initialRevision = settingsRevision;
      picker.disabled = enabledToggle.disabled = decorationsToggle.disabled = motionToggle.disabled = true;
      setStatus("Loading preferences…", "loading");
      try {
        const initial = await settings.read();
        if (settingsRevision === initialRevision) {
          lastSaved = { ...initial };
          render(initial);
          setStatus(savedMessage());
        }
      } catch (error) {
        if (settingsRevision === initialRevision) {
          render(lastSaved);
          setStatus("Couldn't load preferences.", "error", loadPreferences);
        }
        console.warn("Aura could not load preferences.", error);
      } finally {
        picker.disabled = enabledToggle.disabled = decorationsToggle.disabled = motionToggle.disabled = false;
      }
    }
    await loadPreferences();
  }

  initialize();
})();
