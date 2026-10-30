(function () {
  'use strict';

  // Photography stays still. Two inert, photo-derived light exposures animate
  // briefly on entry/navigation, then release their compositor resources.
  const themes = new Set(['bloom', 'orbit', 'shinobi', 'marvel']);
  const recipes = {
    bloom: { duration: 3400, light: [0, .58, 0], flare: [0, .3, 0], from: 'translate3d(-18px, 5px, 0)', to: 'translate3d(20px, -4px, 0)' },
    orbit: { duration: 4400, light: [0, .42, 0], flare: [0, .68, 0], from: 'translate3d(-7px, 5px, 0) scale(1.015)', to: 'translate3d(7px, -5px, 0) scale(1)' },
    shinobi: { duration: 1900, light: [0, .35, 0], flare: [0, .62, 0], from: 'translate3d(-65%, 0, 0)', to: 'translate3d(65%, 0, 0)' },
    marvel: { duration: 3000, light: [0, .48, 0], flare: [0, .4, 0], from: 'translate3d(-22%, 0, 0) skewX(-12deg)', to: 'translate3d(22%, 0, 0) skewX(-12deg)' }
  };
  const nav = '[data-testid="primary-nav"], #global-nav, .global-nav, [data-aura-surface="header"]';
  let current = null;
  let environment = null;
  let observer = null;
  let observedRoot = null;
  let observedBody = null;
  let light = null;
  let flare = null;
  let listening = false;
  let reduced = null;
  let forced = null;
  let generation = 0;
  let arrivalPending = false;
  let lastAutomatic = -Infinity;
  const playing = new Set();
  const now = () => globalThis.performance?.now?.() ?? Date.now();

  function cancelMotion() {
    generation += 1;
    for (const animation of playing) {
      animation.onfinish = null;
      animation.oncancel = null;
      animation.cancel();
    }
    playing.clear();
    environment?.setAttribute('data-aura-world-phase', 'rest');
  }

  function canPlay() {
    return Boolean(current?.motion && environment?.isConnected && light?.animate && flare?.animate
      && document.visibilityState !== 'hidden' && !reduced?.matches && !forced?.matches);
  }

  function play(interaction = false) {
    if (!canPlay()) { cancelMotion(); return false; }
    cancelMotion();
    const token = generation;
    const recipe = recipes[current.theme];
    const duration = interaction ? Math.min(recipe.duration, 1400) : recipe.duration;
    environment.setAttribute('data-aura-world-phase', 'playing');
    const tracks = [
      [light, [
        { opacity: 0, transform: 'scale(1)' },
        { opacity: recipe.light[1], transform: 'scale(1.006)', offset: .45 },
        { opacity: 0, transform: 'scale(1.012)' }
      ]],
      [flare, [
        { opacity: 0, transform: recipe.from },
        { opacity: recipe.flare[1], offset: .36 },
        { opacity: 0, transform: recipe.to }
      ]]
    ];
    try {
      for (const [node, frames] of tracks) {
        const animation = node.animate(frames, { duration, easing: 'cubic-bezier(.22,.61,.36,1)', iterations: 1, fill: 'none' });
        playing.add(animation);
        const finish = () => {
          if (token !== generation) return;
          playing.delete(animation);
          if (!playing.size) environment?.setAttribute('data-aura-world-phase', 'rest');
        };
        animation.onfinish = finish;
        animation.oncancel = finish;
      }
    } catch (_) {
      // An unavailable/failed animation leaves the fully usable static theme.
      cancelMotion();
      return false;
    }
    return true;
  }

  function motionPreferenceChanged() { if (!canPlay()) cancelMotion(); }
  function visibilityChanged() { if (document.visibilityState === 'hidden') cancelMotion(); }
  function navigationActivated(event) {
    if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const control = event.target?.closest?.('a[href], button, [role="tab"]');
    if (!control || control.closest('dialog, [role="dialog"], [role="menu"], [popover]')) return;
    const isTab = control.getAttribute('role') === 'tab';
    if (!isTab && (!control.closest(nav) || control.hasAttribute('aria-expanded') || control.hasAttribute('aria-haspopup'))) return;
    if (control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true') return;
    if (control.matches('a[target="_blank"], a[download]')) return;
    if (isTab && control.getAttribute('aria-selected') === 'true') return;
    if (now() - lastAutomatic < 9000) return;
    if (play(true)) lastAutomatic = now();
  }

  function startListeners() {
    if (listening) return;
    listening = true;
    reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
    forced = globalThis.matchMedia?.('(forced-colors: active)') || null;
    reduced?.addEventListener('change', motionPreferenceChanged);
    forced?.addEventListener('change', motionPreferenceChanged);
    document.addEventListener('visibilitychange', visibilityChanged);
    document.addEventListener('click', navigationActivated, { capture: true, passive: true });
  }

  function reconcile() {
    if (!current || !observer) return;
    const root = document.documentElement;
    const body = document.body;
    if (root !== observedRoot || body !== observedBody) {
      observer.disconnect();
      observer.observe(document, { childList: true });
      if (root) observer.observe(root, { childList: true });
      if (body) observer.observe(body, { childList: true });
      observedRoot = root;
      observedBody = body;
    }
    if (!body) { cancelMotion(); environment?.remove(); return; }
    if (!environment) {
      environment = document.createElement('div');
      environment.className = 'aura-world-environment';
      environment.setAttribute('aria-hidden', 'true');
      environment.setAttribute('data-aura-world-phase', 'rest');
      light = document.createElement('span');
      light.className = 'aura-world-light';
      flare = document.createElement('span');
      flare.className = 'aura-world-flare';
      environment.append(light, flare);
    }
    if (environment.parentNode !== body) {
      cancelMotion();
      body.append(environment);
    }
    if (environment.getAttribute('data-aura-world') !== current.theme) environment.setAttribute('data-aura-world', current.theme);
    if (arrivalPending) {
      arrivalPending = false;
      if (play()) lastAutomatic = now();
    }
  }

  function start() {
    if (!observer) {
      observer = new MutationObserver(() => {
        if (document.documentElement !== observedRoot || document.body !== observedBody
          || (document.body && environment?.parentNode !== document.body)) reconcile();
      });
      observer.observe(document, { childList: true });
    }
    startListeners();
    reconcile();
  }

  function stop() {
    cancelMotion();
    observer?.disconnect();
    observer = null;
    observedRoot = null;
    observedBody = null;
    if (listening) {
      document.removeEventListener('visibilitychange', visibilityChanged);
      document.removeEventListener('click', navigationActivated, { capture: true });
      reduced?.removeEventListener('change', motionPreferenceChanged);
      forced?.removeEventListener('change', motionPreferenceChanged);
    }
    listening = false;
    reduced = forced = null;
    environment?.remove();
    environment = light = flare = null;
    current = null;
    arrivalPending = false;
    lastAutomatic = -Infinity;
  }

  globalThis.AuraWorld = Object.freeze({
    apply(settings) {
      const next = settings || {};
      if (next.enabled === false || next.decorations === false) { stop(); return; }
      const theme = themes.has(next.theme) ? next.theme : 'bloom';
      const motion = next.motion !== false;
      const changed = !current || current.theme !== theme || (!current.motion && motion);
      if (current?.theme !== theme || !motion) cancelMotion();
      current = { theme, motion };
      if (changed) arrivalPending = true;
      start();
    },
    replay() { return play(); },
    stop
  });
})();
