(function () {
  'use strict';

  // Mark existing surfaces and headings without adding decorative DOM. The
  // extension manifest controls live-site scope; the studio shares this adapter.
  const cards = [
    '.artdeco-card', '.feed-shared-update-v2', '.feed-identity-module', '.profile-card',
    '.feed-shared-news-module', '.community-panel', '.share-box-feed-entry',
    '.pv-profile-card', '.pv-top-card', '.mn-connection-card', '.discovery-entity-type-card',
    '.job-details-module', '.jobs-unified-top-card', '.jobs-search-results-list',
    '.nt-card', '.search-results__cluster-wrapper', '.msg-overlay-conversation-bubble',
    '[data-aura-modern-surface="card"]', '[data-aura-surface="profile"]', '[data-aura-surface="identity"]'
  ].join(', ');
  // Ad surfaces and the observed sticky profile toolbar receive readable
  // colors from AuraModern, without illustrative layers on their controls.
  const excluded = '#react-root > #ads-container, [data-sdui-screen="com.linkedin.sdui.flagshipnav.profile.Profile"] [role="toolbar"], .aura-detail-layer, .aura-scene-overlay, .aura-world-stage, .aura-world-environment, [data-aura-cover], header, [data-testid="primary-nav"], #global-nav, .global-nav, dialog, [role="dialog"], [role="alertdialog"], [role="tooltip"], [popover], [data-aura-modern-popup], [role="menu"], [role="listbox"], [contenteditable="true"], button, a, input, textarea, select, figure, svg, video, canvas';
  const owned = new Map();
  const pending = new Set();
  let current = null;
  let observer = null;
  let timer = null;

  function kind(node) {
    if (node.matches('[data-aura-surface="profile"], .pv-top-card')) return 'profile';
    if (node.matches('[data-aura-surface="identity"], .feed-identity-module, .profile-card')) return 'identity';
    return 'card';
  }

  function candidate(node) {
    if (!node?.matches?.(cards) || !node.isConnected || node.closest(excluded)) return false;
    const rect = node.getBoundingClientRect();
    return rect.width >= 140 && rect.height >= 86;
  }

  function outerCard(node) {
    if (!candidate(node)) return false;
    for (let parent = node.parentElement?.closest(cards); parent; parent = parent.parentElement?.closest(cards)) {
      if (candidate(parent)) return false;
    }
    return true;
  }

  function restoreAttribute(node, name, value) {
    if (value === null) node.removeAttribute(name);
    else node.setAttribute(name, value);
  }

  function release(node) {
    const record = owned.get(node);
    if (!record) return;
    for (const [inner, original] of record.inner) restoreAttribute(inner, 'data-aura-detail-inner', original);
    if (record.heading) restoreAttribute(record.heading.node, 'data-aura-detail-heading', record.heading.original);
    restoreAttribute(node, 'data-aura-detail', record.original);
    owned.delete(node);
  }

  function updateHeading(node, record) {
    const next = node.querySelector('h2, h3, .text-heading-large, .text-heading-medium');
    if (record.heading?.node === next) return;
    if (record.heading) restoreAttribute(record.heading.node, 'data-aura-detail-heading', record.heading.original);
    record.heading = null;
    if (next && !next.closest('.aura-detail-layer, [data-aura-cover]')) {
      record.heading = { node: next, original: next.getAttribute('data-aura-detail-heading') };
      next.setAttribute('data-aura-detail-heading', '');
    }
  }

  function updateInner(node, record) {
    const bounds = node.getBoundingClientRect();
    const next = new Set([...node.querySelectorAll('[data-aura-modern-surface="card"]')].filter(inner => {
      if (inner.closest(excluded) || inner.hasAttribute('data-aura-modern-control')) return false;
      const rect = inner.getBoundingClientRect();
      return rect.width >= bounds.width * 0.82 && rect.height >= 80;
    }));
    for (const [inner, original] of record.inner) {
      if (!next.has(inner)) { restoreAttribute(inner, 'data-aura-detail-inner', original); record.inner.delete(inner); }
    }
    for (const inner of next) {
      if (!record.inner.has(inner)) record.inner.set(inner, inner.getAttribute('data-aura-detail-inner'));
      inner.setAttribute('data-aura-detail-inner', '');
    }
  }

  function register(node) {
    if (!outerCard(node)) { release(node); return; }
    let record = owned.get(node);
    if (!record) {
      record = { original: node.getAttribute('data-aura-detail'), heading: null, inner: new Map() };
      owned.set(node, record);
    }
    node.setAttribute('data-aura-detail', kind(node));
    updateHeading(node, record);
    updateInner(node, record);
  }

  function scan(scope) {
    if (scope.nodeType === 1) {
      if (scope.closest('.aura-detail-layer, .aura-scene-overlay, .aura-world-stage, .aura-world-environment')) return;
      // A new inner wrapper must refresh its outer reading surface too.
      // Registering only the nearest card misses headings and nested paint.
      for (let parentCard = scope.closest(cards); parentCard; parentCard = parentCard.parentElement?.closest(cards)) {
        register(parentCard);
      }
    }
    scope.querySelectorAll?.(cards).forEach(register);
  }

  function flush() {
    timer = null;
    if (!current?.enabled || !current.decorations) return;
    for (const node of owned.keys()) if (!outerCard(node)) release(node);
    const scopes = [...pending].filter(node => node.isConnected);
    pending.clear();
    // A mounted parent already covers its mounted children.
    for (const scope of scopes) {
      if (!scopes.some(parent => parent !== scope && parent.contains(scope))) scan(scope);
    }
  }

  function queue(node) {
    if (!current?.enabled || !current.decorations) return;
    if (node?.nodeType !== 1 || node.closest('.aura-detail-layer, .aura-scene-overlay, .aura-world-stage, .aura-world-environment')) return;
    pending.add(node);
    if (timer === null) timer = setTimeout(flush, 90);
  }

  function start() {
    if (observer || !document.body) return;
    observer = new MutationObserver(changes => {
      for (const change of changes) {
        if (change.target.closest?.('.aura-detail-layer, .aura-scene-overlay, .aura-world-stage, .aura-world-environment')) continue;
        if (change.type === 'attributes') queue(change.target);
        else {
          for (const added of change.addedNodes) queue(added);
          if ([...change.removedNodes].some(node => node.nodeType === 1 && !node.matches('.aura-detail-layer, .aura-scene-overlay, .aura-world-stage, .aura-world-environment'))) queue(change.target);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-aura-modern-surface', 'data-aura-surface', 'class'] });
    window.addEventListener('resize', onResize, { passive: true });
    scan(document);
  }

  function onResize() { queue(document.body); }

  function stop() {
    observer?.disconnect();
    observer = null;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending.clear();
    window.removeEventListener('resize', onResize);
    for (const node of owned.keys()) release(node);
    current = null;
  }

  globalThis.AuraDetails = Object.freeze({
    apply(settings) {
      const next = settings || {};
      if (next.enabled === false || next.decorations === false) { stop(); return; }
      current = { enabled: true, decorations: true };
      start();
    },
    stop
  });
})();
