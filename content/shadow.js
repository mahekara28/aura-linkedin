/* LinkedIn's interop outlet contains the legacy messaging UI in an open shadow
 * root. A document stylesheet cannot cross that boundary. This bridge owns one
 * local stylesheet and four reversible attributes on that specific host only. */
(() => {
  'use strict';
  if (location.protocol !== 'https:' || !['www.linkedin.com', 'linkedin.com'].includes(location.hostname) || globalThis.AuraShadow) return;

  const selector = 'div#interop-outlet[data-testid="interop-shadowdom"]';
  const attributes = ['data-aura-theme', 'data-aura-motion', 'data-aura-decorations', 'data-aura-visible'];
  const themes = new Set(['bloom', 'shinobi', 'orbit', 'marvel']);
  const owned = new Map();
  const waiting = new Map();
  const pending = new Set();
  let settings = null;
  let discovery = null;
  let scheduled = null;
  let listening = false;
  let waitingForDocument = false;

  function mirror(host) {
    if (!settings) return;
    const values = [settings.theme, settings.motion ? 'on' : 'off', settings.decorations ? 'on' : 'off', document.visibilityState === 'hidden' ? 'false' : 'true'];
    attributes.forEach((attribute, index) => {
      if (host.getAttribute(attribute) !== values[index]) host.setAttribute(attribute, values[index]);
    });
  }

  function release(host, record) {
    record.observer?.disconnect();
    record.link.remove();
    for (const [attribute, value] of record.original) {
      if (value === null) host.removeAttribute(attribute);
      else host.setAttribute(attribute, value);
    }
    owned.delete(host);
  }

  function forgetWaiting(host) {
    const record = waiting.get(host);
    if (record?.timer !== null && record?.timer !== undefined) clearTimeout(record.timer);
    waiting.delete(host);
  }

  function queueLateRoot(host) {
    let record = waiting.get(host);
    if (!record) {
      record = { attempts: 0, timer: null };
      waiting.set(host, record);
    }
    // attachShadow does not emit a light-DOM mutation. Retry only this known
    // host three times; later page mutations or apply calls also revisit it.
    const delays = [80, 250, 1000];
    if (record.timer !== null || record.attempts >= delays.length) return;
    record.timer = setTimeout(() => {
      record.timer = null;
      if (!settings || !host.isConnected || !host.matches(selector)) return forgetWaiting(host);
      attach(host);
    }, delays[record.attempts++]);
  }

  function attach(host) {
    if (!settings || !host.isConnected || !host.matches(selector)) return;
    const root = host.shadowRoot;
    if (!root || root.mode !== 'open') {
      queueLateRoot(host);
      return;
    }
    forgetWaiting(host);
    const existing = owned.get(host);
    if (existing?.root === root) {
      mirror(host);
      if (existing.link.parentNode !== root) root.appendChild(existing.link);
      return;
    }
    if (existing) release(host, existing);

    let url;
    try { url = chrome?.runtime?.getURL('content/shadow.css'); }
    catch { return; } // An invalidated extension context must not disturb LinkedIn.
    if (!url) return;
    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', url);
    link.setAttribute('data-aura-shadow-style', '');
    const record = { root, link, original: new Map(attributes.map(attribute => [attribute, host.getAttribute(attribute)])), observer: null };
    owned.set(host, record);
    mirror(host);
    root.appendChild(link);
    if (globalThis.MutationObserver) {
      // LinkedIn may replace the root's direct contents. Reuse the same link;
      // there is no subtree observation or reclassification of every message.
      record.observer = new MutationObserver(() => {
        if (!settings || !host.isConnected || !host.matches(selector)) return;
        if (link.parentNode !== root) root.appendChild(link);
      });
      record.observer.observe(root, { childList: true });
    }
  }

  function scan(scope) {
    if (scope.nodeType === 1 && scope.matches(selector)) attach(scope);
    scope.querySelectorAll?.(selector).forEach(attach);
  }

  function flush() {
    if (scheduled !== null) clearTimeout(scheduled);
    scheduled = null;
    if (!settings) return;
    for (const [host, record] of owned) {
      if (!host.isConnected || !host.matches(selector) || host.shadowRoot !== record.root) release(host, record);
    }
    for (const host of waiting.keys()) {
      if (!host.isConnected || !host.matches(selector)) forgetWaiting(host);
      else attach(host);
    }
    for (const scope of pending) if (scope.isConnected) scan(scope);
    pending.clear();
  }

  function ready() {
    waitingForDocument = false;
    if (!settings) return;
    scan(document);
    startDiscovery();
  }

  function startDiscovery() {
    if (!document.body) {
      if (!waitingForDocument) {
        waitingForDocument = true;
        document.addEventListener('DOMContentLoaded', ready, { once: true });
      }
      return;
    }
    if (discovery || !globalThis.MutationObserver) return;
    discovery = new MutationObserver(records => {
      let changed = false;
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          pending.add(node);
          changed = true;
        }
        if (record.removedNodes.length) changed = true;
      }
      if (changed && scheduled === null) scheduled = setTimeout(flush, 80);
    });
    discovery.observe(document.body, { childList: true, subtree: true });
  }

  function visibility() {
    if (settings) for (const host of owned.keys()) mirror(host);
  }

  function stop() {
    settings = null;
    discovery?.disconnect();
    discovery = null;
    if (scheduled !== null) clearTimeout(scheduled);
    scheduled = null;
    pending.clear();
    for (const host of waiting.keys()) forgetWaiting(host);
    for (const [host, record] of owned) release(host, record);
    if (listening) document.removeEventListener('visibilitychange', visibility);
    if (waitingForDocument) document.removeEventListener('DOMContentLoaded', ready);
    listening = false;
    waitingForDocument = false;
  }

  function apply(next) {
    if (!next?.enabled) return stop();
    settings = {
      theme: themes.has(next.theme) ? next.theme : 'bloom',
      motion: next.motion !== false,
      decorations: next.decorations !== false
    };
    flush();
    scan(document);
    startDiscovery();
    for (const host of owned.keys()) mirror(host);
    if (!listening) {
      document.addEventListener('visibilitychange', visibility);
      listening = true;
    }
  }

  globalThis.AuraShadow = Object.freeze({ apply, stop });
})();
