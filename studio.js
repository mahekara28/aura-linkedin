(() => {
  'use strict';
  const themes = {
    bloom: { title: 'Satin & rose', description: 'Photographed satin, sculpted petal linework and a pearl-like navigation detail. A brief light pass follows the fabric, then settles.', object: 'Pink satin photograph' },
    orbit: { title: 'Midnight & silver', description: 'Real galaxy photography, an illuminated eclipse and fine orbital linework. Silver-edged navigation and a brief celestial exposure complete the atmosphere.', object: 'Hubble galaxy photograph' },
    shinobi: { title: 'Carbon & racing red', description: 'Racing photography, an original circuit apex and a red-and-silver navigation signature. Technical button finishes respond on focus; the track light settles after arrival.', object: 'Formula 1 racing photograph' },
    marvel: { title: 'Alloy & amber', description: 'Photographed alloy and a precisely drawn mechanical iris, with warm metal and cool light. A brief reflection and polished action buttons complete the cinematic finish.', object: 'Cinematic metal photograph' }
  };
  const options = document.getElementById('theme-options');
  const enabled = document.getElementById('enabled');
  const decorations = document.getElementById('decorations');
  const motion = document.getElementById('motion');
  const motionNote = document.getElementById('motion-note');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const preview = document.getElementById('feed-preview');
  const replayButton = document.getElementById('replay-motion');
  const replayHelp = document.getElementById('replay-motion-help');
  const viewButtons = Array.from(document.querySelectorAll('[data-view]'));
  const views = {
    feed: { url: 'demo/feed.html', title: 'Sample LinkedIn feed showing your selected theme', address: 'linkedin.com/feed' },
    profile: { url: 'demo/profile.html', title: 'Sample LinkedIn profile showing your selected theme', address: 'linkedin.com/in/your-profile' }
  };
  const status = document.getElementById('save-status');
  const retryButton = document.getElementById('retry-save');
  let retryAction = null;
  const label = document.getElementById('preview-label');
  const guide = document.getElementById('install-guide');
  const isExtension = Boolean(globalThis.chrome?.runtime?.id);
  let settings;
  let lastSaved;
  let saveQueue = Promise.resolve();
  let pendingCount = 0;
  let latestChange = 0;
  let ready = false;
  let currentView = 'feed';
  let exhibitedTheme = null;
  let previewReady = false;
  let replayFeedback = '';

  function replayDisabledReason() {
    if (!ready || !previewReady) return 'Loading preview…';
    if (!settings?.enabled) return 'Turn on the theme to replay.';
    if (!settings.decorations) return 'Turn on Signature details to replay.';
    if (!settings.motion) return 'Turn on Cinematic motion to replay.';
    if (reducedMotion.matches) return 'System reduced motion is on.';
    return '';
  }

  function renderReplayControl() {
    const reason = replayDisabledReason();
    replayButton.disabled = Boolean(reason);
    replayHelp.textContent = reason || replayFeedback || 'Plays once, then settles.';
  }

  replayButton.addEventListener('click', () => {
    if (replayDisabledReason()) return;
    replayFeedback = 'Starting preview motion…';
    renderReplayControl();
    preview.contentWindow?.postMessage({ type: 'aura:preview-replay-motion' }, '*');
  });


  function setStatus(message, isError = false, retry = null) {
    status.textContent = message;
    status.classList.toggle('error', isError);
    retryAction = retry;
    retryButton.hidden = !retry;
  }
  retryButton.addEventListener('click', () => retryAction?.());

  function renderExhibit(theme) {
    if (theme === exhibitedTheme) return;
    const collection = themes[theme];
    document.getElementById('collection-exhibit').dataset.auraPalette = theme;
    document.getElementById('exhibit-title').textContent = collection.title;
    document.getElementById('exhibit-description').textContent = collection.description;
    const holder = document.getElementById('exhibit-art');
    holder.setAttribute('aria-label', collection.object);
    exhibitedTheme = theme;
  }

  function render(next) {
    next = AuraSettings.normalize(next);
    settings = next;
    replayFeedback = '';
    document.body.dataset.theme = next.theme;
    document.documentElement.dataset.motion = String(next.motion);
    document.body.classList.toggle('preview-paused', !next.enabled);
    const radio = document.querySelector(`input[name="theme"][value="${next.theme}"]`);
    if (radio) radio.checked = true;
    enabled.checked = next.enabled;
    decorations.checked = next.decorations;
    motion.checked = next.motion !== false;
    renderExhibit(next.theme);
    label.textContent = next.enabled ? 'Theme enabled' : 'Original LinkedIn · theme paused';
    setStatus(isExtension
      ? (next.enabled ? 'Saved · applies to your open LinkedIn tabs' : 'Paused · your original LinkedIn is back')
      : (next.enabled ? 'Preview saved in this browser' : 'Theme paused · showing the original look'));
    syncPreview();
    renderReplayControl();
  }

  function syncPreview() {
    if (settings) preview.contentWindow?.postMessage({
      type: 'aura:preview-settings', settings
    }, '*');
  }
  preview.addEventListener('load', () => {
    previewReady = true;
    syncPreview();
    renderReplayControl();
  });

  function renderView(view) {
    if (!Object.hasOwn(views, view)) return;
    currentView = view;
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    document.getElementById('preview-view-name').textContent = view.toUpperCase();
    document.getElementById('preview-address').textContent = views[view].address;
    document.getElementById('sample-label').textContent = 'sample ' + view;
    preview.title = views[view].title;
  }
  function showView(view) {
    if (!Object.hasOwn(views, view) || currentView === view) return;
    previewReady = false;
    replayFeedback = '';
    renderReplayControl();
    renderView(view);
    preview.src = views[view].url;
  }
  window.addEventListener('message', event => {
    if (event.source !== preview.contentWindow) return;
    if (event.data?.type === 'aura:preview-page') renderView(event.data.view);
    if (event.data?.type === 'aura:preview-ready') {
      previewReady = true;
      syncPreview();
      renderReplayControl();
    }
    if (event.data?.type === 'aura:preview-motion-result' && typeof event.data.played === 'boolean') {
      replayFeedback = event.data.played ? 'Replay started; it will settle.' : 'Motion is unavailable in this preview.';
      renderReplayControl();
    }
  });
  viewButtons.forEach((button, index) => {
    button.addEventListener('click', () => showView(button.dataset.view));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? viewButtons.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + viewButtons.length) % viewButtons.length;
      viewButtons[next].focus();
      showView(viewButtons[next].dataset.view);
    });
  });

  function showMotionPreference() {
    motionNote.hidden = !reducedMotion.matches;
    renderReplayControl();
  }
  showMotionPreference();
  reducedMotion.addEventListener('change', showMotionPreference);

  function setLoading(value) {
    ready = !value;
    options.disabled = value;
    enabled.disabled = value;
    decorations.disabled = value;
    motion.disabled = value;
    renderReplayControl();
  }

  function update(patch) {
    if (!ready) return;
    const changeId = ++latestChange;
    pendingCount += 1;
    render({ ...settings, ...patch });
    setStatus('Saving…');
    saveQueue = saveQueue.catch(() => {}).then(async () => {
      try {
        const saved = await AuraSettings.save(patch);
        lastSaved = saved;
        if (changeId === latestChange) render(saved);
      } catch (error) {
        if (changeId === latestChange) {
          render(lastSaved || AuraSettings.DEFAULTS);
          setStatus('Could not save your changes.', true, () => update(patch));
        }
        console.error('Aura could not save preferences:', error);
      } finally { pendingCount -= 1; }
    });
  }

  options.addEventListener('change', event => {
    if (event.target.name === 'theme') update({ theme: event.target.value, enabled: true });
  });
  enabled.addEventListener('change', () => update({ enabled: enabled.checked }));
  decorations.addEventListener('change', () => update({ decorations: decorations.checked }));
  motion.addEventListener('change', () => update({ motion: motion.checked }));
  document.querySelectorAll('[data-open-guide]').forEach(button => button.addEventListener('click', () => guide.showModal()));
  document.getElementById('close-guide').addEventListener('click', () => guide.close());
  document.getElementById('guide-done').addEventListener('click', () => guide.close());
  if (isExtension) {
    document.getElementById('install-button').classList.add('hidden');
    document.getElementById('linkedin-button').classList.remove('hidden');
    document.getElementById('context-note').textContent = 'Your theme is saved. Open LinkedIn to see it on your feed and profile.';
  }
  let revision = 0;
  const unsubscribe = AuraSettings.subscribe(next => {
    revision++;
    lastSaved = next;
    if (pendingCount === 0) render(next);
  });
  window.addEventListener('pagehide', () => unsubscribe(), { once: true });
  async function loadPreferences() {
    const readRevision = revision;
    setLoading(true);
    setStatus('Loading your preferences…');
    try {
      const next = await AuraSettings.read();
      if (revision === readRevision) { lastSaved = next; render(next); }
    } catch (error) {
      if (revision === readRevision) {
        lastSaved = lastSaved || AuraSettings.DEFAULTS;
        render(lastSaved);
        setStatus('Could not load preferences.', true, loadPreferences);
      }
      console.error('Aura could not load preferences:', error);
    } finally { setLoading(false); }
  }
  loadPreferences();
})();
