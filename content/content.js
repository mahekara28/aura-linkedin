(function () {
  "use strict";

  if (location.protocol !== "https:" || !["www.linkedin.com", "linkedin.com"].includes(location.hostname)) return;
  if (!globalThis.AuraSettings) return;
  // LinkedIn renders some full routes (including Notifications) in its exact
  // /preload frame. That document needs the same background and card treatment
  // as a top-level page. Other embedded/ad frames receive readable components
  // only. WindowProxy identity comparison never reads a cross-origin parent.
  const isTopDocument = typeof globalThis.top === 'undefined' || globalThis.top === globalThis.self;
  const isMainExperience = isTopDocument || (
    location.protocol === 'https:' && location.hostname === 'www.linkedin.com'
    && (location.pathname === '/preload' || location.pathname === '/preload/')
  );
  const undecoratedRoots = '#react-root > #ads-container, [data-sdui-screen="com.linkedin.sdui.flagshipnav.profile.Profile"] [role="toolbar"]';

  // Discover presentation surfaces only. No feed or profile text is read.
  const headerSelector = '#global-nav, .global-nav, [data-testid="primary-nav"]';
  const identitySelector = '.feed-identity-module, .profile-card, [data-view-name="identity-module"]';
  const modernTop = '[id^="com.linkedin.sdui.profile.card"][id$="Topcard"]';
  const profileSelector = '.pv-top-card, .pv-top-card-v2, [data-view-name="profile-top-card"], .artdeco-card:has(.pv-top-card-profile-picture), .artdeco-card:has(.profile-background-image), ' + modernTop + ' > [data-display-contents="true"] > section, ' + modernTop + ' > section';
  const coverSelector = '.profile-background-image, .profile-background-image__image-container, .profile-card-background-image, .feed-identity-module__member-bg-image, [data-view-name="profile-background-image"], ' + modernTop + ' figure:has(img[alt="Cover photo"]), ' + modernTop + ' figure:has([aria-label="Cover photo"])';
  const candidates = [headerSelector, identitySelector, profileSelector, coverSelector].join(', ');
  const owned = new Map();
  const pending = new Set();
  let observer = null;
  let scheduled = null;
  let settings = null;
  let revision = 0;

  function setOwnedAttribute(node, record, name, value) {
    if (!record.original.has(name)) record.original.set(name, node.getAttribute(name));
    node.setAttribute(name, value);
  }

  function isPhotoCover(node) {
    // Check image presence, never image contents or profile information.
    if (node.matches('img, picture') || node.querySelector('img, picture, video')) return true;
    const wrappers = [node, ...node.querySelectorAll(coverSelector + ', .profile-background-image__image, [style*="background"]')];
    return wrappers.some(wrapper => {
      const background = globalThis.getComputedStyle?.(wrapper).backgroundImage || '';
      return /url\(/i.test(background) && !/\/assets\/(?:scene-(?:bloom|shinobi|orbit|marvel)\.svg|(?:pink-satin|cosmic-galaxy|motorsport-track|marvel-alloy)\.webp)/i.test(background);
    });
  }

  function queue(node) {
    pending.add(node);
    if (scheduled === null) scheduled = setTimeout(flushCandidates, 80);
  }

  function outerSurface(node) {
    let host = node.closest?.(candidates);
    if (host?.matches(coverSelector)) {
      let parent;
      while ((parent = host.parentElement?.closest(coverSelector))) host = parent;
    }
    return host;
  }

  function addScene(node, placement, record) {
    if (record.overlay?.parentNode === node) {
      record.overlay.setAttribute('data-aura-placement', placement);
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'aura-scene-overlay';
    overlay.setAttribute('data-aura-placement', placement);
    overlay.setAttribute('aria-hidden', 'true');
    for (const className of ['aura-scene-art']) {
      const detail = document.createElement('span');
      detail.className = className;
      overlay.appendChild(detail);
    }
    record.overlay = overlay;
    node.appendChild(overlay);
  }

  function register(node) {
    if (!node.isConnected || node.closest('.aura-scene-overlay, .aura-detail-layer, .aura-world-stage, .aura-world-environment')) return;
    if (node.closest(undecoratedRoots)) {
      const previous = owned.get(node);
      if (previous) release(node, previous);
      return;
    }
    const isHeader = node.matches(headerSelector);
    const isIdentity = node.matches(identitySelector);
    const isProfile = node.matches(profileSelector);
    const isCover = node.matches(coverSelector);
    const kind = isCover ? 'cover' : isHeader ? 'header' : isIdentity ? 'identity' : isProfile ? 'profile' : null;
    const previous = owned.get(node);
    if (previous && previous.kind !== kind) release(node, previous);
    if (!kind) return;
    // Avoid duplicate scenery in nested wrappers for the same surface.
    if (isCover && node.parentElement?.closest(coverSelector)) return;
    if (isHeader && node.parentElement?.closest(headerSelector)) return;
    let record = owned.get(node);
    if (!record) {
      record = { original: new Map(), overlay: null, coverObserver: null, kind };
      owned.set(node, record);
    }
    if (isCover) {
      setOwnedAttribute(node, record, 'data-aura-cover', '');
      setOwnedAttribute(node, record, 'data-aura-photo-cover', String(isPhotoCover(node)));
      if (!record.coverObserver && globalThis.MutationObserver) {
        // LinkedIn can replace a banner with only a CSS/class/src attribute change.
        // Watch these tiny cover subtrees rather than every attribute in the feed.
        record.coverObserver = new MutationObserver(records => {
          if (records.some(change => !change.target.closest('.aura-scene-overlay, .aura-detail-layer, .aura-world-stage, .aura-world-environment'))) queue(node);
        });
        record.coverObserver.observe(node, { attributes: true, attributeFilter: ['style', 'class', 'src', 'srcset'], subtree: true });
      }
    } else {
      setOwnedAttribute(node, record, 'data-aura-surface', isHeader ? 'header' : isIdentity ? 'identity' : 'profile');
    }
    if (globalThis.getComputedStyle?.(node).position === 'static') {
      setOwnedAttribute(node, record, 'data-aura-static-host', '');
    }
    if (settings.decorations && (isHeader || isIdentity || isCover)) {
      addScene(node, isHeader ? 'header' : isIdentity ? 'identity' : 'profile', record);
    }
  }

  function release(node, record) {
    record.coverObserver?.disconnect();
    record.overlay?.remove();
    for (const [name, original] of record.original) {
      if (original === null) node.removeAttribute(name);
      else node.setAttribute(name, original);
    }
    owned.delete(node);
  }

  function scan(scope) {
    if (!settings?.enabled || !scope) return;
    if (scope.nodeType === 1) register(scope);
    scope.querySelectorAll?.(candidates).forEach(register);
  }

  function flushCandidates() {
    scheduled = null;
    if (!settings?.enabled) return;
    for (const [node, record] of owned) {
      if (!node.isConnected || !node.matches(candidates) || node.closest(undecoratedRoots)) release(node, record);
    }
    for (const node of pending) {
      if (node.isConnected) scan(node);
    }
    pending.clear();
  }

  function stopDiscovery() {
    observer?.disconnect();
    observer = null;
    if (scheduled !== null) clearTimeout(scheduled);
    scheduled = null;
    pending.clear();
  }

  function startDiscovery() {
    if (observer || !document.body || !globalThis.MutationObserver) return;
    // Only added subtrees are scanned in a batch, never the whole feed per mutation.
    observer = new MutationObserver(records => {
      let changed = false;
      for (const record of records) {
        if (record.target.closest?.('.aura-scene-overlay, .aura-detail-layer, .aura-world-stage, .aura-world-environment')) continue;
        if (record.type === 'attributes') {
          if (owned.has(record.target) || record.target.matches(candidates)) {
            pending.add(record.target);
            changed = true;
          }
          continue;
        }
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1 || node.matches('.aura-scene-overlay, .aura-detail-layer, .aura-world-stage, .aura-world-environment')) continue;
          pending.add(node);
          changed = true;
        }
        // A cover photo can arrive after its wrapper; keep it protected.
        const host = outerSurface(record.target);
        const surfaceChanged = [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && !node.matches('.aura-scene-overlay, .aura-detail-layer, .aura-world-stage, .aura-world-environment'));
        if (host && surfaceChanged) {
          pending.add(host);
          changed = true;
        }
        if (record.removedNodes.length) changed = true;
      }
      if (changed && scheduled === null) scheduled = setTimeout(flushCandidates, 80);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'id', 'data-testid', 'data-view-name'] });
  }

  function updateVisibility() {
    const root = document.documentElement;
    if (root && settings?.enabled) root.setAttribute('data-aura-visible', document.visibilityState === 'hidden' ? 'false' : 'true');
  }

  function apply(next) {
    settings = AuraSettings.normalize(next);
    const root = document.documentElement;
    if (!root) return;
    if (settings.enabled) {
      root.setAttribute('data-aura-build', '8.3.0');
      root.setAttribute("data-aura-theme", settings.theme);
      root.setAttribute("data-aura-decorations", settings.decorations && isMainExperience ? "on" : "off");
      root.setAttribute('data-aura-motion', settings.motion ? 'on' : 'off');
      updateVisibility();
      if (!settings.decorations) {
        for (const record of owned.values()) {
          record.overlay?.remove();
          record.overlay = null;
        }
      }
      if (isMainExperience) {
        scan(document);
        startDiscovery();
      } else {
        stopDiscovery();
        for (const [node, record] of owned) release(node, record);
      }
      globalThis.AuraModern?.apply(settings);
      if (isMainExperience) globalThis.AuraDetails?.apply(settings);
      else globalThis.AuraDetails?.stop();
      globalThis.AuraShadow?.apply(settings);
      if (isMainExperience) globalThis.AuraWorld?.apply(settings);
      else globalThis.AuraWorld?.stop();
    } else {
      globalThis.AuraWorld?.stop();
      globalThis.AuraDetails?.stop();
      globalThis.AuraModern?.stop();
      globalThis.AuraShadow?.stop();
      stopDiscovery();
      for (const [node, record] of owned) release(node, record);
      for (const attribute of ['data-aura-build', 'data-aura-theme', 'data-aura-decorations', 'data-aura-motion', 'data-aura-visible']) root.removeAttribute(attribute);
    }
  }

  AuraSettings.subscribe((next) => {
    revision += 1;
    apply(next);
  });

  const initialRevision = revision;
  AuraSettings.read().then((initial) => {
    // A newer storage event wins if the first asynchronous read arrives late.
    if (revision === initialRevision) apply(initial);
  }).catch(() => {
    // Storage errors leave the original LinkedIn appearance intact.
  });

  document.addEventListener('visibilitychange', updateVisibility);
  if (!document.body || !document.documentElement) {
    document.addEventListener("DOMContentLoaded", () => {
      if (settings) apply(settings);
    }, { once: true });
  }
})();
